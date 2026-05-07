import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TicketRelationType } from '@prisma/client'

/**
 * Inverse relation mapping:
 * When Ticket A "BLOCKS" Ticket B, Ticket B is "BLOCKED_BY" Ticket A
 */
const INVERSE_RELATIONS: Record<string, string> = {
  BLOCKS: 'BLOCKED_BY',
  BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',         // symmetric
  IS_IDEA_FOR: 'IS_IDEA_FOR',       // no inverse needed, shown via direction
  WILL_IMPLEMENT_AFTER: 'WILL_IMPLEMENT_AFTER',
  ADDED_TO_ROADMAP: 'ADDED_TO_ROADMAP',
}

/**
 * How to display a relation when viewing it from the *target* ticket's perspective.
 * e.g. If A -> BLOCKS -> B, then on ticket B we show "Blocked by A"
 */
const INCOMING_LABELS: Record<string, string> = {
  BLOCKS: 'BLOCKED_BY',
  BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
  IS_IDEA_FOR: 'IS_IDEA_FOR',
  WILL_IMPLEMENT_AFTER: 'WILL_IMPLEMENT_AFTER',
  ADDED_TO_ROADMAP: 'ADDED_TO_ROADMAP',
}

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

    const relationsAsTarget = await prisma.ticketRelation.findMany({
      where: { targetTicketId: params.id },
      include: {
        sourceTicket: {
          select: { id: true, title: true, status: true, priority: true },
        },
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      relations: [
        ...relationsAsSource.map(r => ({
          id: r.id,
          type: r.relationType,
          direction: 'outgoing',
          relatedTicket: r.targetTicket,
          createdBy: r.createdBy?.name || 'System',
          createdAt: r.createdAt,
        })),
        // For incoming relations, show the inverse label
        ...relationsAsTarget.map(r => ({
          id: r.id,
          type: INCOMING_LABELS[r.relationType] || r.relationType,
          direction: 'incoming',
          relatedTicket: r.sourceTicket,
          createdBy: r.createdBy?.name || 'System',
          createdAt: r.createdAt,
        })),
      ],
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/**
 * Admin API: Add Ticket Relation
 * Also creates the inverse relation automatically.
 * e.g. A BLOCKS B => also creates B BLOCKED_BY A
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const body = await request.json()
    const { targetTicketId, relationType } = body

    if (!targetTicketId || !relationType) {
      return NextResponse.json(
        { error: 'targetTicketId and relationType are required' },
        { status: 400 }
      )
    }

    const validTypes: TicketRelationType[] = [
      'BLOCKS', 'BLOCKED_BY', 'RELATES_TO',
      'IS_IDEA_FOR', 'WILL_IMPLEMENT_AFTER', 'ADDED_TO_ROADMAP'
    ]
    if (!validTypes.includes(relationType)) {
      return NextResponse.json(
        { error: `Invalid relationType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (params.id === targetTicketId) {
      return NextResponse.json(
        { error: 'Cannot create a relation to the same ticket' },
        { status: 400 }
      )
    }

    // Verify both tickets exist
    const [sourceTicket, targetTicket] = await Promise.all([
      prisma.ticket.findUnique({ where: { id: params.id } }),
      prisma.ticket.findUnique({ where: { id: targetTicketId } }),
    ])

    if (!sourceTicket || !targetTicket) {
      return NextResponse.json(
        { error: 'One or both tickets not found' },
        { status: 404 }
      )
    }

    const createdById = (session as any).user?.id || null
    const inverseType = INVERSE_RELATIONS[relationType] as TicketRelationType

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
      // Create inverse relation (skip if it's the same, e.g. RELATES_TO)
      ...(inverseType !== relationType
        ? [
            prisma.ticketRelation.create({
              data: {
                sourceTicketId: targetTicketId,
                targetTicketId: params.id,
                relationType: inverseType,
                createdById,
              },
            }),
          ]
        : []),
    ])

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

    const inverseType = INVERSE_RELATIONS[relation.relationType] as TicketRelationType

    // Delete both the relation and its inverse in a transaction
    await prisma.$transaction([
      prisma.ticketRelation.delete({
        where: { id: relationId },
      }),
      // Delete inverse relation if it exists and is different
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Relation not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
