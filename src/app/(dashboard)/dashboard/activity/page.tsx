import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { Activity } from 'lucide-react'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Activity Log</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Full history of your sandbox and channel events.
        </p>
      </div>

      <Card className="border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-indigo-400" />
            All Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed logs={logs ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
