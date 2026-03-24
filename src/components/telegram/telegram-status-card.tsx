'use client'

import { TelegramConfig } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, Settings, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { maskToken } from '@/lib/utils'

interface TelegramStatusCardProps {
  config: TelegramConfig | null
}

export function TelegramStatusCard({ config }: TelegramStatusCardProps) {
  if (!config) {
    return (
      <Card className="border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-zinc-400" />
            Telegram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-3">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <div className="text-center">
              <p className="text-sm text-zinc-300 font-medium">Not configured</p>
              <p className="text-xs text-zinc-500 mt-1">Set up your Telegram bot to get started</p>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/setup/telegram">Configure Bot</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-indigo-400" />
            Telegram
          </CardTitle>
          <Badge variant={config.enabled ? 'success' : 'secondary'}>
            {config.enabled ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              'Disabled'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-zinc-800/50 p-2.5">
            <p className="text-zinc-500 text-xs">Username</p>
            <p className="text-zinc-200 font-medium mt-0.5">
              {config.bot_username ? `@${config.bot_username}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-2.5">
            <p className="text-zinc-500 text-xs">DM Policy</p>
            <p className="text-zinc-200 font-medium mt-0.5 capitalize">{config.dm_policy}</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-2.5">
            <p className="text-zinc-500 text-xs">Groups</p>
            <p className="text-zinc-200 font-medium mt-0.5 capitalize">{config.group_policy}</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-2.5">
            <p className="text-zinc-500 text-xs">Streaming</p>
            <p className="text-zinc-200 font-medium mt-0.5 capitalize">{config.streaming}</p>
          </div>
        </div>
        <div className="rounded-lg bg-zinc-800/50 p-2.5">
          <p className="text-zinc-500 text-xs mb-1">Bot Token</p>
          <p className="text-zinc-400 font-mono text-xs">{maskToken(config.bot_token)}</p>
        </div>
        <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
          <Link href="/dashboard/setup/telegram">
            <Settings className="h-3.5 w-3.5" />
            Edit Configuration
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
