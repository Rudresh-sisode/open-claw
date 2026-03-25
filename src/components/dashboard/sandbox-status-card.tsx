'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Sandbox } from '@/types'
import { formatTimeRemaining } from '@/lib/utils'
import {
  Server,
  Play,
  RefreshCw,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  KeyRound,
  Check,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface SandboxStatusCardProps {
  sandbox: Sandbox | null
  onRefresh: () => void
}

export function SandboxStatusCard({ sandbox, onRefresh }: SandboxStatusCardProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [pairingApproved, setPairingApproved] = useState(false)
  const { toast } = useToast()

  const statusConfig = {
    running: { label: 'Running', variant: 'success' as const, dot: 'bg-emerald-400 animate-pulse' },
    creating: { label: 'Creating...', variant: 'warning' as const, dot: 'bg-amber-400 animate-pulse' },
    stopped: { label: 'Stopped', variant: 'secondary' as const, dot: 'bg-zinc-500' },
    error: { label: 'Error', variant: 'destructive' as const, dot: 'bg-red-400' },
    restarting: { label: 'Restarting...', variant: 'warning' as const, dot: 'bg-amber-400 animate-pulse' },
  }

  const config = sandbox ? statusConfig[sandbox.status] : statusConfig.stopped

  async function handleCreate() {
    setIsCreating(true)
    try {
      const res = await fetch('/api/sandbox/create', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create sandbox')
      toast({ title: 'Sandbox created!', description: 'Your AI agent is starting up.', variant: 'success' })
      onRefresh()
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRestart() {
    setIsRestarting(true)
    try {
      const res = await fetch('/api/sandbox/restart', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to restart sandbox')
      toast({ title: 'Restarting...', description: 'Your sandbox is being restored from snapshot.' })
      onRefresh()
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsRestarting(false)
    }
  }

  async function handleBootstrap() {
    setIsBootstrapping(true)
    try {
      const res = await fetch('/api/sandbox/bootstrap', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start OpenClaw')
      toast({ title: 'OpenClaw started!', description: 'Your AI agent is now running. Try messaging your Telegram bot.' , variant: 'success' })
      onRefresh()
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsBootstrapping(false)
    }
  }

  async function handlePairingApprove() {
    if (!pairingCode.trim()) return
    setIsApproving(true)
    try {
      const res = await fetch('/api/sandbox/pairing-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairingCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve pairing')
      setPairingApproved(true)
      toast({
        title: 'Pairing approved!',
        description: 'Your Telegram bot is now connected. Send it a message!',
        variant: 'success',
      })
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setIsApproving(false)
    }
  }

  const timeRemaining = sandbox?.expires_at ? formatTimeRemaining(sandbox.expires_at) : null
  const expiryProgress = sandbox?.expires_at
    ? Math.max(0, Math.min(100, ((new Date(sandbox.expires_at).getTime() - Date.now()) / (5 * 60 * 60 * 1000)) * 100))
    : 0

  return (
    <Card className="border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-indigo-400" />
            AI Agent Sandbox
          </CardTitle>
          <Badge variant={config.variant}>
            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full inline-block ${config.dot}`} />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sandbox ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-zinc-800/50 p-3">
                <p className="text-zinc-500 text-xs mb-1">Sandbox ID</p>
                <p className="text-zinc-300 font-mono text-xs truncate">
                  {sandbox.sandbox_id || 'Pending...'}
                </p>
              </div>
              <div className="rounded-lg bg-zinc-800/50 p-3">
                <p className="text-zinc-500 text-xs mb-1">Port</p>
                <p className="text-zinc-300 font-mono text-xs">{sandbox.port}</p>
              </div>
            </div>

            {sandbox.status === 'running' && sandbox.expires_at && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <Clock className="h-3 w-3" />
                    Time remaining
                  </span>
                  <span className="text-zinc-300 font-medium">{timeRemaining}</span>
                </div>
                <Progress value={expiryProgress} />
                <p className="text-xs text-zinc-500">
                  Auto-extends every 4 hours to ensure 24/7 uptime
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-1 flex-wrap">
              {sandbox.status === 'running' && (
                <>
                  <Button
                    size="sm"
                    onClick={handleBootstrap}
                    disabled={isBootstrapping}
                    className="flex-1 gap-1.5"
                  >
                    {isBootstrapping ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    {isBootstrapping ? 'Starting...' : 'Start OpenClaw'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestart}
                    disabled={isRestarting}
                    className="gap-1.5"
                  >
                    {isRestarting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Restart
                  </Button>
                </>
              )}
              {(sandbox.status === 'stopped' || sandbox.status === 'error') && (
                <Button
                  size="sm"
                  onClick={handleRestart}
                  disabled={isRestarting}
                  className="flex-1"
                >
                  {isRestarting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {isRestarting ? 'Restarting...' : 'Restart'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onRefresh} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {sandbox?.status === 'running' && (
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-medium">Telegram Pairing</span>
                </div>
                <p className="text-xs text-zinc-500">
                  After clicking &quot;Start OpenClaw&quot;, message your bot on Telegram.
                  It will reply with a pairing code. Enter it below to activate.
                </p>
                {pairingApproved ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Paired! Your bot is ready to chat.
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter pairing code (e.g. KUYARN9J)"
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                      className="h-8 text-xs bg-zinc-900 border-zinc-700"
                      onKeyDown={(e) => e.key === 'Enter' && handlePairingApprove()}
                    />
                    <Button
                      size="sm"
                      onClick={handlePairingApprove}
                      disabled={isApproving || !pairingCode.trim()}
                      className="h-8 px-3 gap-1.5 shrink-0"
                    >
                      {isApproving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
              <WifiOff className="h-6 w-6 text-zinc-500" />
            </div>
            <div className="text-center">
              <p className="text-sm text-zinc-300 font-medium">No active sandbox</p>
              <p className="text-xs text-zinc-500 mt-1">
                Create a sandbox to start your AI agent
              </p>
            </div>
            <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Create AI Agent'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
