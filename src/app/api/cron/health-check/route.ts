import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// This endpoint is called by Vercel Cron every minute
// It checks for dead sandboxes and auto-restarts them from snapshot
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const restarted: string[] = []
  const healthy: string[] = []
  const noSnapshot: string[] = []

  try {
    // Find sandboxes that should be running but appear stopped/expired
    const now = new Date().toISOString()

    const { data: sandboxes } = await adminSupabase
      .from('sandboxes')
      .select('*')
      .in('status', ['running', 'stopped'])
      .not('sandbox_id', 'is', null)

    for (const sandbox of sandboxes ?? []) {
      try {
        // Check if sandbox has expired
        const isExpired = sandbox.expires_at && new Date(sandbox.expires_at) < new Date(now)

        // Probe Vercel sandbox status
        let isAlive = false
        try {
          const probe = await fetch(
            `https://api.vercel.com/v1/sandboxes/${sandbox.sandbox_id}`,
            {
              headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
              signal: AbortSignal.timeout(8000),
            }
          )
          if (probe.ok) {
            const data = await probe.json()
            isAlive = data.status === 'running'
          }
        } catch {
          isAlive = false
        }

        if (isAlive && !isExpired) {
          if (sandbox.status !== 'running') {
            await adminSupabase
              .from('sandboxes')
              .update({ status: 'running' })
              .eq('id', sandbox.id)
          }
          healthy.push(sandbox.sandbox_id!)
          continue
        }

        // Sandbox is dead — try to restart from snapshot
        const snapshotId = sandbox.snapshot_id ?? process.env.OPENCLAW_SNAPSHOT_ID
        if (!snapshotId) {
          await adminSupabase
            .from('sandboxes')
            .update({ status: 'stopped' })
            .eq('id', sandbox.id)
          noSnapshot.push(sandbox.sandbox_id ?? sandbox.id)
          continue
        }

        // Mark as restarting
        await adminSupabase
          .from('sandboxes')
          .update({ status: 'restarting' })
          .eq('id', sandbox.id)

        // Create new sandbox from snapshot
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
        const newExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()

        await adminSupabase
          .from('sandboxes')
          .update({
            sandbox_id: newSandboxId,
            status: 'running',
            expires_at: newExpiresAt,
          })
          .eq('id', sandbox.id)

        await adminSupabase.from('activity_logs').insert({
          user_id: sandbox.user_id,
          sandbox_id: newSandboxId,
          action: 'restart',
          status: 'success',
          message: `Auto-restarted from snapshot (was ${sandbox.sandbox_id})`,
          metadata: { previous_sandbox_id: sandbox.sandbox_id },
        })

        restarted.push(newSandboxId)
      } catch (err) {
        await adminSupabase.from('activity_logs').insert({
          user_id: sandbox.user_id,
          sandbox_id: sandbox.sandbox_id,
          action: 'health_check',
          status: 'failed',
          message: `Health check failed: ${(err as Error).message}`,
        })
      }
    }

    return NextResponse.json({
      healthy: healthy.length,
      restarted: restarted.length,
      noSnapshot: noSnapshot.length,
      details: { healthy, restarted, noSnapshot },
    })
  } catch (error) {
    console.error('[cron/health-check] Fatal error:', error)
    return NextResponse.json({ error: 'Health check cron failed' }, { status: 500 })
  }
}
