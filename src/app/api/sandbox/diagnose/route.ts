import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeCommand } from '@/lib/vercel-sandbox'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Login first' }, { status: 401 })
  }

  const { data: sandbox } = await supabase
    .from('sandboxes')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'running')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sandbox?.sandbox_id) {
    return NextResponse.json({ error: 'No running sandbox' }, { status: 404 })
  }

  const results: Record<string, unknown> = { sandboxId: sandbox.sandbox_id }
  const homeDir = '/home/vercel-sandbox'

  // 1. Read the openclaw log (last 100 lines)
  try {
    const logRes = await executeCommand(sandbox.sandbox_id, 'sh', [
      '-c', `tail -100 ${homeDir}/.openclaw/openclaw.log 2>&1`
    ])
    results.logCmd = logRes
  } catch (e) {
    results.logCmd = { error: (e as Error).message }
  }

  // 2. Check running processes
  try {
    const psRes = await executeCommand(sandbox.sandbox_id, 'sh', [
      '-c', 'ps aux 2>&1'
    ])
    results.psCmd = psRes
  } catch (e) {
    results.psCmd = { error: (e as Error).message }
  }

  // 3. Read the config
  try {
    const cfgRes = await executeCommand(sandbox.sandbox_id, 'cat', [
      `${homeDir}/.openclaw/config.json5`
    ])
    results.configCmd = cfgRes
  } catch (e) {
    results.configCmd = { error: (e as Error).message }
  }

  // Wait a moment then fetch logs for each command
  await new Promise(r => setTimeout(r, 3000))

  const cmdResults: Record<string, unknown> = {}
  const token = process.env.VERCEL_API_TOKEN
  const teamSlug = process.env.VERCEL_TEAM_ID

  for (const [key, val] of Object.entries(results)) {
    const cmdId = (val as { command?: { id?: string } })?.command?.id
    if (!cmdId) continue
    try {
      const logUrl = new URL(`https://api.vercel.com/v1/sandboxes/${sandbox.sandbox_id}/cmd/${cmdId}/logs`)
      if (teamSlug) logUrl.searchParams.set('slug', teamSlug)
      const logRes = await fetch(logUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      cmdResults[key] = await logRes.text()
    } catch {
      cmdResults[key] = 'Could not fetch logs'
    }
  }

  results.outputs = cmdResults
  return NextResponse.json(results, { status: 200 })
}
