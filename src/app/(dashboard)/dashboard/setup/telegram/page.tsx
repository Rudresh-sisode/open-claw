import { createClient } from '@/lib/supabase/server'
import { TelegramSetupWizardWrapper } from './telegram-setup-wrapper'

export default async function TelegramSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: existing } = await supabase
    .from('telegram_configs')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Telegram Setup</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Connect your Telegram bot to your AI agent. Once configured, anyone you authorize can chat with your AI via Telegram.
        </p>
      </div>
      <TelegramSetupWizardWrapper existing={existing} />
    </div>
  )
}
