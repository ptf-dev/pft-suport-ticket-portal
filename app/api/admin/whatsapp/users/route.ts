import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  const users = await prisma.whatsappUser.findMany({
    orderBy: { lastSeenAt: { sort: 'desc', nulls: 'last' } },
    include: { company: { select: { id: true, name: true } } },
  })
  return NextResponse.json({ users })
}
