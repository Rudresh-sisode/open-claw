import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bot, CheckCircle2, AlertCircle, Plus, Settings } from 'lucide-react'

export default async function ChannelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: telegramConfig } = await supabase
    .from('telegram_configs')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  const channels = [
    {
      id: 'telegram',
      name: 'Telegram',
      description: 'Chat with your AI via Telegram bot — DMs and group chats',
      icon: '📱',
      available: true,
      configured: !!telegramConfig,
      enabled: telegramConfig?.enabled ?? false,
      href: '/dashboard/setup/telegram',
      details: telegramConfig
        ? [
            { label: 'Bot', value: `@${telegramConfig.bot_username || 'Unknown'}` },
            { label: 'DM Policy', value: telegramConfig.dm_policy },
            { label: 'Groups', value: telegramConfig.group_policy },
          ]
        : [],
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      description: 'Connect via WhatsApp Business API',
      icon: '💬',
      available: false,
      configured: false,
      enabled: false,
      href: '#',
      details: [],
    },
    {
      id: 'discord',
      name: 'Discord',
      description: 'Add your AI to Discord servers',
      icon: '🎮',
      available: false,
      configured: false,
      enabled: false,
      href: '#',
      details: [],
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Integrate with your Slack workspace',
      icon: '🔵',
      available: false,
      configured: false,
      enabled: false,
      href: '#',
      details: [],
    },
  ]

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Channels</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Connect your AI agent to your favorite messaging platforms.
        </p>
      </div>

      <div className="grid gap-4">
        {channels.map((channel) => (
          <Card
            key={channel.id}
            className={`border-zinc-800 transition-colors ${
              !channel.available ? 'opacity-60' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-xl">
                    {channel.icon}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {channel.name}
                      {!channel.available && (
                        <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{channel.description}</CardDescription>
                  </div>
                </div>
                {channel.available && (
                  <Badge variant={channel.enabled ? 'success' : channel.configured ? 'secondary' : 'outline'}>
                    {channel.enabled ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                    ) : channel.configured ? (
                      'Disabled'
                    ) : (
                      <><AlertCircle className="h-3 w-3 mr-1" />Not Set Up</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>

            {(channel.details.length > 0 || channel.available) && (
              <CardContent className="pt-0">
                {channel.details.length > 0 && (
                  <div className="mb-4 grid grid-cols-3 gap-2">
                    {channel.details.map((d) => (
                      <div key={d.label} className="rounded-lg bg-zinc-800/50 p-2.5">
                        <p className="text-xs text-zinc-500">{d.label}</p>
                        <p className="text-sm font-medium text-zinc-200 capitalize mt-0.5">{d.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {channel.available && (
                  <Button asChild size="sm" variant={channel.configured ? 'outline' : 'default'}>
                    <Link href={channel.href}>
                      {channel.configured ? (
                        <><Settings className="h-3.5 w-3.5" />Manage</>
                      ) : (
                        <><Plus className="h-3.5 w-3.5" />Set Up {channel.name}</>
                      )}
                    </Link>
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
