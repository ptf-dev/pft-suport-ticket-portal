import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * User Email Update API Endpoint
 * 
 * PATCH /api/admin/users/[id]/email
 * - Admin-only access
 * - Updates user email address
 * - Validates email format and uniqueness
 * - Performs database migration to update the email
 */

const updateEmailSchema = z.object({
  email: z.string().email('Valid email address is required'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require admin authentication
    await requireAdmin()

    const userId = params.id

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        companyId: true,
        role: true,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateEmailSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Check if email is the same as current
    if (email === existingUser.email) {
      return NextResponse.json(
        { error: 'New email must be different from current email' },
        { status: 400 }
      )
    }

    // Check email uniqueness within the same company context
    // The schema has a composite unique constraint on [email, companyId]
    const duplicateUser = await prisma.user.findFirst({
      where: {
        email: email,
        companyId: existingUser.companyId,
        id: { not: userId }, // Exclude current user
      },
    })

    if (duplicateUser) {
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

    // Perform database migration - update the email
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: email,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(
      {
        message: 'Email updated successfully',
        user: updatedUser,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating user email:', error)

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Handle Prisma unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
