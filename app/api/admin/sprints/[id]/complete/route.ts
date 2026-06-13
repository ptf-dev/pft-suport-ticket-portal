import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/sprints/[id]/complete
 * Mark a sprint COMPLETED:
 *  - resolved/closed tickets are archived (archivedAt set, kept in the sprint for reports)
 *  - unfinished tickets are carried back to the backlog (sprintId = null)
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const sprint = await prisma.sprint.findUnique({ where: { id: params.id } })
    if (!sprint) return NextResponse.json({ error: 'Sprint not found' }, { status: 404 })

    const now = new Date()

    const [archived, carried] = await prisma.$transaction([
      // Archive delivered work — keep it linked to the sprint for the report.
      prisma.ticket.updateMany({
        where: { sprintId: params.id, status: { in: ['RESOLVED', 'CLOSED'] }, archivedAt: null },
        data: { archivedAt: now },
      }),
      // Carry everything still open back to the backlog.
      prisma.ticket.updateMany({
        where: { sprintId: params.id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
        data: { sprintId: null },
      }),
    ])

    await prisma.sprint.update({
      where: { id: params.id },
      data: { status: 'COMPLETED', completedAt: now },
    })

    return NextResponse.json({ ok: true, archived: archived.count, carried: carried.count })
  } catch (error) {
    console.error('Failed to complete sprint', error)
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to complete sprint' }, { status: 500 })
  }
}
