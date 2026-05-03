import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const session = await requireClient()

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true },
    })

    if (!ticket || ticket.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const image = await prisma.ticketImage.findUnique({
      where: { id: params.imageId },
    })

    if (!image || image.ticketId !== params.id) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    await prisma.ticketImage.delete({
      where: { id: params.imageId },
    })

    try {
      const filepath = join(process.cwd(), 'public', 'uploads', 'tickets', params.id, image.filename)
      await unlink(filepath)
    } catch {}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting image:', error)

    if (error instanceof Error) {
      if (error.message.includes('Authentication required')) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
