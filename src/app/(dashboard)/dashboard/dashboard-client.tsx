'use client'

import { useCallback, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Sandbox, TelegramConfig, ActivityLog, LLMConfig } from '@/types'
import { SandboxStatusCard } from '@/components/dashboard/sandbox-status-card'
import { TelegramStatusCard } from '@/components/telegram/telegram-status-card'
import { LLMSetupCard } from '@/components/llm/llm-setup-card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Shield, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface DashboardClientProps {
  user: User
  initialSandbox: Sandbox | null
  initialTelegramConfig: TelegramConfig | null
  initialLlmConfig: LLMConfig | null
  initialLogs: ActivityLog[]
}

export function DashboardClient({
  user,
  initialSandbox,
  initialTelegramConfig,
  initialLlmConfig,
  initialLogs,
}: DashboardClientProps) {
  const [sandbox, setSandbox] = useState<Sandbox | null>(initialSandbox)
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
  const supabase = createClient()

  const refreshSandbox = useCallback(async () => {
    const { data } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSandbox(data)
  }, [supabase, user.id])

  const refreshLogs = useCallback(async () => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8)
    setLogs(data ?? [])
  }, [supabase, user.id])

  // Poll for sandbox status updates every 10 seconds if creating/restarting
  useEffect(() => {
    if (!sandbox || !['creating', 'restarting'].includes(sandbox.status)) return
    const interval = setInterval(() => {
      refreshSandbox()
      refreshLogs()
    }, 10_000)
    return () => clearInterval(interval)
  }, [sandbox, refreshSandbox, refreshLogs])

  // Realtime subscription for activity logs
  useEffect(() => {
    const channel = supabase
      .channel('activity_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        refreshLogs()
        refreshSandbox()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, user.id, refreshLogs, refreshSandbox])

  const uptimeStatus = sandbox?.status === 'running' ? 'operational' : sandbox ? 'degraded' : 'offline'

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Welcome back, {user.email?.split('@')[0]}
          </p>
        </div>
        <Badge
          variant={uptimeStatus === 'operational' ? 'success' : uptimeStatus === 'degraded' ? 'warning' : 'secondary'}
          className="gap-1.5"
        >
          <span className={`h-1.5 w-1.5 rounded-full inline-block ${
            uptimeStatus === 'operational' ? 'bg-emerald-400 animate-pulse' :
            uptimeStatus === 'degraded' ? 'bg-amber-400' : 'bg-zinc-500'
          }`} />
          {uptimeStatus === 'operational' ? 'All Systems Operational' :
           uptimeStatus === 'degraded' ? 'Degraded' : 'Offline'}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-zinc-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/15">
                <Zap className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Agent Status</p>
                <p className="text-sm font-semibold text-zinc-200 capitalize">
                  {sandbox?.status ?? 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/15">
                <span className="text-base">🧠</span>
              </div>
              <div>
                <p className="text-xs text-zinc-500">AI Provider</p>
                <p className="text-sm font-semibold text-zinc-200 capitalize">
                  {initialLlmConfig
                    ? `${initialLlmConfig.provider} · ${initialLlmConfig.model.split('/').pop()?.split('-').slice(0, 2).join('-') ?? initialLlmConfig.model}`
                    : 'Not configured'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600/15">
                <span className="text-sky-400 text-base">📱</span>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Telegram</p>
                <p className="text-sm font-semibold text-zinc-200">
                  {initialTelegramConfig?.enabled
                    ? `@${initialTelegramConfig.bot_username || 'Active'}`
                    : 'Not configured'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/15">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Auto-Recovery</p>
                <p className="text-sm font-semibold text-zinc-200">Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SandboxStatusCard sandbox={sandbox} onRefresh={refreshSandbox} />

          {/* Activity */}
          <Card className="border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-indigo-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed logs={logs} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <TelegramStatusCard config={initialTelegramConfig} />

          {/* LLM compact card — show when not configured */}
          {!initialLlmConfig && (
            <LLMSetupCard compact />
          )}

          {/* Quick setup guide */}
          {(!initialLlmConfig || !initialTelegramConfig || !sandbox) && (
            <Card className="border-zinc-800 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-zinc-400">Quick Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                {[
                  { done: !!initialLlmConfig, label: 'Configure AI provider', href: '/dashboard/setup/ai-provider' },
                  { done: !!sandbox, label: 'Create AI sandbox', href: null },
                  { done: !!initialTelegramConfig, label: 'Connect Telegram bot', href: '/dashboard/setup/telegram' },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-2.5">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      step.done ? 'bg-emerald-600/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {step.done ? '✓' : '○'}
                    </div>
                    {step.href && !step.done ? (
                      <a href={step.href} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        {step.label}
                      </a>
                    ) : (
                      <span className={step.done ? 'text-zinc-400 line-through' : 'text-zinc-300'}>
                        {step.label}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
