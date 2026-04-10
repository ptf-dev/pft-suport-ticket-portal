import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Test endpoint to verify Prisma client connection
 * GET /api/test-db
 */
export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Try to count companies (will fail if migrations haven't run yet)
    try {
      const companyCount = await prisma.company.count()
      const userCount = await prisma.user.count()
      const ticketCount = await prisma.ticket.count()
      
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
        data: {
          companies: companyCount,
          users: userCount,
          tickets: ticketCount,
        },
      })
    } catch (error) {
      // Tables don't exist yet - migrations need to be run
      return NextResponse.json({
        success: true,
        message: 'Database connection successful, but tables not created yet',
        hint: 'Run: npm run db:migrate',
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
