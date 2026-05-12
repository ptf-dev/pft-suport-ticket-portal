import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { NotificationService } from '@/lib/services/notification'
import { ActivityService } from '@/lib/services/activity'

/**
 * PATCH /api/admin/tickets/[id]/assign
 * Assign or unassign a ticket to an admin user
 * Requirements: 7.1, 7.7
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    // Parse request body
    const body = await request.json()
    const { assignedToId } = body

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: { assignedTo: { select: { name: true } } },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Validate assignedToId if not null (unassignment case)
    if (assignedToId !== null && assignedToId !== undefined) {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: assignedToId },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid user ID: user not found' },
          { status: 400 }
        )
      }

      // Verify user has ADMIN role
      if (user.role !== Role.ADMIN) {
        return NextResponse.json(
          { error: 'Cannot assign ticket to non-admin user' },
          { status: 400 }
        )
      }

      // Verify user is active
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Cannot assign ticket to inactive user' },
          { status: 400 }
        )
      }
    }

    // Update ticket assignment
    const updateData = assignedToId === null || assignedToId === undefined
      ? { assignedToId: null, assignedAt: null }
      : { assignedToId, assignedAt: new Date() }

    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (assignedToId && ticket.assignedToId !== assignedToId) {
      ActivityService.assigned(
        params.id,
        session.user.id,
        assignedToId,
        updatedTicket.assignedTo?.name ?? 'Unknown',
      ).catch(() => {})
      NotificationService.notifyAgentTicketAssigned(params.id).catch(() => {})
    } else if (!assignedToId && ticket.assignedToId) {
      ActivityService.unassigned(params.id, session.user.id, ticket.assignedTo?.name ?? null).catch(() => {})
    }

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating ticket assignment:', error)
    
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update ticket assignment' },
      { status: 500 }
    )
  }
}
