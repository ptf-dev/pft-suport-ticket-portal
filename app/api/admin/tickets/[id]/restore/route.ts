import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Restore Deleted Ticket API Endpoint
 * 
 * POST /api/admin/tickets/[id]/restore
 * - Admin authentication required
 * - Restores a soft-deleted ticket
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

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

    if (!ticket.isDeleted) {
      return NextResponse.json(
        { error: 'Ticket is not deleted' },
        { status: 400 }
      )
    }

    // Restore the ticket
    await prisma.ticket.update({
      where: { id: params.id },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      },
    })

    return NextResponse.json(
      { message: 'Ticket restored successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error restoring ticket:', error)

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
