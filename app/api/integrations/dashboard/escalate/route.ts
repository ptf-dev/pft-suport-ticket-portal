import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { TicketPriority } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveCompanyForProject } from '@/lib/integrations/resolve-company'
import {
  dashboardIntegrationUnauthorizedResponse,
  verifyDashboardIntegrationRequest,
} from '@/lib/integrations/verify-dashboard-request'
import { ActivityService } from '@/lib/services/activity'
import { NotificationService } from '@/lib/services/notification'

const escalateSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().optional(),
  brandName: z.string().optional(),
  supportEmail: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined))
    .pipe(z.string().email().optional()),
  dashboardTicketNumber: z.string().min(1),
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional(),
})

function mapPriority(priority?: string): TicketPriority {
  switch (priority) {
    case 'low':
      return 'LOW'
    case 'high':
      return 'HIGH'
    default:
      return 'MEDIUM'
  }
}

function integrationBotUser() {
  return prisma.user.findFirst({
    where: { email: 'dashboard-integration@propfirmstech.com' },
  })
}

async function getOrCreateIntegrationBot() {
  let bot = await integrationBotUser()
  if (!bot) {
    bot = await prisma.user.create({
      data: {
        email: 'dashboard-integration@propfirmstech.com',
        name: 'Dashboard Integration',
        password: 'no-login-integration-bot',
        role: 'ADMIN',
        isActive: true,
      },
    })
  }
  return bot
}

function adminTicketUrl(request: NextRequest, ticketId: string): string {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, '')
  if (configured) {
    return `${configured}/admin/tickets/${ticketId}`
  }
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host') || 'localhost:3000'
  return `${proto}://${host}/admin/tickets/${ticketId}`
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyDashboardIntegrationRequest(request)) {
      return dashboardIntegrationUnauthorizedResponse()
    }

    const body = await request.json()
    const parsed = escalateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data
    const company = await resolveCompanyForProject({
      projectId: data.projectId,
      projectName: data.projectName,
      brandName: data.brandName,
      supportEmail: data.supportEmail,
    })

    const bot = await getOrCreateIntegrationBot()
    const title = data.subject.startsWith(`[${data.dashboardTicketNumber}]`)
      ? data.subject
      : `[${data.dashboardTicketNumber}] ${data.subject}`

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description: data.description,
        priority: mapPriority(data.priority),
        category: data.category || null,
        status: 'OPEN',
        companyId: company.id,
        createdById: bot.id,
      },
      include: {
        company: { select: { id: true, name: true, projectId: true, subdomain: true } },
      },
    })

    NotificationService.notifyAdminTicketCreated(ticket.id).catch(() => {})
    ActivityService.created(ticket.id, bot.id, ticket.title).catch(() => {})

    return NextResponse.json(
      {
        success: true,
        ticket: {
          id: ticket.id,
          title: ticket.title,
          url: adminTicketUrl(request, ticket.id),
        },
        company: ticket.company,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[DashboardIntegration] escalate failed:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
