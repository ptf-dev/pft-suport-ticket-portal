import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TicketPriority } from '@prisma/client'

/**
 * PATCH /api/portal/tickets/[id]/priority
 * Update ticket priority (client portal)
 * Requirements: 6.2, 6.4 (tenant isolation)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get ticket and verify tenant access
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Verify tenant access (clients can only update their own company's tickets)
    if (session.user.role === 'CLIENT' && ticket.companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update ticket priority
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: { priority },
      select: {
        id: true,
        priority: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating ticket priority:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
