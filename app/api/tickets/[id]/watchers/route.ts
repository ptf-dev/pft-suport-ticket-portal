import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'
import { ticketAccess } from '@/lib/ticket-access'
import { ActivityService } from '@/lib/services/activity'
import { NotificationService } from '@/lib/services/notification'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    const access = await ticketAccess(session.user.id, session.user.role, session.user.companyId ?? null, params.id)
    if (!access.view) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const watchers = await prisma.ticketWatcher.findMany({
      where: { ticketId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, company: { select: { name: true } } } },
        addedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(watchers)
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching watchers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      select: { companyId: true, isDeleted: true },
    })
    if (!ticket || ticket.isDeleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isOwnerFirm = session.user.companyId === ticket.companyId

    if (!isAdmin && !isOwnerFirm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    let targetUser: { id: string; name: string; email: string } | null = null

    if (isAdmin && body.userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: body.userId },
        select: { id: true, name: true, email: true, isActive: true },
      }) as any
      if (!targetUser || !(targetUser as any).isActive) {
        return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
      }
    } else if (body.email) {
      const found = await prisma.user.findFirst({
        where: { email: body.email, isActive: true },
        select: { id: true, name: true, email: true },
      })
      if (!found) {
        return NextResponse.json({ error: 'No account found for that email' }, { status: 404 })
      }
      targetUser = found
    } else {
      return NextResponse.json({ error: 'Provide userId (admin) or email (client)' }, { status: 400 })
    }

    const existing = await prisma.ticketWatcher.findUnique({
      where: { ticketId_userId: { ticketId: params.id, userId: targetUser.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'User is already watching this ticket' }, { status: 409 })
    }

    const watcher = await prisma.ticketWatcher.create({
      data: {
        ticketId: params.id,
        userId: targetUser.id,
        addedById: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, email: true, company: { select: { name: true } } } },
        addedBy: { select: { name: true } },
      },
    })

    ActivityService.watcherAdded(params.id, session.user.id, targetUser).catch(() => {})
    NotificationService.notifyWatcherAdded(params.id, targetUser.id).catch(() => {})

    return NextResponse.json(watcher, { status: 201 })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding watcher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()

    const body = await request.json()
    const { watcherId } = body
    if (!watcherId) {
      return NextResponse.json({ error: 'watcherId required' }, { status: 400 })
    }

    const watcherRecord = await prisma.ticketWatcher.findUnique({
      where: { id: watcherId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticket: { select: { companyId: true } },
      },
    })
    if (!watcherRecord || watcherRecord.ticketId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isOwnerFirm = session.user.companyId === watcherRecord.ticket.companyId
    const isSelf = session.user.id === watcherRecord.userId

    if (!isAdmin && !isOwnerFirm && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.ticketWatcher.delete({ where: { id: watcherId } })

    ActivityService.watcherRemoved(params.id, session.user.id, watcherRecord.user).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error removing watcher:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
