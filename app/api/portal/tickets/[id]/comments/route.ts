import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * Comment Creation API Endpoint (Client Portal)
 * Requirements: 8.1, 8.2, 8.4, 8.5
 * 
 * POST /api/portal/tickets/[id]/comments
 * - Client authentication required
 * - Creates public comment (internal=false)
 * - Validates tenant access
 */

const createCommentSchema = z.object({
  message: z.string().min(1, 'Comment message is required'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require client authentication
    const session = await requireClient()
    const companyId = session.user.companyId!
    const userId = session.user.id

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

    // Validate input
    const validationResult = createCommentSchema.safeParse(body)
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

    // Create comment (always public for clients)
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        authorId: userId,
        message: data.message,
        internal: false, // Client comments are always public
      },
      include: {
        author: {
          select: { name: true, role: true },
        },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    
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
