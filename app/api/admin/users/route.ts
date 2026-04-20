import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcrypt'

/**
 * User Management API Endpoints
 * 
 * GET /api/admin/users
 * - Admin-only access
 * - Returns list of all users
 * 
 * POST /api/admin/users
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6
 * - Admin-only access
 * - Validates required fields (name, email, password, role)
 * - Validates email uniqueness
 * - Validates CLIENT users have companyId
 * - Hashes passwords with bcrypt
 * - Creates user record
 */

// Validation schema
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'CLIENT'], {
    message: 'Role must be either ADMIN or CLIENT',
  }),
  companyId: z.string().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    // Fetch all users with basic information
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        companyId: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(users, { status: 200 })
  } catch (error) {
    console.error('Error fetching users:', error)
    
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

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = createUserSchema.safeParse(body)
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

    // Validate CLIENT users have companyId
    if (data.role === 'CLIENT' && !data.companyId) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: {
            companyId: ['Company is required for CLIENT users'],
          },
        },
        { status: 400 }
      )
    }

    // Validate ADMIN users don't have companyId
    if (data.role === 'ADMIN' && data.companyId) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: {
            companyId: ['ADMIN users cannot be associated with a company'],
          },
        },
        { status: 400 }
      )
    }

    // Check email uniqueness
    // Note: The schema has a composite unique constraint on [email, companyId]
    // So we need to check for the specific combination
    const companyIdForCheck = data.role === 'CLIENT' ? data.companyId : null
    
    const existingUser = await prisma.user.findFirst({
      where: {
        email: data.email,
        companyId: companyIdForCheck,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: {
            email: ['This email address is already in use'],
          },
        },
        { status: 400 }
      )
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        companyId: data.role === 'CLIENT' ? data.companyId : null,
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
      },
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    
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
