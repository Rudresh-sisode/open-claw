const VERCEL_API = 'https://api.vercel.com/v1'

function headers() {
  return {
    Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function teamQuery() {
  const params = new URLSearchParams()
  if (process.env.VERCEL_TEAM_ID) params.set('slug', process.env.VERCEL_TEAM_ID)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function executeCommand(
  sandboxId: string,
  command: string,
  args: string[] = [],
  options: { env?: Record<string, string>; cwd?: string; wait?: boolean } = {}
) {
  const url = `${VERCEL_API}/sandboxes/${sandboxId}/cmd${teamQuery()}`
  const body: Record<string, unknown> = { command, args }
  if (options.env) body.env = options.env
  if (options.cwd) body.cwd = options.cwd
  if (options.wait) body.wait = true

  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Sandbox cmd failed (${res.status}): ${JSON.stringify(err)}`)
  }

  return res.json()
}

async function runAndWaitForOutput(
  sandboxId: string,
  command: string,
  args: string[],
  env: Record<string, string>
): Promise<string> {
  const result = await executeCommand(sandboxId, command, args, { env })
  const cmdId = result?.command?.id
  if (!cmdId) return ''

  await new Promise(r => setTimeout(r, 2000))

  const token = process.env.VERCEL_API_TOKEN
  const teamSlug = process.env.VERCEL_TEAM_ID
  const logUrl = new URL(`https://api.vercel.com/v1/sandboxes/${sandboxId}/cmd/${cmdId}/logs`)
  if (teamSlug) logUrl.searchParams.set('slug', teamSlug)

  try {
    const logRes = await fetch(logUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    const text = await logRes.text()
    return text
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line).data ?? '' } catch { return line } })
      .join('')
  } catch {
    return ''
  }
}

export async function writeConfigAndStart(
  sandboxId: string,
  config: {
    provider: string
    apiKey: string
    model: string
    telegram?: {
      botToken: string
      dmPolicy?: string
      groupPolicy?: string
      streaming?: string
      linkPreview?: boolean
      allowFrom?: string[]
    }
  }
) {
  const envKeyMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_API_KEY',
    groq: 'GROQ_API_KEY',
    openrouter: 'OPENROUTER_API_KEY',
  }

  const homeDir = '/home/vercel-sandbox'
  const envKey = envKeyMap[config.provider] ?? 'API_KEY'

  const env: Record<string, string> = {
    HOME: homeDir,
    [envKey]: config.apiKey,
  }
  if (config.telegram?.botToken) {
    env.TELEGRAM_BOT_TOKEN = config.telegram.botToken
  }

  // Step 1: Set bot token and model via env vars and config set
  console.log(`[bootstrap] Configuring openclaw on ${sandboxId}`)

  const configSets: [string, string][] = [
    ['agents.defaults.model', config.model],
    ['agents.defaults.provider', config.provider],
  ]

  if (config.telegram?.botToken) {
    configSets.push(['channels.telegram.enabled', 'true'])
    configSets.push(['channels.telegram.botToken', config.telegram.botToken])
  }

  for (const [key, value] of configSets) {
    const out = await runAndWaitForOutput(sandboxId, 'openclaw', ['config', 'set', key, value], env)
    console.log(`[bootstrap] config set ${key}:`, out.slice(0, 100))
  }

  // Step 2: Start the gateway — pairing mode (default), stays alive as a managed process
  console.log(`[bootstrap] Starting openclaw gateway on ${sandboxId}`)
  const startRes = await executeCommand(
    sandboxId,
    'openclaw',
    ['gateway', '--auth', 'none', '--allow-unconfigured'],
    { env }
  )
  console.log(`[bootstrap] Gateway started:`, startRes?.command?.id)

  return { configWritten: true, startCommand: startRes?.command?.id }
}

export async function approvePairing(
  sandboxId: string,
  code: string
): Promise<string> {
  const homeDir = '/home/vercel-sandbox'
  return runAndWaitForOutput(
    sandboxId,
    'openclaw',
    ['pairing', 'approve', 'telegram', code],
    { HOME: homeDir }
  )
}

export async function listPendingPairings(sandboxId: string): Promise<string> {
  const homeDir = '/home/vercel-sandbox'
  return runAndWaitForOutput(
    sandboxId,
    'openclaw',
    ['pairing', 'list', 'telegram'],
    { HOME: homeDir }
  )
}

export async function getSandboxStatus(sandboxId: string) {
  const url = `${VERCEL_API}/sandboxes/${sandboxId}${teamQuery()}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) return null
  return res.json()
}
