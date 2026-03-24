import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// This endpoint is called by Vercel Cron every 4 hours
// It extends all sandboxes that will expire within 1 hour
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const extended: string[] = []
  const failed: string[] = []

  try {
    // Find all running sandboxes expiring in < 1 hour
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const { data: sandboxes, error } = await adminSupabase
      .from('sandboxes')
      .select('*')
      .eq('status', 'running')
      .not('sandbox_id', 'is', null)
      .lt('expires_at', oneHourFromNow)

    if (error) throw error

    console.log(`[cron/extend] Found ${sandboxes?.length ?? 0} sandboxes to extend`)

    for (const sandbox of sandboxes ?? []) {
      try {
        // Call Vercel API to extend timeout
        const vercelRes = await fetch(
          `https://api.vercel.com/v1/sandboxes/${sandbox.sandbox_id}/timeout`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeout: 18000, // 5 more hours
              ...(process.env.VERCEL_TEAM_ID && { teamId: process.env.VERCEL_TEAM_ID }),
            }),
          }
        )

        if (!vercelRes.ok) throw new Error(`Vercel API error: ${vercelRes.status}`)

        const newExpiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()

        await adminSupabase
          .from('sandboxes')
          .update({ expires_at: newExpiresAt })
          .eq('id', sandbox.id)

        await adminSupabase.from('activity_logs').insert({
          user_id: sandbox.user_id,
          sandbox_id: sandbox.sandbox_id,
          action: 'extend_timeout',
          status: 'success',
          message: `Timeout extended by 5 hours`,
          metadata: { new_expires_at: newExpiresAt },
        })

        extended.push(sandbox.sandbox_id!)
      } catch (err) {
        failed.push(sandbox.sandbox_id ?? sandbox.id)
        await adminSupabase.from('activity_logs').insert({
          user_id: sandbox.user_id,
          sandbox_id: sandbox.sandbox_id,
          action: 'extend_timeout',
          status: 'failed',
          message: `Extension failed: ${(err as Error).message}`,
        })
      }
    }

    return NextResponse.json({
      extended: extended.length,
      failed: failed.length,
      sandboxes: { extended, failed },
    })
  } catch (error) {
    console.error('[cron/extend] Fatal error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
