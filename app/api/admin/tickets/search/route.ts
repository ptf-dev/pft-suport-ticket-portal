import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Admin API: Search Tickets
 * Search tickets by keyword in title, description, or ticket ID
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    if (!query || query.length < 2) {
      return NextResponse.json({ tickets: [], count: 0 })
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        isDeleted: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        company: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        company: ticket.company.name,
      })),
      count: tickets.length,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
