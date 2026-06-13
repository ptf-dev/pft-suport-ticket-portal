import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { SprintStatus } from '@prisma/client'

/** GET /api/admin/sprints — list sprints with total + done ticket counts. */
export async function GET() {
  try {
    await requireAdmin()
    const sprints = await prisma.sprint.findMany({
      include: { _count: { select: { tickets: true } } },
      orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    })
    const ids = sprints.map((s) => s.id)
    const doneGroups = ids.length
      ? await prisma.ticket.groupBy({
          by: ['sprintId'],
          where: {
            sprintId: { in: ids },
            OR: [{ status: { in: ['RESOLVED', 'CLOSED'] } }, { archivedAt: { not: null } }],
          },
          _count: { _all: true },
        })
      : []
    const doneBySprint = new Map(doneGroups.map((g) => [g.sprintId, g._count._all]))
    return NextResponse.json(
      sprints.map((s) => ({
        ...s,
        total: s._count.tickets,
        done: doneBySprint.get(s.id) ?? 0,
      })),
    )
  } catch (error) {
    return errorResponse(error, 'Failed to list sprints')
  }
}

/** POST /api/admin/sprints — create a sprint. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const goal = typeof body?.goal === 'string' && body.goal.trim() ? body.goal.trim() : null
    const startDate = body?.startDate ? new Date(body.startDate) : null
    const endDate = body?.endDate ? new Date(body.endDate) : null
    const status: SprintStatus =
      body?.status && Object.values(SprintStatus).includes(body.status) ? body.status : 'PLANNED'

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Valid start and end dates are required' }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    const sprint = await prisma.sprint.create({
      data: { name, goal, startDate, endDate, status },
    })
    return NextResponse.json(sprint, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'Failed to create sprint')
  }
}

function errorResponse(error: unknown, fallback: string) {
  console.error(fallback, error)
  if (error instanceof Error && error.message.includes('Admin access required')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}
