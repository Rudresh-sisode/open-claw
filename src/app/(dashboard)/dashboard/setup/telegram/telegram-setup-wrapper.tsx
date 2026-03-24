'use client'

import { useRouter } from 'next/navigation'
import { TelegramSetupWizard } from '@/components/telegram/setup-wizard'
import { TelegramConfig } from '@/types'

interface Props {
  existing: TelegramConfig | null
}

export function TelegramSetupWizardWrapper({ existing }: Props) {
  const router = useRouter()

  return (
    <TelegramSetupWizard
      existing={existing}
      onComplete={() => router.push('/dashboard')}
    />
  )
}
