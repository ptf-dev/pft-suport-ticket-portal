import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TicketRelationType } from '@prisma/client'

/**
 * Inverse relation mapping
 */
const INVERSE_RELATIONS: Record<string, string> = {
  BLOCKS: 'BLOCKED_BY',
  BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
  IS_IDEA_FOR: 'IS_IDEA_FOR',
  WILL_IMPLEMENT_AFTER: 'WILL_IMPLEMENT_AFTER',
  ADDED_TO_ROADMAP: 'ADDED_TO_ROADMAP',
}

const INCOMING_LABELS: Record<string, string> = {
  BLOCKS: 'BLOCKED_BY',
  BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
  IS_IDEA_FOR: 'IS_IDEA_FOR',
  WILL_IMPLEMENT_AFTER: 'WILL_IMPLEMENT_AFTER',
  ADDED_TO_ROADMAP: 'ADDED_TO_ROADMAP',
}

/**
 * MCP API: Get Ticket Relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.MCP_API_KEY
    
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { id: true, title: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

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
    })

    return NextResponse.json({
      ticketId: params.id,
      ticketTitle: ticket.title,
      relations: [
        ...relationsAsSource.map(r => ({
          id: r.id,
          type: r.relationType,
          direction: 'outgoing' as const,
          relatedTicket: r.targetTicket,
          createdBy: r.createdBy?.name || 'System',
          createdAt: r.createdAt,
        })),
        ...relationsAsTarget.map(r => ({
          id: r.id,
          type: INCOMING_LABELS[r.relationType] || r.relationType,
          direction: 'incoming' as const,
          relatedTicket: r.sourceTicket,
          createdBy: r.createdBy?.name || 'System',
          createdAt: r.createdAt,
        })),
      ],
      count: relationsAsSource.length + relationsAsTarget.length,
    })
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * MCP API: Add Ticket Relation
 * Also creates the inverse relation automatically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.MCP_API_KEY
    
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { targetTicketId, relationType } = body

    if (!targetTicketId || typeof targetTicketId !== 'string') {
      return NextResponse.json(
        { error: 'targetTicketId is required' },
        { status: 400 }
      )
    }

    const validTypes: TicketRelationType[] = [
      'BLOCKS', 'BLOCKED_BY', 'RELATES_TO',
      'IS_IDEA_FOR', 'WILL_IMPLEMENT_AFTER', 'ADDED_TO_ROADMAP'
    ]
    if (!relationType || !validTypes.includes(relationType)) {
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
      prisma.ticket.findUnique({ where: { id: params.id }, select: { id: true, title: true } }),
      prisma.ticket.findUnique({ where: { id: targetTicketId }, select: { id: true, title: true } }),
    ])

    if (!sourceTicket) {
      return NextResponse.json({ error: 'Source ticket not found' }, { status: 404 })
    }

    if (!targetTicket) {
      return NextResponse.json({ error: 'Target ticket not found' }, { status: 404 })
    }

    // Get MCP bot user
    const mcpUser = await prisma.user.findFirst({
      where: { email: 'mcp-bot@propfirmstech.com' },
    })

    const inverseType = INVERSE_RELATIONS[relationType] as TicketRelationType

    // Create the relation and its inverse in a transaction
    const [relation] = await prisma.$transaction([
      prisma.ticketRelation.create({
        data: {
          sourceTicketId: params.id,
          targetTicketId,
          relationType,
          createdById: mcpUser?.id || null,
        },
        include: {
          sourceTicket: { select: { id: true, title: true } },
          targetTicket: { select: { id: true, title: true } },
        },
      }),
      // Create inverse relation (skip if symmetric, e.g. RELATES_TO)
      ...(inverseType !== relationType
        ? [
            prisma.ticketRelation.create({
              data: {
                sourceTicketId: targetTicketId,
                targetTicketId: params.id,
                relationType: inverseType,
                createdById: mcpUser?.id || null,
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
        sourceTicket: relation.sourceTicket,
        targetTicket: relation.targetTicket,
        createdAt: relation.createdAt,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('MCP API Error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This relation already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
