import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { provider, apiKey, model } = await req.json()

    if (!provider || !apiKey || !model) {
      return NextResponse.json(
        { error: 'provider, apiKey, and model are required' },
        { status: 400 }
      )
    }

    const validProviders = ['openai', 'anthropic', 'google', 'groq', 'openrouter']
    if (!validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Save to database
    const { error } = await supabase
      .from('llm_configs')
      .upsert(
        {
          user_id: user.id,
          provider,
          api_key: apiKey,
          model,
          configured_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) throw error

    // Log the action (don't log the key itself)
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'configure_llm',
      status: 'success',
      message: `AI provider set to ${provider} · ${model}`,
    })

    // If user has a running sandbox, push the config to it
    const { data: sandbox } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'running')
      .single()

    if (sandbox?.sandbox_id) {
      await syncLLMConfigToSandbox(sandbox.sandbox_id, sandbox.port, {
        provider,
        apiKey,
        model,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Configure LLM error:', error)
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
      .from('llm_configs')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error

    // Mask the API key before returning to client
    if (data) {
      data.api_key = data.api_key.slice(0, 6) + '••••••••' + data.api_key.slice(-4)
    }

    return NextResponse.json({ config: data ?? null })
  } catch (error) {
    console.error('Get LLM config error:', error)
    return NextResponse.json({ error: 'Failed to get configuration' }, { status: 500 })
  }
}

async function syncLLMConfigToSandbox(
  sandboxId: string,
  port: number,
  config: { provider: string; apiKey: string; model: string }
) {
  try {
    // Build the openclaw config patch for the sandbox
    // OpenClaw uses a JSON5 config — we write the agents.defaults section
    const sandboxUrl = `https://${sandboxId}.sandbox.vercel.app:${port}`
    await fetch(`${sandboxUrl}/api/config/llm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Non-fatal — config is saved in DB and will be picked up on next sandbox start
  }
}
