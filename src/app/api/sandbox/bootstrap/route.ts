import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { writeConfigAndStart } from '@/lib/vercel-sandbox'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = await createAdminClient()

    const { data: sandbox } = await adminSupabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!sandbox?.sandbox_id) {
      return NextResponse.json(
        { error: 'No running sandbox found. Create or restart one first.' },
        { status: 404 }
      )
    }

    const [llmRes, telegramRes] = await Promise.all([
      adminSupabase
        .from('llm_configs')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      adminSupabase
        .from('telegram_configs')
        .select('*')
        .eq('user_id', user.id)
        .single(),
    ])

    if (!llmRes.data) {
      return NextResponse.json(
        { error: 'Configure your AI provider first.' },
        { status: 400 }
      )
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

    const result = await writeConfigAndStart(sandbox.sandbox_id, {
      provider: llmRes.data.provider,
      apiKey: llmRes.data.api_key,
      model: llmRes.data.model,
      telegram: telegramConfig,
    })

    await adminSupabase.from('activity_logs').insert({
      user_id: user.id,
      sandbox_id: sandbox.sandbox_id,
      action: 'bootstrap',
      status: 'success',
      message: `OpenClaw configured and started (cmd: ${result.startCommand})`,
    })

    return NextResponse.json({
      message: 'OpenClaw configured and started successfully',
      ...result,
    })
  } catch (error) {
    console.error('[bootstrap] Error:', error)
    return NextResponse.json(
      { error: `Bootstrap failed: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
