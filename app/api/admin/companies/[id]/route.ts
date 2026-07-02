import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * Company Update API Endpoint
 * Requirements: 3.4
 * 
 * PUT /api/admin/companies/[id]
 * - Admin-only access
 * - Validates required fields (name, contactEmail, subdomain)
 * - Validates subdomain uniqueness when changed
 * - Updates company record and returns updated data
 */

// Validation schema
const projectIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+$/, 'Project ID must contain only lowercase letters, numbers, and hyphens')
  .optional()
  .or(z.literal(''))

const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  projectId: projectIdSchema,
  contactEmail: z.string().email('Valid email address is required'),
  subdomain: z.string()
    .min(1, 'Subdomain is required')
    .regex(/^[a-z0-9-]+$/, 'Subdomain must contain only lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Subdomain must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Subdomain must end with a letter or number'),
  whatsappLink: z.string().optional(),
  notes: z.string().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    await requireAdmin()

    const companyId = params.id

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = updateCompanySchema.safeParse(body)
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
    const projectId = data.projectId?.trim() || null

    if (projectId && projectId !== existingCompany.projectId) {
      const existingByProject = await prisma.company.findUnique({
        where: { projectId },
      })
      if (existingByProject && existingByProject.id !== companyId) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: { projectId: ['This Super-Admin project ID is already linked to another company'] },
          },
          { status: 400 }
        )
      }
    }

    // Check subdomain uniqueness if subdomain is being changed
    if (data.subdomain !== existingCompany.subdomain) {
      const subdomainConflict = await prisma.company.findUnique({
        where: { subdomain: data.subdomain },
      })

      if (subdomainConflict) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: {
              subdomain: ['This subdomain is already in use'],
            },
          },
          { status: 400 }
        )
      }
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        name: data.name,
        projectId,
        contactEmail: data.contactEmail,
        subdomain: data.subdomain,
        whatsappLink: data.whatsappLink || null,
        notes: data.notes || null,
      },
    })

    return NextResponse.json(updatedCompany, { status: 200 })
  } catch (error) {
    console.error('Error updating company:', error)

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * Delete a company. If it still has tickets or users, a `reassignTo` company id
 * is required — its tickets, users, and notification logs are moved there first
 * (per-company notification settings/email templates are dropped). Deleting a
 * company with no tickets/users needs no reassignment.
 * Body: { reassignTo?: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const companyId = params.id

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { _count: { select: { tickets: true, users: true } } },
    })
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const reassignTo: string | undefined = typeof body?.reassignTo === 'string' ? body.reassignTo : undefined
    const hasData = company._count.tickets > 0 || company._count.users > 0

    if (hasData && !reassignTo) {
      return NextResponse.json(
        { error: `Company has ${company._count.tickets} ticket(s) and ${company._count.users} user(s). Choose a company to reassign them to before deleting.` },
        { status: 400 }
      )
    }

    if (reassignTo) {
      if (reassignTo === companyId) {
        return NextResponse.json({ error: 'Cannot reassign to the same company' }, { status: 400 })
      }
      const target = await prisma.company.findUnique({ where: { id: reassignTo }, select: { id: true } })
      if (!target) {
        return NextResponse.json({ error: 'Reassign target company not found' }, { status: 400 })
      }
    }

    await prisma.$transaction([
      ...(reassignTo
        ? [
            prisma.ticket.updateMany({ where: { companyId }, data: { companyId: reassignTo } }),
            prisma.user.updateMany({ where: { companyId }, data: { companyId: reassignTo } }),
            prisma.notificationLog.updateMany({ where: { companyId }, data: { companyId: reassignTo } }),
          ]
        : [prisma.notificationLog.deleteMany({ where: { companyId } })]),
      prisma.notificationSettings.deleteMany({ where: { companyId } }),
      prisma.emailTemplate.deleteMany({ where: { companyId } }),
      prisma.company.delete({ where: { id: companyId } }),
    ])

    return NextResponse.json({ ok: true, reassignedTo: reassignTo ?? null })
  } catch (error) {
    console.error('Error deleting company:', error)
    if (error instanceof Error && error.message.includes('Admin access required')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
