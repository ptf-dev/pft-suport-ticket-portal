import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ActivityService } from '@/lib/services/activity'

/**
 * Ticket Scheduling API Endpoint
 * 
 * PATCH /api/admin/tickets/[id]/schedule
 * - Admin-only access
 * - Updates ticket scheduled date
 * - Allows setting, updating, or clearing scheduled dates
 */

const updateScheduleSchema = z.object({
  scheduledDate: z.string().nullable(), // ISO date string or null to clear
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const ticketId = params.id

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        isDeleted: true,
      },
    })

    if (!existingTicket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (existingTicket.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot schedule deleted tickets' },
        { status: 400 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateScheduleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { scheduledDate } = validationResult.data

    // Convert to Date object or null
    const scheduledDateValue = scheduledDate ? new Date(scheduledDate) : null

    // Validate date is not in the past (optional - you can remove this if you want to allow past dates)
    if (scheduledDateValue) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (scheduledDateValue < today) {
        return NextResponse.json(
          { error: 'Scheduled date cannot be in the past' },
          { status: 400 }
        )
      }
    }

    // Update the ticket's scheduled date
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        scheduledDate: scheduledDateValue,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        scheduledDate: true,
        updatedAt: true,
      },
    })

    if (scheduledDateValue) {
      ActivityService.scheduled(ticketId, session.user.id, existingTicket.scheduledDate, scheduledDateValue).catch(() => {})
    } else if (existingTicket.scheduledDate) {
      ActivityService.unscheduled(ticketId, session.user.id, existingTicket.scheduledDate).catch(() => {})
    }

    return NextResponse.json(
      {
        message: scheduledDateValue
          ? 'Ticket scheduled successfully'
          : 'Scheduled date cleared',
        ticket: updatedTicket,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating ticket schedule:', error)

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
