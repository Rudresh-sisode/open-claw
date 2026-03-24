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

  const dmPolicy = config.telegram?.dmPolicy ?? 'open'
  const groupPolicy = config.telegram?.groupPolicy ?? 'open'

  let allowFrom = config.telegram?.allowFrom ?? []
  if (dmPolicy === 'open' && !allowFrom.includes('*')) {
    allowFrom = ['*']
  }

  const configObj: Record<string, unknown> = {
    gateway: {
      mode: 'local',
    },
    agents: {
      defaults: {
        model: config.model,
        provider: config.provider,
      },
    },
  }

  if (config.telegram?.botToken) {
    configObj.channels = {
      telegram: {
        enabled: true,
        botToken: config.telegram.botToken,
        dmPolicy,
        allowFrom,
        groupPolicy,
        groupAllowFrom: groupPolicy === 'open' ? ['*'] : undefined,
        groups: { '*': { requireMention: true } },
        streaming: config.telegram.streaming ?? 'partial',
        linkPreview: config.telegram.linkPreview ?? false,
      },
    }
  }

  const configJson = JSON.stringify(configObj, null, 2)
  const envKey = envKeyMap[config.provider] ?? 'API_KEY'
  const homeDir = '/home/vercel-sandbox'
  const configDir = `${homeDir}/.openclaw`

  // Build env vars for all commands — set OPENCLAW_CONFIG_PATH
  // explicitly so OpenClaw finds the config regardless of HOME resolution
  const env: Record<string, string> = {
    HOME: homeDir,
    OPENCLAW_CONFIG_PATH: `${configDir}/config.json5`,
    OPENCLAW_STATE_DIR: configDir,
    [envKey]: config.apiKey,
  }
  if (config.telegram?.botToken) {
    env.TELEGRAM_BOT_TOKEN = config.telegram.botToken
  }

  // 1. Create config directory
  await executeCommand(sandboxId, 'mkdir', ['-p', configDir], { env })
  console.log(`[bootstrap] Created ${configDir} on ${sandboxId}`)

  // 2. Write config file
  await executeCommand(sandboxId, 'sh', [
    '-c',
    `cat > ${configDir}/config.json5 << 'OPENCLAW_CFG_EOF'\n${configJson}\nOPENCLAW_CFG_EOF`,
  ], { env })
  console.log(`[bootstrap] Wrote config.json5 on ${sandboxId}`)

  // 3. Validate config location
  const fileCheck = await executeCommand(sandboxId, 'openclaw', ['config', 'file'], { env })
  console.log(`[bootstrap] Config file location:`, fileCheck?.command?.id)

  // 4. Start OpenClaw gateway DIRECTLY (no nohup/&)
  // The Vercel execute API already runs commands asynchronously,
  // so the gateway process stays alive as a managed command.
  const startRes = await executeCommand(
    sandboxId,
    'openclaw',
    ['gateway', '--auth', 'none'],
    { env }
  )
  console.log(`[bootstrap] Started openclaw gateway on ${sandboxId}:`, startRes?.command?.id)

  return { configWritten: true, startCommand: startRes?.command?.id }
}

export async function getSandboxStatus(sandboxId: string) {
  const url = `${VERCEL_API}/sandboxes/${sandboxId}${teamQuery()}`
  const res = await fetch(url, { headers: headers() })
  if (!res.ok) return null
  return res.json()
}
