import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { NotificationService } from '@/lib/services/notification'

const createTicketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.string().optional(),
  companyId: z.string().min(1, 'Company is required'),
  createdById: z.string().min(1, 'User is required'),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const result = createTicketSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, priority, category, companyId, createdById } = result.data

    // Verify the user belongs to the company
    const user = await prisma.user.findFirst({
      where: { id: createdById, companyId },
    })
    if (!user) {
      return NextResponse.json(
        { error: 'Selected user does not belong to the selected company' },
        { status: 400 }
      )
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority,
        category: category || null,
        status: 'OPEN',
        companyId,
        createdById,
      },
    })

    // Notify admin (fire-and-forget)
    NotificationService.notifyAdminTicketCreated(ticket.id).catch(() => {})

    return NextResponse.json(ticket, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
