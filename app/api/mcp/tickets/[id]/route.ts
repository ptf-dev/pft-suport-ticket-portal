import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * MCP API: Get Ticket Details
 * Returns complete ticket information including comments, images, and history
 */
export async function GET(
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

    const ticketId = params.id

    // Fetch ticket with all related data
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            images: {
              select: {
                id: true,
                url: true,
                filename: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            filename: true,
          },
        },
      },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Format response for LLM consumption
    const response = {
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        company: {
          id: ticket.company.id,
          name: ticket.company.name,
        },
        createdBy: {
          id: ticket.createdBy.id,
          name: ticket.createdBy.name,
          email: ticket.createdBy.email,
        },
        assignedTo: ticket.assignedTo ? {
          id: ticket.assignedTo.id,
          name: ticket.assignedTo.name,
          email: ticket.assignedTo.email,
        } : null,
        assignedAt: ticket.assignedAt,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        isDeleted: ticket.isDeleted,
        comments: ticket.comments.map(comment => ({
          id: comment.id,
          content: comment.message,
          author: {
            id: comment.author.id,
            name: comment.author.name,
            email: comment.author.email,
            role: comment.author.role,
          },
          createdAt: comment.createdAt,
          images: comment.images.map(img => ({
            id: img.id,
            url: img.url,
            filename: img.filename,
          })),
        })),
        images: ticket.images.map(img => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
        })),
        commentCount: ticket.comments.length,
        imageCount: ticket.images.length,
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: 'PropFirms Ticketing MCP',
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
