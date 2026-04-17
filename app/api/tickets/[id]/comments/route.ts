import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireCompanyAccess } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { NotificationService } from '@/lib/services/notification'

/**
 * Comment Creation API
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * 
 * POST /api/tickets/[id]/comments
 * Create a comment on a ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const session = await requireAuth()

    // Fetch ticket to validate access
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket) {
      return NextResponse.json(
        { message: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Validate tenant access for client users
    await requireCompanyAccess(ticket.companyId)

    // Parse request body
    const body = await request.json()
    const { message, internal } = body

    // Validation
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { message: 'Comment message is required' },
        { status: 400 }
      )
    }

    // Determine internal flag based on role
    let isInternal = false
    if (session.user.role === Role.ADMIN && internal === true) {
      isInternal = true
    }
    // Client users can never create internal comments

    // Create comment
    const comment = await prisma.ticketComment.create({
      data: {
        ticketId: params.id,
        authorId: session.user.id,
        message: message.trim(),
        internal: isInternal,
      },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    })

    // Send email notifications
    if (session.user.role === Role.ADMIN && !isInternal) {
      // Admin commented publicly - notify the client
      await NotificationService.notifyClientNewComment(params.id, comment.id)
    } else if (session.user.role === Role.CLIENT) {
      // Client commented - notify admins
      await NotificationService.notifyAdminNewComment(params.id, comment.id)
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)

    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        )
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { message: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
