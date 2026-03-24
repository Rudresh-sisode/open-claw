import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { botToken } = await req.json()
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token is required' }, { status: 400 })
    }

    // Call Telegram Bot API to validate the token
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      { next: { revalidate: 0 } }
    )
    const telegramData = await telegramRes.json()

    if (!telegramData.ok) {
      return NextResponse.json(
        { error: telegramData.description || 'Invalid bot token' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      username: telegramData.result.username,
      firstName: telegramData.result.first_name,
      id: telegramData.result.id,
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 })
  }
}
