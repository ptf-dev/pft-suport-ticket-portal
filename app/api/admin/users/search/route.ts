import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const search = request.nextUrl.searchParams.get('search') || ''
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: { select: { name: true } },
      },
      take: limit,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error: any) {
    if (error.message === 'Admin access required' || error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
