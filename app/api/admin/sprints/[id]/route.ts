import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { SprintStatus } from '@prisma/client'

/** PATCH /api/admin/sprints/[id] — update name/goal/dates/status. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if ('goal' in (body ?? {})) data.goal = typeof body.goal === 'string' && body.goal.trim() ? body.goal.trim() : null
    if (body?.startDate) {
      const d = new Date(body.startDate)
      if (!isNaN(d.getTime())) data.startDate = d
    }
    if (body?.endDate) {
      const d = new Date(body.endDate)
      if (!isNaN(d.getTime())) data.endDate = d
    }
    if (body?.status && Object.values(SprintStatus).includes(body.status)) {
      data.status = body.status
      if (body.status === 'COMPLETED') data.completedAt = new Date()
      if (body.status !== 'COMPLETED') data.completedAt = null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const sprint = await prisma.sprint.update({ where: { id: params.id }, data })
    return NextResponse.json(sprint)
  } catch (error) {
    return errorResponse(error, 'Failed to update sprint')
  }
}

/** DELETE /api/admin/sprints/[id] — delete sprint; tickets fall back to backlog (FK SET NULL). */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    await prisma.sprint.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'Failed to delete sprint')
  }
}

function errorResponse(error: unknown, fallback: string) {
  console.error(fallback, error)
  if (error instanceof Error && error.message.includes('Admin access required')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }
  return NextResponse.json({ error: fallback }, { status: 500 })
}
