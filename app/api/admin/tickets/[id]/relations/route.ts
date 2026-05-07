import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TicketRelationType } from '@prisma/client'

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
        ...relationsAsTarget.map(r => ({
          id: r.id,
          type: r.relationType,
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

    const relation = await prisma.ticketRelation.create({
      data: {
        sourceTicketId: params.id,
        targetTicketId,
        relationType,
        createdById: (session as any).user?.id || null,
      },
      include: {
        targetTicket: {
          select: { id: true, title: true, status: true, priority: true },
        },
      },
    })

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

    await prisma.ticketRelation.delete({
      where: { id: relationId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Relation not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
