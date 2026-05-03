import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    await requireAdmin()

    const comment = await prisma.ticketComment.findUnique({
      where: { id: params.commentId },
    })

    if (!comment || comment.ticketId !== params.id) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    const { message } = await request.json()

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment message is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.ticketComment.update({
      where: { id: params.commentId },
      data: { message: message.trim() },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating comment:', error)

    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
