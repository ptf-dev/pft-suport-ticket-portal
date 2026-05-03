import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * MCP API: Get Ticket Comments
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

    const comments = await prisma.ticketComment.findMany({
      where: {
        ticketId: params.id,
      },
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
    })

    return NextResponse.json({
      ticketId: params.id,
      comments: comments.map(comment => ({
        id: comment.id,
        content: comment.message,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          role: comment.author.role,
        },
        createdAt: comment.createdAt,
        images: comment.images,
      })),
      count: comments.length,
    })
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * MCP API: Add Comment to Ticket
 */
export async function POST(
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
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Get or create MCP bot user
    let mcpUser = await prisma.user.findFirst({
      where: { email: 'mcp-bot@propfirmstech.com' },
    })

    if (!mcpUser) {
      mcpUser = await prisma.user.create({
        data: {
          email: 'mcp-bot@propfirmstech.com',
          name: 'PFT AI Agent (Bot)',
          password: 'mcp-bot-no-login',
          role: 'ADMIN',
          isActive: true,
        },
      })
    } else if (mcpUser.name !== 'PFT AI Agent (Bot)') {
      mcpUser = await prisma.user.update({
        where: { id: mcpUser.id },
        data: { name: 'PFT AI Agent (Bot)' },
      })
    }

    // Create comment
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        authorId: mcpUser.id,
        message: content,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.message,
        author: comment.author,
        createdAt: comment.createdAt,
      },
    })
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
