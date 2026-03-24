import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeCommand } from '@/lib/vercel-sandbox'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const body = await req.json()
  const { command, args, env } = body

  if (!command) {
    return NextResponse.json({ error: 'command is required' }, { status: 400 })
  }

  const homeDir = '/home/vercel-sandbox'
  const result = await executeCommand(
    sandbox.sandbox_id,
    command,
    args ?? [],
    { env: { HOME: homeDir, ...env } }
  )

  // Wait a bit then fetch logs
  await new Promise(r => setTimeout(r, 3000))
  const cmdId = result?.command?.id
  if (cmdId) {
    try {
      const token = process.env.VERCEL_API_TOKEN
      const teamSlug = process.env.VERCEL_TEAM_ID
      const logUrl = new URL(`https://api.vercel.com/v1/sandboxes/${sandbox.sandbox_id}/cmd/${cmdId}/logs`)
      if (teamSlug) logUrl.searchParams.set('slug', teamSlug)
      const logRes = await fetch(logUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      })
      const logText = await logRes.text()
      return NextResponse.json({ command: result, output: logText })
    } catch {
      return NextResponse.json({ command: result, output: 'Could not fetch logs' })
    }
  }

  return NextResponse.json(result)
}
