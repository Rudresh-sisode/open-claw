import { createClient } from '@/lib/supabase/server'
import { LLMSetupCard } from '@/components/llm/llm-setup-card'

export default async function AIProviderSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: existing } = await supabase
    .from('llm_configs')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">AI Provider</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Connect your own AI API key. Your agent uses it to respond to messages.
          We never see your conversations — all requests go directly from your sandbox to your provider.
        </p>
      </div>
      <LLMSetupCard existing={existing} />
    </div>
  )
}
