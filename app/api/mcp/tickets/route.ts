import { NextRequest, NextResponse } from 'next/server'
import { TicketStatus, TicketPriority } from '@prisma/client'
import { listTickets } from '@/lib/mcp/operations'

/**
 * MCP API: List Tickets
 * Returns a list of tickets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify API key
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.MCP_API_KEY
    
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams

    const response = await listTickets({
      status: searchParams.get('status') as TicketStatus | null,
      priority: searchParams.get('priority') as TicketPriority | null,
      companyId: searchParams.get('companyId'),
      assignedTo: searchParams.get('assignedTo'),
      limit: parseInt(searchParams.get('limit') || '20'),
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
