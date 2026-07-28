import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const relays = await prisma.webhookRelay.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ relays })
}

export async function POST(request: NextRequest) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const { name, groupJid } = body ?? {}
  if (!name?.trim() || !groupJid?.trim()) {
    return NextResponse.json({ error: 'name and groupJid are required' }, { status: 400 })
  }
  const relay = await prisma.webhookRelay.create({
    data: {
      name: String(name).trim().slice(0, 100),
      groupJid: String(groupJid).trim(),
      secret: randomBytes(24).toString('hex'),
    },
  })
  return NextResponse.json(relay)
}
