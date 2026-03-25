import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { approvePairing } from '@/lib/vercel-sandbox'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await req.json()
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return NextResponse.json({ error: 'Pairing code is required' }, { status: 400 })
  }

  const { data: sandbox } = await supabase
    .from('sandboxes')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'running')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sandbox?.sandbox_id) {
    return NextResponse.json({ error: 'No running sandbox found' }, { status: 404 })
  }

  try {
    const output = await approvePairing(sandbox.sandbox_id, code.trim())

    if (output.toLowerCase().includes('error') || output.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: output.trim() || 'Pairing failed' }, { status: 400 })
    }

    return NextResponse.json({
      message: output.trim() || 'Pairing approved! You can now chat with your bot.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to approve pairing: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}
