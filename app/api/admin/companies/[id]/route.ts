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
const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
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
