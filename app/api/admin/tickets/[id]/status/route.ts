import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { TicketStatus } from '@prisma/client'
import { NotificationService } from '@/lib/services/notification'

/**
 * PATCH /api/admin/tickets/[id]/status
 * Update ticket status
 * Requirements: 7.5
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
    const { status } = body

    // Validate status
    if (!status || !Object.values(TicketStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
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

    // Update ticket status
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: { status },
    })

    // Notify client about status change (fire-and-forget)
    NotificationService.notifyClientStatusChanged(params.id, ticket.status, status).catch(() => {})

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating ticket status:', error)
    
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update ticket status' },
      { status: 500 }
    )
  }
}
