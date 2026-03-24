export type SandboxStatus = 'creating' | 'running' | 'stopped' | 'error' | 'restarting'

export type DmPolicy = 'pairing' | 'allowlist' | 'open' | 'disabled'
export type GroupPolicy = 'open' | 'allowlist' | 'disabled'
export type StreamingMode = 'off' | 'partial' | 'block' | 'progress'

export interface Sandbox {
  id: string
  user_id: string
  sandbox_id: string | null
  status: SandboxStatus
  expires_at: string | null
  snapshot_id: string | null
  port: number
  created_at: string
  updated_at: string
}

export interface TelegramGroup {
  id: string
  group_policy: GroupPolicy
  require_mention: boolean
  allow_from: string[]
  enabled: boolean
  system_prompt?: string
}

export interface TelegramConfig {
  id: string
  user_id: string
  bot_token: string
  bot_username: string | null
  dm_policy: DmPolicy
  allow_from: string[]
  group_policy: GroupPolicy
  group_allow_from: string[]
  groups: Record<string, TelegramGroup>
  streaming: StreamingMode
  link_preview: boolean
  reply_to_mode: 'off' | 'first' | 'all'
  enabled: boolean
  configured_at: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  sandbox_id: string | null
  action: string
  status: 'success' | 'failed' | 'pending'
  message: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'openrouter'

export interface LLMConfig {
  id: string
  user_id: string
  provider: LLMProvider
  api_key: string
  model: string
  configured_at: string | null
  created_at: string
  updated_at: string
}

export interface SetupWizardStep {
  id: number
  title: string
  description: string
  completed: boolean
}
