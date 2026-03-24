import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeConfigAndStart } from '@/lib/vercel-sandbox'

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

    const snapshotId = process.env.OPENCLAW_SNAPSHOT_ID || sandbox.snapshot_id
    if (!snapshotId || snapshotId === 'placeholder') {
      return NextResponse.json({ error: 'No snapshot available for restart' }, { status: 400 })
    }
    console.log('[sandbox/restart] Using snapshot:', snapshotId)

    await supabase
      .from('sandboxes')
      .update({ status: 'restarting' })
      .eq('id', sandbox.id)

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

    console.log('[sandbox/restart] POST', vercelUrl.toString(), JSON.stringify(requestBody))

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

    // Wait for sandbox to boot, then configure and start OpenClaw
    await bootstrapOpenClaw(adminSupabase, userId, newSandboxId)
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

async function bootstrapOpenClaw(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  userId: string,
  sandboxId: string
) {
  try {
    await new Promise((r) => setTimeout(r, 5000))

    const [llmRes, telegramRes] = await Promise.all([
      adminSupabase.from('llm_configs').select('*').eq('user_id', userId).single(),
      adminSupabase.from('telegram_configs').select('*').eq('user_id', userId).single(),
    ])

    if (!llmRes.data) {
      console.log('[bootstrap] No LLM config found, skipping OpenClaw start')
      return
    }

    const telegramConfig = telegramRes.data?.enabled
      ? {
          botToken: telegramRes.data.bot_token,
          dmPolicy: telegramRes.data.dm_policy,
          groupPolicy: telegramRes.data.group_policy,
          streaming: telegramRes.data.streaming,
          linkPreview: telegramRes.data.link_preview,
          allowFrom: telegramRes.data.allow_from,
        }
      : undefined

    await writeConfigAndStart(sandboxId, {
      provider: llmRes.data.provider,
      apiKey: llmRes.data.api_key,
      model: llmRes.data.model,
      telegram: telegramConfig,
    })

    await adminSupabase.from('activity_logs').insert({
      user_id: userId,
      sandbox_id: sandboxId,
      action: 'bootstrap',
      status: 'success',
      message: 'OpenClaw configured and started inside sandbox',
    })
  } catch (error) {
    console.error('[bootstrap] Non-fatal error:', error)
    await adminSupabase.from('activity_logs').insert({
      user_id: userId,
      sandbox_id: sandboxId,
      action: 'bootstrap',
      status: 'failed',
      message: `Bootstrap failed: ${(error as Error).message}`,
    })
  }
}
