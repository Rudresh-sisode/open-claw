import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: sandbox } = await supabase
      .from('sandboxes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ sandbox: sandbox ?? null })
  } catch (error) {
    console.error('Get sandbox status error:', error)
    return NextResponse.json({ sandbox: null })
  }
}
