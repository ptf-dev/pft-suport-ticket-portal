import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/services/notification'
import { z } from 'zod'

/**
 * Ticket Creation API Endpoint (Client Portal)
 * Requirements: 5.2, 5.3
 * 
 * POST /api/portal/tickets
 * - Client authentication required
 * - Creates ticket scoped to client's company
 * - Sets status to OPEN by default
 * - Associates with creator
 */

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
    message: 'Invalid priority value',
  }),
  category: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Require client authentication
    const session = await requireClient()
    const companyId = session.user.companyId!
    const userId = session.user.id

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = createTicketSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Create ticket
    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category || null,
        status: 'OPEN', // Default status
        companyId,
        createdById: userId,
      },
    })

    // Fire-and-forget admin notification
    NotificationService.notifyAdminTicketCreated(ticket.id).catch(() => {})

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating ticket:', error)
    
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
