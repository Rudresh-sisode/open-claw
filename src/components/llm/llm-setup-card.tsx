'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { LLMConfig, LLMProvider } from '@/types'
import {
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { maskToken } from '@/lib/utils'

// Provider metadata
const PROVIDERS: Record<LLMProvider, {
  label: string
  logo: string
  keyLabel: string
  keyPlaceholder: string
  keyHint: string
  docsUrl: string
  models: { value: string; label: string }[]
}> = {
  openai: {
    label: 'OpenAI',
    logo: '🟢',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-proj-...',
    keyHint: 'Starts with sk- or sk-proj-',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster & cheaper)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Budget)' },
      { value: 'o1', label: 'o1 (Reasoning)' },
      { value: 'o1-mini', label: 'o1 Mini' },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    logo: '🟠',
    keyLabel: 'Anthropic API Key',
    keyPlaceholder: 'sk-ant-api03-...',
    keyHint: 'Starts with sk-ant-',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommended)' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fast)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Most capable)' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    ],
  },
  google: {
    label: 'Google Gemini',
    logo: '🔵',
    keyLabel: 'Google AI API Key',
    keyPlaceholder: 'AIzaSy...',
    keyHint: 'Get from Google AI Studio',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
    ],
  },
  groq: {
    label: 'Groq',
    logo: '⚡',
    keyLabel: 'Groq API Key',
    keyPlaceholder: 'gsk_...',
    keyHint: 'Starts with gsk_ — ultra-fast inference',
    docsUrl: 'https://console.groq.com/keys',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Ultra-fast)' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    logo: '🔀',
    keyLabel: 'OpenRouter API Key',
    keyPlaceholder: 'sk-or-v1-...',
    keyHint: 'Access 200+ models from one key',
    docsUrl: 'https://openrouter.ai/keys',
    models: [
      { value: 'openai/gpt-4o', label: 'GPT-4o (via OpenRouter)' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (via OpenRouter)' },
      { value: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (Free tier)' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (via OpenRouter)' },
    ],
  },
}

interface LLMSetupCardProps {
  existing?: LLMConfig | null
  onSaved?: () => void
  compact?: boolean
}

export function LLMSetupCard({ existing, onSaved, compact = false }: LLMSetupCardProps) {
  const [provider, setProvider] = useState<LLMProvider>(existing?.provider ?? 'openai')
  const [apiKey, setApiKey] = useState(existing?.api_key ?? '')
  const [model, setModel] = useState(existing?.model ?? 'gpt-4o')
  const [showKey, setShowKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const meta = PROVIDERS[provider]

  function handleProviderChange(p: LLMProvider) {
    setProvider(p)
    setModel(PROVIDERS[p].models[0].value)
    if (!existing) setApiKey('')
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      toast({ title: 'API key required', description: 'Please enter your API key.', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/llm/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiKey.trim(), model }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({
        title: 'AI provider saved!',
        description: `${meta.label} · ${model}`,
        variant: 'success',
      })
      onSaved?.()
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-zinc-800">
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-indigo-400" />
            AI Provider
          </CardTitle>
          {existing && (
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>
        {!compact && (
          <CardDescription>
            Choose your AI provider and enter your API key. We never share it — it stays in your account.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Provider picker */}
        <div className="space-y-2">
          <Label>Provider</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(PROVIDERS) as LLMProvider[]).map((p) => (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  provider === p
                    ? 'border-indigo-500 bg-indigo-600/10 text-indigo-300'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <span className="text-base">{PROVIDERS[p].logo}</span>
                {PROVIDERS[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Model picker */}
        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {meta.models.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{meta.keyLabel}</Label>
            <a
              href={meta.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Get API key
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {existing && !showKey ? (
            // Show masked existing key with option to change
            <div className="flex gap-2">
              <div className="flex h-9 flex-1 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 font-mono text-sm text-zinc-400">
                {maskToken(existing.api_key)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowKey(true); setApiKey('') }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={meta.keyPlaceholder}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
          <p className="text-xs text-zinc-500">{meta.keyHint}</p>
        </div>

        {/* Cost note */}
        {!compact && (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300 mb-1">💡 Your key, your cost</p>
            <p>
              API usage is billed directly to your {meta.label} account. We never charge extra for AI usage —
              you only pay the provider directly at their standard rates.
            </p>
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : existing ? 'Update AI Provider' : 'Save AI Provider'}
        </Button>
      </CardContent>
    </Card>
  )
}
