import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has a sandbox
    const { data: existing } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'eq', 'stopped')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You already have an active sandbox' }, { status: 409 })
    }

    // Create sandbox record in DB (status: creating)
    const { data: sandbox, error: dbError } = await supabase
      .from('sandboxes')
      .insert({
        user_id: user.id,
        status: 'creating',
        port: 18789,
        snapshot_id: process.env.OPENCLAW_SNAPSHOT_ID ?? null,
      })
      .select()
      .single()

    if (dbError) throw dbError

    // Kick off Vercel sandbox creation asynchronously
    createVercelSandbox(user.id, sandbox.id).catch(console.error)

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'create',
      status: 'pending',
      message: 'Sandbox creation started',
      metadata: { sandbox_db_id: sandbox.id },
    })

    return NextResponse.json({ sandbox })
  } catch (error) {
    console.error('Create sandbox error:', error)
    return NextResponse.json({ error: 'Failed to create sandbox' }, { status: 500 })
  }
}

async function createVercelSandbox(userId: string, sandboxDbId: string) {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = await createAdminClient()

  try {
    const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000)

    // Call Vercel Sandbox API
    const vercelRes = await fetch('https://api.vercel.com/v1/sandboxes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snapshotId: process.env.OPENCLAW_SNAPSHOT_ID,
        timeout: 18000, // 5 hours in seconds
        ports: [{ port: 18789, protocol: 'http' }],
        ...(process.env.VERCEL_TEAM_ID && { teamId: process.env.VERCEL_TEAM_ID }),
      }),
    })

    if (!vercelRes.ok) {
      const errData = await vercelRes.json().catch(() => ({}))
      throw new Error(errData.error?.message || `Vercel API error: ${vercelRes.status}`)
    }

    const { id: sandboxId } = await vercelRes.json()

    await adminSupabase
      .from('sandboxes')
      .update({
        sandbox_id: sandboxId,
        status: 'running',
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', sandboxDbId)

    await adminSupabase.from('activity_logs').insert({
      user_id: userId,
      sandbox_id: sandboxId,
      action: 'create',
      status: 'success',
      message: `Sandbox ${sandboxId} created successfully`,
    })
  } catch (error) {
    await adminSupabase
      .from('sandboxes')
      .update({ status: 'error' })
      .eq('id', sandboxDbId)

    await adminSupabase.from('activity_logs').insert({
      user_id: userId,
      action: 'create',
      status: 'failed',
      message: `Failed to create sandbox: ${(error as Error).message}`,
    })
  }
}
