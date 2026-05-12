import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { ActivityService } from '@/lib/services/activity'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()

    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const { title, description, category } = await request.json()

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: { title, description, category: category || null },
    })

    const changed: string[] = []
    if (ticket.title !== title) changed.push('title')
    if (ticket.description !== description) changed.push('description')
    const newCategory = category || null
    if (ticket.category !== newCategory) {
      ActivityService.categoryChanged(params.id, session.user.id, ticket.category, newCategory).catch(() => {})
    }
    if (changed.length > 0) {
      ActivityService.edited(params.id, session.user.id, changed).catch(() => {})
    }

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
