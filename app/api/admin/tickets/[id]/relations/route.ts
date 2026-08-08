import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TicketRelationType, TicketPriority } from '@prisma/client'
import { ActivityService } from '@/lib/services/activity'
import { NotificationService } from '@/lib/services/notification'
import { RELATION_INVERSE, RELATION_TYPES } from '@/lib/relations'
import { PRIORITY_VALUES } from '@/lib/priorities'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'
import { uniqueTicketKey } from '@/lib/ticket-key'

/**
 * Admin API: Get Ticket Relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const relationsAsSource = await prisma.ticketRelation.findMany({
      where: { sourceTicketId: params.id },
      include: {
        targetTicket: {
          select: { id: true, title: true, status: true, priority: true },
        },
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      relations: relationsAsSource.map(r => ({
        id: r.id,
        type: r.relationType,
        direction: 'outgoing',
        relatedTicket: r.targetTicket,
        createdBy: r.createdBy?.name || 'System',
        createdAt: r.createdAt,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * Admin API: Add Ticket Relation
 * Also creates the inverse relation automatically.
 * e.g. A BLOCKS B => also creates B BLOCKED_BY A
 *
 * Accepts either an existing `targetTicketId`, or a `newTicket` payload to
 * create the related ticket inline (splitting work off a ticket, logging a
 * follow-up bug) without leaving the ticket page. The new ticket inherits the
 * source ticket's company.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { relationType, newTicket } = body
    let { targetTicketId } = body

    if (!relationType) {
      return NextResponse.json({ error: 'relationType is required' }, { status: 400 })
    }
    if (!targetTicketId && !newTicket) {
      return NextResponse.json(
        { error: 'Either targetTicketId or newTicket is required' },
        { status: 400 }
      )
    }

    if (!RELATION_TYPES.includes(relationType)) {
      return NextResponse.json(
        { error: `Invalid relationType. Must be one of: ${RELATION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const sourceTicket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!sourceTicket) {
      return NextResponse.json({ error: 'Source ticket not found' }, { status: 404 })
    }

    const createdById = (session as any).user?.id || null

    // Inline creation path — build the ticket first, then relate to it below.
    if (!targetTicketId) {
      const title = String(newTicket?.title ?? '').trim()
      const description = String(newTicket?.description ?? '').trim()
      const priority = String(newTicket?.priority ?? 'MEDIUM')
      const category = newTicket?.category ? String(newTicket.category).trim() : null

      if (!title || !description) {
        return NextResponse.json(
          { error: 'newTicket.title and newTicket.description are required' },
          { status: 400 }
        )
      }
      if (!PRIORITY_VALUES.includes(priority as TicketPriority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      if (!createdById) {
        return NextResponse.json({ error: 'No session user to attribute the ticket to' }, { status: 401 })
      }

      const [key, sprintId] = await Promise.all([
        uniqueTicketKey(sourceTicket.companyId),
        autoSprintIdForPriority(priority as TicketPriority),
      ])

      const created = await prisma.ticket.create({
        data: {
          key,
          title: title.slice(0, 200),
          description,
          priority: priority as TicketPriority,
          category: category || null,
          status: 'OPEN',
          companyId: sourceTicket.companyId,
          createdById,
          sprintId,
        },
      })

      targetTicketId = created.id
      NotificationService.notifyAdminTicketCreated(created.id).catch(() => {})
      ActivityService.created(created.id, createdById, created.title).catch(() => {})
    }

    if (params.id === targetTicketId) {
      return NextResponse.json(
        { error: 'Cannot create a relation to the same ticket' },
        { status: 400 }
      )
    }

    const targetTicket = await prisma.ticket.findUnique({ where: { id: targetTicketId } })
    if (!targetTicket) {
      return NextResponse.json({ error: 'Target ticket not found' }, { status: 404 })
    }
    const inverseType = RELATION_INVERSE[relationType as TicketRelationType]

    // Create both the relation and its inverse in a transaction
    const [relation] = await prisma.$transaction([
      prisma.ticketRelation.create({
        data: {
          sourceTicketId: params.id,
          targetTicketId,
          relationType,
          createdById,
        },
        include: {
          targetTicket: {
            select: { id: true, title: true, status: true, priority: true },
          },
        },
      }),
      // Always create the reciprocal row so the relation is visible on BOTH
      // tickets (symmetric types like RELATES_TO map to themselves).
      prisma.ticketRelation.create({
        data: {
          sourceTicketId: targetTicketId,
          targetTicketId: params.id,
          relationType: inverseType,
          createdById,
        },
      }),
    ])

    if (createdById) {
      ActivityService.relationAdded(params.id, createdById, relationType, targetTicketId).catch(() => {})
      ActivityService.relationAdded(targetTicketId, createdById, inverseType, params.id).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      relation: {
        id: relation.id,
        type: relation.relationType,
        relatedTicket: relation.targetTicket,
        createdAt: relation.createdAt,
      },
    }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This relation already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * Admin API: Delete Ticket Relation
 * Also deletes the inverse relation automatically.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const relationId = searchParams.get('relationId')

    if (!relationId) {
      return NextResponse.json(
        { error: 'relationId query parameter is required' },
        { status: 400 }
      )
    }

    // Find the relation first so we can delete its inverse
    const relation = await prisma.ticketRelation.findUnique({
      where: { id: relationId },
    })

    if (!relation) {
      return NextResponse.json({ error: 'Relation not found' }, { status: 404 })
    }

    const inverseType = RELATION_INVERSE[relation.relationType as TicketRelationType]

    // Delete both the relation and its inverse in a transaction
    const session = await getSession().catch(() => null)
    const actorId = session?.user?.id

    await prisma.$transaction([
      prisma.ticketRelation.delete({
        where: { id: relationId },
      }),
      ...(inverseType !== relation.relationType
        ? [
            prisma.ticketRelation.deleteMany({
              where: {
                sourceTicketId: relation.targetTicketId,
                targetTicketId: relation.sourceTicketId,
                relationType: inverseType,
              },
            }),
          ]
        : []),
    ])

    if (actorId) {
      ActivityService.relationRemoved(relation.sourceTicketId, actorId, relation.relationType, relation.targetTicketId).catch(() => {})
      if (inverseType !== relation.relationType) {
        ActivityService.relationRemoved(relation.targetTicketId, actorId, inverseType, relation.sourceTicketId).catch(() => {})
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Relation not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
