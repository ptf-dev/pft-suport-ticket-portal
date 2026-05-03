import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TicketStatus } from '@prisma/client'

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
    const validStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Update ticket
    const ticket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status,
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
