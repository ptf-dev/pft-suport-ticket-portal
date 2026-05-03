import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string; imageId: string } }
) {
  try {
    await requireAdmin()

    const comment = await prisma.ticketComment.findUnique({
      where: { id: params.commentId },
      select: { ticketId: true },
    })

    if (!comment || comment.ticketId !== params.id) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const image = await prisma.commentImage.findUnique({
      where: { id: params.imageId },
    })

    if (!image || image.commentId !== params.commentId) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    await prisma.commentImage.delete({
      where: { id: params.imageId },
    })

    try {
      const filepath = join(process.cwd(), 'public', 'uploads', 'comments', params.commentId, image.filename)
      await unlink(filepath)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment image:', error)
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
