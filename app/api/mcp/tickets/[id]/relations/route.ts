import { NextRequest, NextResponse } from 'next/server'
import { RELATION_TYPES } from '@/lib/relations'
import { NotFoundError, addRelation, listRelations } from '@/lib/mcp/operations'

/**
 * MCP API: Get Ticket Relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.MCP_API_KEY
    
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    return NextResponse.json(await listRelations(params.id))
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    console.error('MCP API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * MCP API: Add Ticket Relation
 * Also creates the inverse relation automatically.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    const validApiKey = process.env.MCP_API_KEY
    
    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { targetTicketId, relationType } = body

    if (!targetTicketId || typeof targetTicketId !== 'string') {
      return NextResponse.json(
        { error: 'targetTicketId is required' },
        { status: 400 }
      )
    }

    if (!relationType || !RELATION_TYPES.includes(relationType)) {
      return NextResponse.json(
        { error: `Invalid relationType. Must be one of: ${RELATION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (params.id === targetTicketId) {
      return NextResponse.json(
        { error: 'Cannot create a relation to the same ticket' },
        { status: 400 }
      )
    }

    const response = await addRelation(params.id, { targetTicketId, relationType })

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { error: error.resource === 'targetTicket' ? 'Target ticket not found' : 'Source ticket not found' },
        { status: 404 }
      )
    }

    console.error('MCP API Error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This relation already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
