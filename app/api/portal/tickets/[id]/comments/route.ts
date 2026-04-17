import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { NotificationService } from '@/lib/services/notification'

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
  mentionedUsers: z.array(z.string().email()).optional().default([]),
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
        mentionedUsers: data.mentionedUsers || [],
      },
      include: {
        author: {
          select: { name: true, role: true },
        },
        images: true,
      },
    })

    // Send email notification to admins
    await NotificationService.notifyAdminNewComment(params.id, comment.id)

    // Send email notifications to mentioned users
    if (data.mentionedUsers && data.mentionedUsers.length > 0) {
      await NotificationService.notifyMentionedUsers(params.id, comment.id, data.mentionedUsers)
    }

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
