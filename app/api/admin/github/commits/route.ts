import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { searchCommitsByKey } from '@/lib/integrations/github'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const key = request.nextUrl.searchParams.get('key')?.trim()
    if (!key || key.length < 3) {
      return NextResponse.json({ error: 'key param required (min 3 chars)' }, { status: 400 })
    }

    const { commits, error } = await searchCommitsByKey(key)

    return NextResponse.json({ commits, error: error ?? null })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
