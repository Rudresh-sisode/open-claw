'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { TelegramConfig, DmPolicy, GroupPolicy, StreamingMode } from '@/types'
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Users,
  Zap,
} from 'lucide-react'

interface SetupWizardProps {
  existing?: TelegramConfig | null
  onComplete: () => void
}

const STEPS = [
  { id: 1, title: 'Create Bot', description: 'Get your bot token from BotFather' },
  { id: 2, title: 'Access Control', description: 'Configure who can use your bot' },
  { id: 3, title: 'Advanced', description: 'Streaming, previews & more' },
  { id: 4, title: 'Review', description: 'Confirm and activate' },
]

export function TelegramSetupWizard({ existing, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1)
  const [showToken, setShowToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(existing ? true : null)
  const [newAllowId, setNewAllowId] = useState('')
  const { toast } = useToast()

  const [config, setConfig] = useState({
    botToken: existing?.bot_token ?? '',
    botUsername: existing?.bot_username ?? '',
    dmPolicy: (existing?.dm_policy ?? 'pairing') as DmPolicy,
    allowFrom: existing?.allow_from ?? [] as string[],
    groupPolicy: existing?.group_policy ?? 'allowlist',
    streaming: existing?.streaming ?? 'partial',
    linkPreview: existing?.link_preview ?? true,
    replyToMode: existing?.reply_to_mode ?? 'off',
    enabled: existing?.enabled ?? true,
  })

  async function validateToken() {
    if (!config.botToken.trim()) {
      toast({ title: 'Token required', description: 'Please enter your bot token.', variant: 'destructive' })
      return
    }
    setIsValidating(true)
    try {
      const res = await fetch('/api/telegram/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: config.botToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid token')
      setTokenValid(true)
      setConfig((prev) => ({ ...prev, botUsername: data.username ?? '' }))
      toast({ title: 'Token valid!', description: `Connected as @${data.username}`, variant: 'success' })
    } catch (err) {
      setTokenValid(false)
      toast({ title: 'Invalid token', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsValidating(false)
    }
  }

  function addAllowId() {
    const id = newAllowId.trim().replace(/^(telegram:|tg:)/, '')
    if (!id) return
    if (config.allowFrom.includes(id)) {
      toast({ title: 'Already added', description: 'This ID is already in the list.' })
      return
    }
    setConfig((prev) => ({ ...prev, allowFrom: [...prev.allowFrom, id] }))
    setNewAllowId('')
  }

  function removeAllowId(id: string) {
    setConfig((prev) => ({ ...prev, allowFrom: prev.allowFrom.filter((x) => x !== id) }))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/telegram/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration')
      toast({ title: 'Telegram configured!', description: 'Your bot is now active.', variant: 'success' })
      onComplete()
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step === s.id
                  ? 'bg-indigo-600 text-white'
                  : step > s.id
                  ? 'bg-emerald-600/20 text-emerald-400 cursor-pointer hover:bg-emerald-600/30'
                  : 'bg-zinc-800 text-zinc-500 cursor-default'
              }`}
            >
              {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </button>
            <span
              className={`hidden sm:block text-xs font-medium ${
                step === s.id ? 'text-zinc-200' : step > s.id ? 'text-emerald-400' : 'text-zinc-600'
              }`}
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-700 hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Bot Token */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-400" />
              Create Your Telegram Bot
            </CardTitle>
            <CardDescription>
              You need a bot token from Telegram's BotFather to connect your AI agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
              <p className="text-sm font-medium text-zinc-200">How to get your bot token:</p>
              <ol className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold mt-0.5">1</span>
                  Open Telegram and search for <strong className="text-zinc-200">@BotFather</strong>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold mt-0.5">2</span>
                  Send the command <code className="rounded bg-zinc-700 px-1.5 py-0.5 text-indigo-300">/newbot</code> and follow the prompts
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold mt-0.5">3</span>
                  BotFather will give you a token like <code className="rounded bg-zinc-700 px-1.5 py-0.5 text-zinc-300">123456:ABC-DEF...</code>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold mt-0.5">4</span>
                  Copy that token and paste it below
                </li>
              </ol>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Open BotFather in Telegram
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Token input */}
            <div className="space-y-2">
              <Label>Bot Token</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="123456789:ABCdefGHIjklMNO..."
                    value={config.botToken}
                    onChange={(e) => {
                      setConfig((prev) => ({ ...prev, botToken: e.target.value }))
                      setTokenValid(null)
                    }}
                    className="pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={validateToken}
                  disabled={isValidating || !config.botToken}
                >
                  {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
              </div>
              {tokenValid === true && config.botUsername && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Connected as @{config.botUsername}
                </p>
              )}
              {tokenValid === false && (
                <p className="text-xs text-red-400">Invalid token. Please check and try again.</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={tokenValid !== true}
              >
                Next: Access Control
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Access Control */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400" />
              Access Control
            </CardTitle>
            <CardDescription>
              Control who can interact with your AI bot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* DM Policy */}
            <div className="space-y-3">
              <Label>Direct Message Policy</Label>
              <Select
                value={config.dmPolicy}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, dmPolicy: v as DmPolicy }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pairing">
                    Pairing (Approve new users with a code)
                  </SelectItem>
                  <SelectItem value="allowlist">
                    Allowlist (Only specific user IDs)
                  </SelectItem>
                  <SelectItem value="open">
                    Open (Anyone can message)
                  </SelectItem>
                  <SelectItem value="disabled">
                    Disabled (Block all DMs)
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="rounded-lg bg-zinc-800/50 p-3 text-xs text-zinc-400 space-y-1">
                {config.dmPolicy === 'pairing' && (
                  <p>✓ <strong className="text-zinc-300">Recommended for most users.</strong> New users message the bot and get a pairing code. You approve them once.</p>
                )}
                {config.dmPolicy === 'allowlist' && (
                  <p>✓ Only users whose Telegram ID you add below can use the bot. Most secure option.</p>
                )}
                {config.dmPolicy === 'open' && (
                  <p>⚠ Anyone who finds your bot can use it. Only recommended for public bots.</p>
                )}
                {config.dmPolicy === 'disabled' && (
                  <p>✕ No one can send DMs to the bot. Useful if you only want group usage.</p>
                )}
              </div>
            </div>

            {/* Allow From (for allowlist) */}
            {config.dmPolicy === 'allowlist' && (
              <div className="space-y-3">
                <Label>Allowed Telegram User IDs</Label>
                <p className="text-xs text-zinc-500">
                  Add numeric Telegram user IDs. To find yours: DM your bot, then check the OpenClaw logs for <code className="bg-zinc-800 px-1 rounded">from.id</code>.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 123456789"
                    value={newAllowId}
                    onChange={(e) => setNewAllowId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAllowId()}
                  />
                  <Button variant="outline" size="icon" onClick={addAllowId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {config.allowFrom.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.allowFrom.map((id) => (
                      <Badge key={id} variant="secondary" className="gap-1.5 pr-1">
                        {id}
                        <button onClick={() => removeAllowId(id)} className="hover:text-red-400 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">⚠ No IDs added yet. You must add at least one ID for allowlist mode.</p>
                )}
              </div>
            )}

            {/* Group Policy */}
            <div className="space-y-2">
              <Label>Group Message Policy</Label>
              <Select
                value={config.groupPolicy}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, groupPolicy: v as GroupPolicy }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowlist">Allowlist (Specific users only)</SelectItem>
                  <SelectItem value="open">Open (Any group member)</SelectItem>
                  <SelectItem value="disabled">Disabled (No group usage)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>
                Next: Advanced
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Advanced Settings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-400" />
              Advanced Settings
            </CardTitle>
            <CardDescription>
              Fine-tune your bot's behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Streaming */}
            <div className="space-y-2">
              <Label>Response Streaming</Label>
              <Select
                value={config.streaming}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, streaming: v as StreamingMode }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partial">Partial (Live preview while typing)</SelectItem>
                  <SelectItem value="block">Block (Send when done)</SelectItem>
                  <SelectItem value="off">Off (No streaming)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">
                "Partial" shows the AI's response as it's being generated — like watching it type.
              </p>
            </div>

            {/* Link Preview */}
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">Link Previews</p>
                <p className="text-xs text-zinc-500 mt-0.5">Show rich previews for links in messages</p>
              </div>
              <Switch
                checked={config.linkPreview}
                onCheckedChange={(v) => setConfig((prev) => ({ ...prev, linkPreview: v }))}
              />
            </div>

            {/* Reply Mode */}
            <div className="space-y-2">
              <Label>Reply Threading</Label>
              <Select
                value={config.replyToMode}
                onValueChange={(v) => setConfig((prev) => ({ ...prev, replyToMode: v as 'off' | 'first' | 'all' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off (No threading)</SelectItem>
                  <SelectItem value="first">First message only</SelectItem>
                  <SelectItem value="all">All messages</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>
                Review Configuration
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" />
              Review & Activate
            </CardTitle>
            <CardDescription>
              Confirm your Telegram bot configuration before activating.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 divide-y divide-zinc-700">
              <ReviewRow label="Bot" value={`@${config.botUsername}`} />
              <ReviewRow label="DM Policy" value={config.dmPolicy} />
              {config.allowFrom.length > 0 && (
                <ReviewRow label="Allowed Users" value={`${config.allowFrom.length} ID(s)`} />
              )}
              <ReviewRow label="Group Policy" value={config.groupPolicy} />
              <ReviewRow label="Streaming" value={config.streaming} />
              <ReviewRow label="Link Previews" value={config.linkPreview ? 'On' : 'Off'} />
              <ReviewRow label="Reply Threading" value={config.replyToMode} />
            </div>

            <div className="rounded-lg border border-indigo-600/30 bg-indigo-600/5 p-4 text-sm text-indigo-300 space-y-1">
              <p className="font-medium">What happens next?</p>
              <ul className="text-xs text-indigo-300/80 space-y-0.5 list-disc list-inside">
                <li>Your configuration is saved and synced to your AI sandbox</li>
                <li>The Telegram gateway will start automatically</li>
                {config.dmPolicy === 'pairing' && (
                  <li>Users will need to pair with a one-time code on first message</li>
                )}
              </ul>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">Enable Telegram Channel</p>
                <p className="text-xs text-zinc-500">Activate the bot immediately</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => setConfig((prev) => ({ ...prev, enabled: v }))}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleSave} disabled={isSaving} variant="success">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSaving ? 'Activating...' : existing ? 'Save Changes' : 'Activate Bot'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-200 font-medium capitalize">{value}</span>
    </div>
  )
}
