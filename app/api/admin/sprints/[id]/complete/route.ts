import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/sprints/[id]/complete
 * Mark a sprint COMPLETED:
 *  - resolved/closed tickets are archived (archivedAt set, kept in the sprint for reports)
 *  - every other (unfinished) ticket is carried into the next sprint — the soonest
 *    upcoming PLANNED sprint by start date. If none exists, they fall back to the
 *    backlog (sprintId = null) and the response says so.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const sprint = await prisma.sprint.findUnique({ where: { id: params.id } })
    if (!sprint) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })

    const now = new Date()

    // The next sprint = soonest upcoming PLANNED sprint (other than this one).
    const nextSprint = await prisma.sprint.findFirst({
      where: { id: { not: params.id }, status: 'PLANNED', startDate: { gte: sprint.startDate } },
      orderBy: { startDate: 'asc' },
      select: { id: true, name: true },
    })

    const [archived, carried] = await prisma.$transaction([
      // Archive delivered work — keep it linked to the sprint for the report.
      prisma.ticket.updateMany({
        where: { sprintId: params.id, status: { in: ['RESOLVED', 'CLOSED'] }, archivedAt: null },
        data: { archivedAt: now },
      }),
      // Move everything still open into the next sprint (or backlog if there is none).
      prisma.ticket.updateMany({
        where: { sprintId: params.id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
        data: { sprintId: nextSprint?.id ?? null },
      }),
    ])

    await prisma.sprint.update({
      where: { id: params.id },
      data: { status: 'COMPLETED', completedAt: now },
    })

    return NextResponse.json({
      ok: true,
      archived: archived.count,
      carried: carried.count,
      movedToSprintId: nextSprint?.id ?? null,
      movedToSprintName: nextSprint?.name ?? null,
    })
  } catch (error) {
    console.error('Failed to complete sprint', error)
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to complete sprint' }, { status: 500 })
  }
}
