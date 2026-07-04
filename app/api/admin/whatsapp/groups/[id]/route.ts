import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const data: any = {}
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled
  if (typeof body.autoTicket === 'boolean') data.autoTicket = body.autoTicket
  if (typeof body.autoReply === 'boolean') data.autoReply = body.autoReply
  if (typeof body.mentionOnly === 'boolean') data.mentionOnly = body.mentionOnly
  if (typeof body.notifyOnStatusChange === 'boolean') data.notifyOnStatusChange = body.notifyOnStatusChange
  if (typeof body.agentMode === 'string' && ['SUPPORT', 'HYBRID', 'FREE_CHAT'].includes(body.agentMode)) data.agentMode = body.agentMode
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.companyId === 'string' && body.companyId.trim()) data.companyId = body.companyId

  const updated = await prisma.whatsappGroup.update({
    where: { id: params.id },
    data,
    include: { company: { select: { id: true, name: true } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  await requireAdmin()
  await prisma.whatsappGroup.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
