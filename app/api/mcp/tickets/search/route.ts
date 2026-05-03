import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * MCP API: Search Tickets
 * Search tickets by keyword in title or description
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
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    // Search tickets
    const tickets = await prisma.ticket.findMany({
      where: {
        isDeleted: false,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { id: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    })

    const response = {
      query,
      results: tickets.map(ticket => ({
        id: ticket.id,
        title: ticket.title,
        description: ticket.description.substring(0, 150) + '...',
        status: ticket.status,
        priority: ticket.priority,
        company: ticket.company.name,
        createdBy: ticket.createdBy.name,
        assignedTo: ticket.assignedTo?.name || 'Unassigned',
        commentCount: ticket._count.comments,
        updatedAt: ticket.updatedAt,
      })),
      count: tickets.length,
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
