import { NextRequest, NextResponse } from 'next/server'
import { TicketStatus } from '@prisma/client'
import { NotFoundError, setStatus } from '@/lib/mcp/operations'

/**
 * MCP API: Update Ticket Status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = Object.values(TicketStatus)
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const response = await setStatus(params.id, status)

    return NextResponse.json(response)
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    console.error('MCP API Error:', error)
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
