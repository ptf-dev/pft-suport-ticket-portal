import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { listGroups, isWahaConfigured } from '@/lib/integrations/waha'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const [mapped, waGroups] = await Promise.all([
    prisma.whatsappGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true } } },
    }),
    isWahaConfigured() ? listGroups().catch(() => []) : Promise.resolve([]),
  ])
  return NextResponse.json({ mapped, waGroups })
}

export async function POST(request: NextRequest) {
  await requireAdmin()
  const body = await request.json().catch(() => ({}))
  const { groupJid, name, companyId } = body ?? {}
  if (!groupJid || !name || !companyId) {
    return NextResponse.json({ error: 'groupJid, name, and companyId are required' }, { status: 400 })
  }
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

  const created = await prisma.whatsappGroup.upsert({
    where: { groupJid },
    create: { groupJid, name, companyId },
    update: { name, companyId },
    include: { company: { select: { id: true, name: true } } },
  })
  return NextResponse.json(created)
}
