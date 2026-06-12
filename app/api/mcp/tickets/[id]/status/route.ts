import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TicketStatus } from '@prisma/client'
import { ActivityService } from '@/lib/services/activity'

/**
 * MCP API: Update Ticket Status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify API key
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.MCP_API_KEY
    
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Capture prior status so we only stamp resolvedAt on transition into RESOLVED
    const existing = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Update ticket
    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status,
        resolvedAt:
          status === 'RESOLVED' && existing.status !== 'RESOLVED'
            ? new Date()
            : status !== 'RESOLVED'
            ? null
            : undefined,
        updatedAt: new Date(),
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
      },
    })

    // Add a system comment about the status change
    const mcpUser = await prisma.user.findFirst({
      where: { email: 'mcp-bot@propfirmstech.com' },
    })

    if (mcpUser) {
      await prisma.ticketComment.create({
        data: {
          ticketId: params.id,
          authorId: mcpUser.id,
          message: `Status changed to ${status} by PFT AI Agent`,
        },
      })

      // Log to the activity timeline + maintain boomerang counters (lib/boomerang.ts).
      if (existing.status !== status) {
        ActivityService.statusChanged(params.id, mcpUser.id, existing.status, status).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        company: ticket.company.name,
        assignedTo: ticket.assignedTo?.name,
        updatedAt: ticket.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('MCP API Error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
