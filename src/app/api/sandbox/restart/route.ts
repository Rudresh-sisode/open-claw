import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: sandbox } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!sandbox) {
      return NextResponse.json({ error: 'No sandbox found' }, { status: 404 })
    }

    const snapshotId = sandbox.snapshot_id ?? process.env.OPENCLAW_SNAPSHOT_ID
    if (!snapshotId) {
      return NextResponse.json({ error: 'No snapshot available for restart' }, { status: 400 })
    }

    // Mark as restarting
    await supabase
      .from('sandboxes')
      .update({ status: 'restarting' })
      .eq('id', sandbox.id)

    // Kick off async restart
    restartFromSnapshot(user.id, sandbox.id, snapshotId).catch(console.error)

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      sandbox_id: sandbox.sandbox_id,
      action: 'restart',
      status: 'pending',
      message: 'Sandbox restart initiated',
    })

    return NextResponse.json({ message: 'Restart initiated' })
  } catch (error) {
    console.error('Restart sandbox error:', error)
    return NextResponse.json({ error: 'Failed to restart sandbox' }, { status: 500 })
  }
}

async function restartFromSnapshot(
  userId: string,
  sandboxDbId: string,
  snapshotId: string
) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000)

    const vercelRes = await fetch('https://api.vercel.com/v1/sandboxes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snapshotId,
        timeout: 18000,
        ports: [{ port: 18789, protocol: 'http' }],
        ...(process.env.VERCEL_TEAM_ID && { teamId: process.env.VERCEL_TEAM_ID }),
      }),
    })

    if (!vercelRes.ok) throw new Error(`Vercel API error: ${vercelRes.status}`)

    const { id: newSandboxId } = await vercelRes.json()

    await adminSupabase
      .from('sandboxes')
      .update({
        sandbox_id: newSandboxId,
        status: 'running',
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', sandboxDbId)

    await adminSupabase.from('activity_logs').insert({
      user_id: userId,
      sandbox_id: newSandboxId,
      action: 'restart',
      status: 'success',
      message: `Sandbox restarted as ${newSandboxId}`,
    })
  } catch (error) {
    await adminSupabase
      .from('sandboxes')
      .update({ status: 'error' })
      .eq('id', sandboxDbId)

    await adminSupabase.from('activity_logs').insert({
      user_id: userId,
      action: 'restart',
      status: 'failed',
      message: `Restart failed: ${(error as Error).message}`,
    })
  }
}
