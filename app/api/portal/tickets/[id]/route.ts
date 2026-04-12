import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Ticket Update API Endpoint
 * 
 * PATCH /api/portal/tickets/[id]
 * - Client authentication required
 * - Allows updating title, description, and category
 * - Validates ticket ownership
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require client authentication
    const session = await requireClient()
    const companyId = session.user.companyId!

    // Verify ticket exists and belongs to client's company
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (ticket.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { title, description, category } = body

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    // Update ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        title,
        description,
        category: category || null,
      },
    })

    return NextResponse.json(updatedTicket, { status: 200 })
  } catch (error) {
    console.error('Error updating ticket:', error)
    
    if (error instanceof Error && error.message.includes('Client access required')) {
      return NextResponse.json(
        { error: 'Client access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
