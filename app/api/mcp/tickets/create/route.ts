import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PRIORITY_VALUES } from '@/lib/priorities'
import { autoSprintIdForPriority } from '@/lib/auto-sprint'

/**
 * MCP API: Create Ticket
 * Creates a new ticket in the system
 */
export async function POST(request: NextRequest) {
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
    const { title, description, priority, category, companyId } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      )
    }

    // Validate priority
    const validPriorities = PRIORITY_VALUES
    const ticketPriority = (priority && validPriorities.includes(priority)) ? priority : 'MEDIUM'

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
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
    }

    const sprintId = await autoSprintIdForPriority(ticketPriority)

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        priority: ticketPriority,
        category: category || null,
        status: 'OPEN',
        companyId,
        createdById: mcpUser.id,
        sprintId,
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
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        company: ticket.company,
        createdBy: ticket.createdBy,
        createdAt: ticket.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
