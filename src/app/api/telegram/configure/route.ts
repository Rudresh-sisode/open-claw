import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      botToken,
      botUsername,
      dmPolicy,
      allowFrom,
      groupPolicy,
      groupAllowFrom,
      streaming,
      linkPreview,
      replyToMode,
      enabled,
    } = body

    if (!botToken) {
      return NextResponse.json({ error: 'Bot token is required' }, { status: 400 })
    }

    if (dmPolicy === 'allowlist' && (!allowFrom || allowFrom.length === 0)) {
      return NextResponse.json(
        { error: 'Allowlist policy requires at least one user ID' },
        { status: 400 }
      )
    }

    // Upsert telegram config
    const { error } = await supabase
      .from('telegram_configs')
      .upsert(
        {
          user_id: user.id,
          bot_token: botToken,
          bot_username: botUsername ?? null,
          dm_policy: dmPolicy ?? 'pairing',
          allow_from: allowFrom ?? [],
          group_policy: groupPolicy ?? 'allowlist',
          group_allow_from: groupAllowFrom ?? [],
          streaming: streaming ?? 'partial',
          link_preview: linkPreview ?? true,
          reply_to_mode: replyToMode ?? 'off',
          enabled: enabled ?? true,
          configured_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) throw error

    // Log this action
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'configure_telegram',
      status: 'success',
      message: `Telegram bot @${botUsername} configured with ${dmPolicy} DM policy`,
    })

    // If user has a running sandbox, sync the config to OpenClaw
    const { data: sandbox } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'running')
      .single()

    if (sandbox?.sandbox_id) {
      await syncConfigToSandbox(sandbox.sandbox_id, sandbox.port, {
        botToken,
        dmPolicy,
        allowFrom,
        groupPolicy,
        streaming,
        linkPreview,
        replyToMode,
        enabled,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Configure telegram error:', error)
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('telegram_configs')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return NextResponse.json({ config: data ?? null })
  } catch (error) {
    console.error('Get telegram config error:', error)
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 })
  }
}

async function syncConfigToSandbox(
  sandboxId: string,
  port: number,
  config: Record<string, unknown>
) {
  try {
    // In production, this would call the OpenClaw REST API on the sandbox
    // to update the gateway configuration in real-time
    const sandboxUrl = `https://${sandboxId}.sandbox.vercel.app:${port}`
    await fetch(`${sandboxUrl}/api/config/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Non-fatal: config is saved in DB and will be picked up on next restart
  }
}
