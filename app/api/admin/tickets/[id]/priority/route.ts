import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TicketPriority } from '@prisma/client'

/**
 * PATCH /api/admin/tickets/[id]/priority
 * Update ticket priority
 * Requirements: 7.6
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    await requireAdmin()

    // Parse request body
    const body = await request.json()
    const { priority } = body

    // Validate priority
    if (!priority || !Object.values(TicketPriority).includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      )
    }

    // Check if ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Update ticket priority
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: { priority },
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating ticket priority:', error)
    
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update ticket priority' },
      { status: 500 }
    )
  }
}
