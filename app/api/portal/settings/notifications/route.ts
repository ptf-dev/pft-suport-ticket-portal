import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Notification Settings API
 * Requirements: Email notification system
 * 
 * GET /api/portal/settings/notifications - Get settings
 * PUT /api/portal/settings/notifications - Update settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireClient()
    const companyId = session.user.companyId!

    const settings = await prisma.notificationSettings.findUnique({
      where: { companyId },
    })

    if (!settings) {
      return NextResponse.json(
        { message: 'Settings not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { message: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireClient()
    const companyId = session.user.companyId!

    const body = await request.json()
    const {
      emailNotificationsEnabled,
      notifyOnStatusChange,
      notifyOnNewComments,
      notifyOnTicketAssignment,
      notifyOnTicketResolution,
    } = body

    const settings = await prisma.notificationSettings.upsert({
      where: { companyId },
      update: {
        emailNotificationsEnabled,
        notifyOnStatusChange,
        notifyOnNewComments,
        notifyOnTicketAssignment,
        notifyOnTicketResolution,
      },
      create: {
        companyId,
        emailNotificationsEnabled,
        notifyOnStatusChange,
        notifyOnNewComments,
        notifyOnTicketAssignment,
        notifyOnTicketResolution,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { message: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
