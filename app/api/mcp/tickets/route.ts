import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TicketStatus, TicketPriority } from '@prisma/client'

/**
 * MCP API: List Tickets
 * Returns a list of tickets with optional filters
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as TicketStatus | null
    const priority = searchParams.get('priority') as TicketPriority | null
    const companyId = searchParams.get('companyId')
    const assignedTo = searchParams.get('assignedTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Build where clause
    const where: any = {
      isDeleted: false,
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (companyId) where.companyId = companyId
    if (assignedTo === 'unassigned') {
      where.assignedToId = null
    } else if (assignedTo) {
      where.assignedToId = assignedTo
    }

    // Fetch tickets
    const tickets = await prisma.ticket.findMany({
      where,
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
            images: true,
          },
        },
      },
    })

    const response = {
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description.substring(0, 200) + (ticket.description.length > 200 ? '...' : ''),
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        company: ticket.company.name,
        createdBy: ticket.createdBy.name,
        assignedTo: ticket.assignedTo?.name || 'Unassigned',
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        commentCount: ticket._count.comments,
        imageCount: ticket._count.images,
      })),
      count: tickets.length,
      filters: {
        status,
        priority,
        companyId,
        assignedTo,
        limit,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
