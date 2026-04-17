import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Soft Delete Ticket API Endpoint
 * 
 * DELETE /api/admin/tickets/[id]/delete
 * - Admin authentication required
 * - Soft deletes ticket (marks as deleted, doesn't remove from database)
 * - Preserves all data for potential recovery
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

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

    if (ticket.isDeleted) {
      return NextResponse.json(
        { error: 'Ticket is already deleted' },
        { status: 400 }
      )
    }

    // Soft delete the ticket
    await prisma.ticket.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: session.user.id,
      },
    })

    return NextResponse.json(
      { message: 'Ticket deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting ticket:', error)

    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
