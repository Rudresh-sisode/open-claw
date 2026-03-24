import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { User, Shield, Cpu } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sandbox } = await supabase
    .from('sandboxes')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your account and preferences.</p>
      </div>

      {/* Account */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-indigo-400" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Email Address</p>
              <p className="text-xs text-zinc-500 mt-0.5">{user?.email}</p>
            </div>
            <Badge variant="success">Verified</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Account ID</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{user?.id}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Member Since</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sandbox Info */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cpu className="h-4 w-4 text-indigo-400" />
            Sandbox
          </CardTitle>
          <CardDescription>Your AI agent sandbox configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sandbox ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Sandbox ID</p>
                <p className="text-sm font-mono text-zinc-200">{sandbox.sandbox_id ?? 'Pending'}</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Port</p>
                <p className="text-sm font-mono text-zinc-200">{sandbox.port}</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Snapshot</p>
                <p className="text-sm font-mono text-zinc-200">{sandbox.snapshot_id ?? 'Default'}</p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Status</p>
                <Badge variant={sandbox.status === 'running' ? 'success' : 'secondary'} className="capitalize">
                  {sandbox.status}
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">No sandbox created yet. Go to the Dashboard to create one.</p>
          )}
        </CardContent>
      </Card>

      {/* Auto-Recovery */}
      <Card className="border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-indigo-400" />
            Auto-Recovery
          </CardTitle>
          <CardDescription>Uptime strategies running in the background</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Auto-Extend Timeout</p>
              <p className="text-xs text-zinc-500 mt-0.5">Extends sandbox every 4 hours before expiry</p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-zinc-800/50 p-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Health Monitor</p>
              <p className="text-xs text-zinc-500 mt-0.5">Checks sandbox every minute, auto-restarts if dead</p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <p className="text-xs text-zinc-600">
            These run automatically — no configuration needed. Estimated uptime: 99.9%+
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
