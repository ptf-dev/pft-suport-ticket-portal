import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * Company Creation API Endpoint
 * Requirements: 3.2, 3.3
 * 
 * POST /api/admin/companies
 * - Admin-only access
 * - Validates required fields (name, contactEmail, subdomain)
 * - Validates subdomain uniqueness
 * - Creates company record
 */

// Validation schema
const createCompanySchema = z.object({
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

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = createCompanySchema.safeParse(body)
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

    // Check subdomain uniqueness
    const existingCompany = await prisma.company.findUnique({
      where: { subdomain: data.subdomain },
    })

    if (existingCompany) {
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

    // Create company
    const company = await prisma.company.create({
      data: {
        name: data.name,
        contactEmail: data.contactEmail,
        subdomain: data.subdomain,
        whatsappLink: data.whatsappLink || null,
        notes: data.notes || null,
      },
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    
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
