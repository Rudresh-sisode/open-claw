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

    const { data: existing } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'eq', 'stopped')
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You already have an active sandbox' }, { status: 409 })
    }

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

    const vercelUrl = new URL('https://api.vercel.com/v1/sandboxes')
    if (process.env.VERCEL_TEAM_ID) {
      vercelUrl.searchParams.set('slug', process.env.VERCEL_TEAM_ID)
    }

    const snapshotId = process.env.OPENCLAW_SNAPSHOT_ID
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

    console.log('[sandbox/create] POST', vercelUrl.toString(), JSON.stringify(requestBody))

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
    const sandboxId: string = responseData?.sandbox?.id ?? responseData?.id
    if (!sandboxId) throw new Error(`No sandbox ID in response: ${JSON.stringify(responseData)}`)

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

    // Wait for sandbox to fully boot, then configure and start OpenClaw
    await bootstrapOpenClaw(adminSupabase, userId, sandboxId)
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
