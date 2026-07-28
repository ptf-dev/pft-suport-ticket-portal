import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const data: any = {}
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 100)
  if (typeof body.groupJid === 'string' && body.groupJid.trim()) data.groupJid = body.groupJid.trim()
  if (body.rotateSecret === true) data.secret = randomBytes(24).toString('hex')

  const relay = await prisma.webhookRelay.update({ where: { id: params.id }, data })
  return NextResponse.json(relay)
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  await prisma.webhookRelay.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
