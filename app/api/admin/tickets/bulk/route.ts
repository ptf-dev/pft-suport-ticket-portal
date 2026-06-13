import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TicketStatus, TicketPriority, Role } from '@prisma/client'
import { NotificationService } from '@/lib/services/notification'
import { ActivityService } from '@/lib/services/activity'

const MAX_IDS = 200

type BulkAction = 'status' | 'priority' | 'assign' | 'delete'

/**
 * POST /api/admin/tickets/bulk
 * Apply one mutation to many tickets at once.
 * Body: { ids: string[], action: 'status'|'priority'|'assign'|'delete', value?: string|null }
 *  - status:   value = TicketStatus
 *  - priority: value = TicketPriority
 *  - assign:   value = admin userId, or null to unassign
 *  - delete:   soft-delete (isDeleted = true)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const actorId = session.user.id

    const body = await request.json()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : []
    const action: BulkAction = body?.action
    const value: string | null | undefined = body?.value

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No ticket ids provided' }, { status: 400 })
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `Too many tickets (max ${MAX_IDS})` }, { status: 400 })
    }

    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, priority: true, assignedToId: true },
    })
    if (tickets.length === 0) {
      return NextResponse.json({ error: 'No matching tickets' }, { status: 404 })
    }

    switch (action) {
      case 'status': {
        if (!value || !Object.values(TicketStatus).includes(value as TicketStatus)) {
          return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
        }
        const status = value as TicketStatus
        const now = new Date()
        await Promise.all(
          tickets
            .filter((t) => t.status !== status)
            .map((t) =>
              prisma.ticket
                .update({
                  where: { id: t.id },
                  data: {
                    status,
                    resolvedAt:
                      status === 'RESOLVED' && t.status !== 'RESOLVED'
                        ? now
                        : status !== 'RESOLVED'
                        ? null
                        : undefined,
                  },
                })
                .then(() => {
                  ActivityService.statusChanged(t.id, actorId, t.status, status).catch(() => {})
                  NotificationService.notifyClientStatusChanged(t.id, t.status, status).catch(() => {})
                }),
            ),
        )
        break
      }

      case 'priority': {
        if (!value || !Object.values(TicketPriority).includes(value as TicketPriority)) {
          return NextResponse.json({ error: 'Invalid priority value' }, { status: 400 })
        }
        const priority = value as TicketPriority
        await Promise.all(
          tickets
            .filter((t) => t.priority !== priority)
            .map((t) =>
              prisma.ticket
                .update({ where: { id: t.id }, data: { priority } })
                .then(() => {
                  ActivityService.priorityChanged(t.id, actorId, t.priority, priority).catch(() => {})
                }),
            ),
        )
        break
      }

      case 'assign': {
        if (value === null || value === undefined || value === '') {
          // Unassign all.
          await Promise.all(
            tickets
              .filter((t) => t.assignedToId)
              .map((t) =>
                prisma.ticket
                  .update({ where: { id: t.id }, data: { assignedToId: null, assignedAt: null } })
                  .then(() => {
                    ActivityService.unassigned(t.id, actorId, null).catch(() => {})
                  }),
              ),
          )
          break
        }
        const user = await prisma.user.findUnique({ where: { id: value } })
        if (!user) return NextResponse.json({ error: 'Invalid user ID: user not found' }, { status: 400 })
        if (user.role !== Role.ADMIN)
          return NextResponse.json({ error: 'Cannot assign ticket to non-admin user' }, { status: 400 })
        if (!user.isActive)
          return NextResponse.json({ error: 'Cannot assign ticket to inactive user' }, { status: 400 })

        const now = new Date()
        await Promise.all(
          tickets
            .filter((t) => t.assignedToId !== value)
            .map((t) =>
              prisma.ticket
                .update({ where: { id: t.id }, data: { assignedToId: value, assignedAt: now } })
                .then(() => {
                  ActivityService.assigned(t.id, actorId, value, user.name ?? 'Unknown').catch(() => {})
                  NotificationService.notifyAgentTicketAssigned(t.id).catch(() => {})
                }),
            ),
        )
        break
      }

      case 'delete': {
        const now = new Date()
        await prisma.ticket.updateMany({
          where: { id: { in: tickets.map((t) => t.id) } },
          data: { isDeleted: true, deletedAt: now, deletedBy: actorId },
        })
        tickets.forEach((t) => ActivityService.deleted(t.id, actorId).catch(() => {}))
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, count: tickets.length })
  } catch (error) {
    console.error('Error in bulk ticket action:', error)
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to apply bulk action' }, { status: 500 })
  }
}
