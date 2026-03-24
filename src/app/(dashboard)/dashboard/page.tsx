import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [sandboxRes, telegramRes, logsRes] = await Promise.all([
    supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('telegram_configs')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle(),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return (
    <DashboardClient
      user={user!}
      initialSandbox={sandboxRes.data}
      initialTelegramConfig={telegramRes.data}
      initialLogs={logsRes.data ?? []}
    />
  )
}
