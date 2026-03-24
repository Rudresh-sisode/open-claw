import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { writeConfigAndStart } from '@/lib/vercel-sandbox'

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
        const snapshotId = process.env.OPENCLAW_SNAPSHOT_ID || sandbox.snapshot_id
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

        // Vercel Sandbox API — slug as query param, source/ports/timeout in body
        const vercelUrl = new URL('https://api.vercel.com/v1/sandboxes')
        if (process.env.VERCEL_TEAM_ID) {
          vercelUrl.searchParams.set('slug', process.env.VERCEL_TEAM_ID)
        }

        const hasSnapshot = snapshotId && snapshotId !== 'placeholder'
        const requestBody: Record<string, unknown> = {
          timeout: 5 * 60 * 60 * 1000,
          ports: [18789],
          runtime: 'node22',
        }
        if (process.env.VERCEL_PROJECT_ID) {
          requestBody.projectId = process.env.VERCEL_PROJECT_ID
        }
        if (hasSnapshot) {
          requestBody.source = { type: 'snapshot', snapshotId }
        }

        const vercelRes = await fetch(vercelUrl.toString(), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!vercelRes.ok) {
          const errData = await vercelRes.json().catch(() => ({}))
          const msg = errData?.error?.message ?? errData?.message ?? JSON.stringify(errData)
          throw new Error(`Vercel API error ${vercelRes.status}: ${msg}`)
        }

        const responseData = await vercelRes.json()
        const newSandboxId: string = responseData?.sandbox?.id ?? responseData?.id
        if (!newSandboxId) throw new Error(`No sandbox ID in response: ${JSON.stringify(responseData)}`)
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

        // Bootstrap OpenClaw inside the new sandbox
        try {
          await new Promise((r) => setTimeout(r, 5000))
          const [llmRes, telegramRes] = await Promise.all([
            adminSupabase.from('llm_configs').select('*').eq('user_id', sandbox.user_id).single(),
            adminSupabase.from('telegram_configs').select('*').eq('user_id', sandbox.user_id).single(),
          ])
          if (llmRes.data) {
            const tg = telegramRes.data?.enabled ? {
              botToken: telegramRes.data.bot_token,
              dmPolicy: telegramRes.data.dm_policy,
              groupPolicy: telegramRes.data.group_policy,
              streaming: telegramRes.data.streaming,
              linkPreview: telegramRes.data.link_preview,
              allowFrom: telegramRes.data.allow_from,
            } : undefined
            await writeConfigAndStart(newSandboxId, {
              provider: llmRes.data.provider,
              apiKey: llmRes.data.api_key,
              model: llmRes.data.model,
              telegram: tg,
            })
          }
        } catch (bootstrapErr) {
          console.error('[cron/health-check] Bootstrap failed:', bootstrapErr)
        }

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
