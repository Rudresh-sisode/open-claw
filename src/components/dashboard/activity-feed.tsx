'use client'

import { ActivityLog } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import { CheckCircle2, XCircle, Clock, RefreshCw, Zap, Server } from 'lucide-react'

const actionIcons: Record<string, React.ReactNode> = {
  extend_timeout: <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />,
  restart: <Server className="h-3.5 w-3.5 text-amber-400" />,
  create: <Zap className="h-3.5 w-3.5 text-emerald-400" />,
  health_check: <Clock className="h-3.5 w-3.5 text-zinc-400" />,
  configure_telegram: <span className="text-[11px]">📱</span>,
}

const actionLabels: Record<string, string> = {
  extend_timeout: 'Auto-extended timeout',
  restart: 'Auto-restarted sandbox',
  create: 'Created sandbox',
  health_check: 'Health check',
  configure_telegram: 'Telegram configured',
}

interface ActivityFeedProps {
  logs: ActivityLog[]
  isLoading?: boolean
}

export function ActivityFeed({ logs, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-48 rounded bg-zinc-800" />
              <div className="h-2.5 w-24 rounded bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <Clock className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 mt-0.5">
            {actionIcons[log.action] ?? <Clock className="h-3.5 w-3.5 text-zinc-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-zinc-200 truncate">
                {actionLabels[log.action] ?? log.action}
              </p>
              <div className="shrink-0">
                {log.status === 'success' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : log.status === 'failed' ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {log.message && (
                <p className="text-xs text-zinc-500 truncate">{log.message}</p>
              )}
              <span className="text-xs text-zinc-600 shrink-0 ml-auto">
                {formatRelativeTime(log.created_at)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
