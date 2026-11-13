import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { RELATION_TYPES } from '@/lib/relations'
import { GET as listRoute } from './tickets/route'
import { GET as searchRoute } from './tickets/search/route'
import { GET as detailRoute } from './tickets/[id]/route'
import { POST as createRoute } from './tickets/create/route'
import { GET as commentsRoute, POST as addCommentRoute } from './tickets/[id]/comments/route'
import { PATCH as statusRoute } from './tickets/[id]/status/route'
import { GET as relationsRoute, POST as addRelationRoute } from './tickets/[id]/relations/route'
import { GET as companiesRoute } from './companies/route'

// The HTTP contract of /api/mcp/*, which temp/mcp-remote.mjs and the WhatsApp
// bot depend on in production. lib/mcp/operations.test.ts pins the response
// bodies; this file pins what belongs to the transport — the bearer-key check,
// the validation status codes, the 404 bodies each route maps NotFoundError
// onto, and the absolute image origin taken from the request headers.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ticketComment: { findMany: jest.fn(), create: jest.fn() },
    ticketRelation: { findMany: jest.fn(), create: jest.fn() },
    company: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/services/activity', () => ({
  ActivityService: {
    commented: jest.fn(() => Promise.resolve()),
    statusChanged: jest.fn(() => Promise.resolve()),
  },
}))
jest.mock('@/lib/services/whatsapp-notify', () => ({
  notifyTicketNewComment: jest.fn(() => Promise.resolve()),
}))
jest.mock('@/lib/auto-sprint', () => ({ autoSprintIdForPriority: jest.fn(() => Promise.resolve(null)) }))
jest.mock('@/lib/ticket-key', () => ({ uniqueTicketKey: jest.fn(() => Promise.resolve('FTM-042')) }))

const db = prisma as unknown as Record<string, any>

const API_KEY = 'test-mcp-key'
const ctx = { params: { id: 't1' } }
const UNAUTHORIZED = { error: 'Unauthorized - Invalid API key' }

const get = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, {
    headers: { Authorization: `Bearer ${API_KEY}`, host: 'portal.test', 'x-forwarded-proto': 'https', ...headers },
  })

const send = (method: string, url: string, body: unknown) =>
  new NextRequest(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      host: 'portal.test',
      'x-forwarded-proto': 'https',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

/** Every handler, named so the auth cases can run against all ten. */
const HANDLER_NAMES = [
  'GET /tickets',
  'GET /tickets/search',
  'GET /tickets/[id]',
  'POST /tickets/create',
  'GET /tickets/[id]/comments',
  'POST /tickets/[id]/comments',
  'PATCH /tickets/[id]/status',
  'GET /tickets/[id]/relations',
  'POST /tickets/[id]/relations',
  'GET /companies',
]

beforeEach(() => {
  jest.clearAllMocks()
  process.env.MCP_API_KEY = API_KEY
})

describe('auth', () => {
  it.each(HANDLER_NAMES)('%s rejects a request with no Authorization header', async (name) => {
    const res = await dispatch(name)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(UNAUTHORIZED)
  })

  it.each(HANDLER_NAMES)('%s rejects a wrong key', async (name) => {
    const res = await dispatch(name, 'Bearer wrong-key')

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(UNAUTHORIZED)
  })

  it.each(HANDLER_NAMES)('%s rejects every key when MCP_API_KEY is unset', async (name) => {
    delete process.env.MCP_API_KEY

    const res = await dispatch(name, `Bearer ${API_KEY}`)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual(UNAUTHORIZED)
  })

  it('does not touch the database when rejecting', async () => {
    const res = await dispatch('GET /tickets')

    expect(res.status).toBe(401)
    expect(db.ticket.findMany).not.toHaveBeenCalled()
  })
})

/** Re-dispatches a named handler with a given (or absent) Authorization header. */
async function dispatch(name: string, auth?: string): Promise<Response> {
  const headers: Record<string, string> = { host: 'portal.test', 'content-type': 'application/json' }
  if (auth) headers.Authorization = auth

  const req = (url: string, method = 'GET', body?: unknown) =>
    new NextRequest(url, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })

  switch (name) {
    case 'GET /tickets':
      return listRoute(req('http://h/api/mcp/tickets')) as any
    case 'GET /tickets/search':
      return searchRoute(req('http://h/api/mcp/tickets/search?q=x')) as any
    case 'GET /tickets/[id]':
      return detailRoute(req('http://h/api/mcp/tickets/t1'), ctx) as any
    case 'POST /tickets/create':
      return createRoute(req('http://h/api/mcp/tickets/create', 'POST', { title: 'T' })) as any
    case 'GET /tickets/[id]/comments':
      return commentsRoute(req('http://h/api/mcp/tickets/t1/comments'), ctx) as any
    case 'POST /tickets/[id]/comments':
      return addCommentRoute(req('http://h/api/mcp/tickets/t1/comments', 'POST', { content: 'c' }), ctx) as any
    case 'PATCH /tickets/[id]/status':
      return statusRoute(req('http://h/api/mcp/tickets/t1/status', 'PATCH', { status: 'OPEN' }), ctx) as any
    case 'GET /tickets/[id]/relations':
      return relationsRoute(req('http://h/api/mcp/tickets/t1/relations'), ctx) as any
    case 'POST /tickets/[id]/relations':
      return addRelationRoute(req('http://h/api/mcp/tickets/t1/relations', 'POST', { targetTicketId: 't2', relationType: 'BLOCKS' }), ctx) as any
    case 'GET /companies':
      return companiesRoute(req('http://h/api/mcp/companies')) as any
    default:
      throw new Error(`unknown handler ${name}`)
  }
}

describe('GET /tickets', () => {
  it('passes the querystring filters through and echoes them back', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res = await listRoute(
      get('http://h/api/mcp/tickets?status=OPEN&priority=HIGH&companyId=c1&assignedTo=unassigned&limit=7')
    )

    expect(res.status).toBe(200)
    expect((await res.json()).filters).toEqual({
      status: 'OPEN',
      priority: 'HIGH',
      companyId: 'c1',
      assignedTo: 'unassigned',
      limit: 7,
    })
    expect(db.ticket.findMany.mock.calls[0][0].take).toBe(7)
  })

  it('reports absent filters as null rather than dropping the keys', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res = await listRoute(get('http://h/api/mcp/tickets'))
    const body = await res.json()

    expect(Object.keys(body.filters).sort()).toEqual([
      'assignedTo', 'companyId', 'limit', 'priority', 'status',
    ])
    expect(body.filters.status).toBeNull()
  })

  it('clamps an oversized limit to 100', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res = await listRoute(get('http://h/api/mcp/tickets?limit=5000'))

    expect((await res.json()).filters.limit).toBe(100)
  })

  it('serialises an unparseable limit as null, as it always has', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res = await listRoute(get('http://h/api/mcp/tickets?limit=abc'))

    // parseInt('abc') is NaN, which JSON renders as null. Preserved behaviour.
    expect((await res.json()).filters.limit).toBeNull()
  })
})

describe('GET /tickets/search', () => {
  it('requires the q parameter', async () => {
    const res = await searchRoute(get('http://h/api/mcp/tickets/search'))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Query parameter "q" is required' })
    expect(db.ticket.findMany).not.toHaveBeenCalled()
  })

  it('answers 200 and applies the limit', async () => {
    db.ticket.findMany.mockResolvedValue([])

    const res = await searchRoute(get('http://h/api/mcp/tickets/search?q=login&limit=4'))

    expect(res.status).toBe(200)
    expect(db.ticket.findMany.mock.calls[0][0].take).toBe(4)
  })
})

describe('GET /tickets/[id]', () => {
  const row = {
    id: 't1', key: 'FTM-042', title: 'T', description: 'D', status: 'OPEN', priority: 'HIGH',
    category: null, assignedAt: null, createdAt: new Date(0), updatedAt: new Date(0), isDeleted: false,
    company: { id: 'c1', name: 'FTMO' },
    createdBy: { id: 'u1', name: 'Alice', email: 'a@x.com' },
    assignedTo: null,
    comments: [],
    images: [{ id: 'i1', url: '/up/b.png', filename: 'b.png' }],
  }

  it('builds absolute image URLs from the forwarded proto and host', async () => {
    db.ticket.findUnique.mockResolvedValue(row)

    const res = await detailRoute(get('http://h/api/mcp/tickets/t1'), ctx)

    expect(res.status).toBe(200)
    expect((await res.json()).ticket.images[0].url).toBe('https://portal.test/up/b.png')
  })

  it('falls back to https and localhost:3000 when the headers are absent', async () => {
    db.ticket.findUnique.mockResolvedValue(row)

    const bare = new NextRequest('http://h/api/mcp/tickets/t1', {
      headers: { Authorization: `Bearer ${API_KEY}` },
    })
    const res = await detailRoute(bare, ctx)

    expect((await res.json()).ticket.images[0].url).toBe('https://localhost:3000/up/b.png')
  })

  it('maps a missing ticket to its 404 body', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    const res = await detailRoute(get('http://h/api/mcp/tickets/t1'), ctx)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
  })
})

describe('POST /tickets/create', () => {
  beforeEach(() => {
    db.company.findUnique.mockResolvedValue({ id: 'c1', name: 'FTMO' })
    db.user.findFirst.mockResolvedValue({ id: 'bot1', name: 'PFT AI Agent (Bot)' })
    db.ticket.create.mockResolvedValue({
      id: 't9', title: 'T', description: 'D', status: 'OPEN', priority: 'MEDIUM',
      category: null, createdAt: new Date(0),
      company: { id: 'c1', name: 'FTMO' },
      createdBy: { id: 'bot1', name: 'PFT AI Agent (Bot)', email: 'bot@x' },
    })
  })

  it('answers 201 on success', async () => {
    const res = await createRoute(
      send('POST', 'http://h/api/mcp/tickets/create', { title: 'T', description: 'D', companyId: 'c1' })
    )

    expect(res.status).toBe(201)
    expect((await res.json()).success).toBe(true)
  })

  it.each([
    [{ description: 'D', companyId: 'c1' }, 'Title is required'],
    [{ title: '   ', description: 'D', companyId: 'c1' }, 'Title is required'],
    [{ title: 'T', companyId: 'c1' }, 'Description is required'],
    [{ title: 'T', description: '   ', companyId: 'c1' }, 'Description is required'],
    [{ title: 'T', description: 'D' }, 'companyId is required'],
  ])('rejects %j with 400', async (body, message) => {
    const res = await createRoute(send('POST', 'http://h/api/mcp/tickets/create', body))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: message })
    expect(db.ticket.create).not.toHaveBeenCalled()
  })

  it('maps an unknown company to its 404 body', async () => {
    db.company.findUnique.mockResolvedValue(null)

    const res = await createRoute(
      send('POST', 'http://h/api/mcp/tickets/create', { title: 'T', description: 'D', companyId: 'zz' })
    )

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Company not found' })
  })
})

describe('/tickets/[id]/comments', () => {
  it('GET builds absolute image URLs and answers 200', async () => {
    db.ticketComment.findMany.mockResolvedValue([
      {
        id: 'cm1', message: 'hi', internal: false, createdAt: new Date(0),
        author: { id: 'u1', name: 'Alice', email: 'a@x.com', role: 'ADMIN' },
        images: [{ id: 'i1', url: '/up/a.png', filename: 'a.png' }],
      },
    ])

    const res = await commentsRoute(get('http://h/api/mcp/tickets/t1/comments'), ctx)

    expect(res.status).toBe(200)
    expect((await res.json()).comments[0].images[0].url).toBe('https://portal.test/up/a.png')
  })

  it('GET answers 200 with an empty thread for an unknown ticket', async () => {
    // Preserved quirk: this GET never checks the ticket exists, so no 404.
    db.ticketComment.findMany.mockResolvedValue([])

    const res = await commentsRoute(get('http://h/api/mcp/tickets/nope/comments'), {
      params: { id: 'nope' },
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ticketId: 'nope', comments: [], count: 0 })
  })

  it('POST requires content', async () => {
    const res = await addCommentRoute(send('POST', 'http://h/api/mcp/tickets/t1/comments', {}), ctx)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Comment content is required' })
    expect(db.ticketComment.create).not.toHaveBeenCalled()
  })

  it('POST answers 200 on success', async () => {
    db.ticket.findUnique.mockResolvedValue({ id: 't1' })
    db.user.findFirst.mockResolvedValue({ id: 'bot1', name: 'PFT AI Agent (Bot)' })
    db.ticketComment.create.mockResolvedValue({
      id: 'cm9', message: 'c', internal: false, createdAt: new Date(0),
      author: { id: 'bot1', name: 'PFT AI Agent (Bot)', email: 'bot@x', role: 'ADMIN' },
    })

    const res = await addCommentRoute(send('POST', 'http://h/api/mcp/tickets/t1/comments', { content: 'c' }), ctx)

    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('POST maps a missing ticket to its 404 body', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    const res = await addCommentRoute(send('POST', 'http://h/api/mcp/tickets/t1/comments', { content: 'c' }), ctx)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
  })
})

describe('PATCH /tickets/[id]/status', () => {
  beforeEach(() => {
    db.ticket.findUnique.mockResolvedValue({ status: 'OPEN' })
    db.user.findFirst.mockResolvedValue(null)
    db.ticket.update.mockResolvedValue({
      id: 't1', title: 'T', status: 'RESOLVED', priority: 'HIGH', updatedAt: new Date(0),
      company: { name: 'FTMO' }, assignedTo: null,
    })
  })

  it('lists the Prisma TicketStatus values in its 400 message', async () => {
    const res = await statusRoute(send('PATCH', 'http://h/api/mcp/tickets/t1/status', { status: 'WAT' }), ctx)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Invalid status. Must be one of: OPEN, IN_PROGRESS, BLOCKED, WAITING_CLIENT, RESOLVED, CLOSED',
    })
    expect(db.ticket.update).not.toHaveBeenCalled()
  })

  it('rejects an absent status the same way', async () => {
    const res = await statusRoute(send('PATCH', 'http://h/api/mcp/tickets/t1/status', {}), ctx)

    expect(res.status).toBe(400)
  })

  it.each(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'])(
    'accepts %s',
    async (status) => {
      const res = await statusRoute(send('PATCH', 'http://h/api/mcp/tickets/t1/status', { status }), ctx)

      expect(res.status).toBe(200)
    }
  )

  it('maps a missing ticket to its 404 body', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    const res = await statusRoute(send('PATCH', 'http://h/api/mcp/tickets/t1/status', { status: 'OPEN' }), ctx)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
  })

  it('maps a Prisma P2025 on the update to 404', async () => {
    // The ticket was deleted between the status read and the update.
    db.ticket.update.mockRejectedValue(Object.assign(new Error('gone'), { code: 'P2025' }))

    const res = await statusRoute(send('PATCH', 'http://h/api/mcp/tickets/t1/status', { status: 'OPEN' }), ctx)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
  })

  it('maps an unexpected failure to 500', async () => {
    db.ticket.update.mockRejectedValue(new Error('boom'))

    const res = await statusRoute(send('PATCH', 'http://h/api/mcp/tickets/t1/status', { status: 'OPEN' }), ctx)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
  })
})

describe('/tickets/[id]/relations', () => {
  beforeEach(() => {
    db.user.findFirst.mockResolvedValue(null)
  })

  it('GET answers 200', async () => {
    db.ticket.findUnique.mockResolvedValue({ id: 't1', title: 'T' })
    db.ticketRelation.findMany.mockResolvedValue([])

    const res = await relationsRoute(get('http://h/api/mcp/tickets/t1/relations'), ctx)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ticketId: 't1', ticketTitle: 'T', relations: [], count: 0,
    })
  })

  it('GET maps a missing ticket to its 404 body', async () => {
    db.ticket.findUnique.mockResolvedValue(null)

    const res = await relationsRoute(get('http://h/api/mcp/tickets/t1/relations'), ctx)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Ticket not found' })
  })

  it('POST answers 201 on success', async () => {
    db.ticket.findUnique.mockResolvedValue({ id: 'x', title: 'x' })
    db.$transaction.mockResolvedValue([
      {
        id: 'r9', relationType: 'BLOCKS', createdAt: new Date(0),
        sourceTicket: { id: 't1', title: 'A' }, targetTicket: { id: 't2', title: 'B' },
      },
    ])

    const res = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { targetTicketId: 't2', relationType: 'BLOCKS' }),
      ctx
    )

    expect(res.status).toBe(201)
    expect((await res.json()).success).toBe(true)
  })

  it('POST requires targetTicketId', async () => {
    const res = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { relationType: 'BLOCKS' }),
      ctx
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'targetTicketId is required' })
  })

  it('POST lists the shared relation types in its 400 message', async () => {
    const res = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { targetTicketId: 't2', relationType: 'NOPE' }),
      ctx
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: `Invalid relationType. Must be one of: ${RELATION_TYPES.join(', ')}`,
    })
  })

  it('POST refuses to relate a ticket to itself', async () => {
    const res = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { targetTicketId: 't1', relationType: 'BLOCKS' }),
      ctx
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Cannot create a relation to the same ticket' })
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('POST distinguishes a missing source from a missing target', async () => {
    db.ticket.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 't2', title: 'B' })

    const missingSource = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { targetTicketId: 't2', relationType: 'BLOCKS' }),
      ctx
    )

    expect(missingSource.status).toBe(404)
    expect(await missingSource.json()).toEqual({ error: 'Source ticket not found' })

    db.ticket.findUnique
      .mockResolvedValueOnce({ id: 't1', title: 'A' })
      .mockResolvedValueOnce(null)

    const missingTarget = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { targetTicketId: 'zz', relationType: 'BLOCKS' }),
      ctx
    )

    expect(missingTarget.status).toBe(404)
    expect(await missingTarget.json()).toEqual({ error: 'Target ticket not found' })
  })

  it('POST maps a Prisma P2002 to 409', async () => {
    db.ticket.findUnique.mockResolvedValue({ id: 'x', title: 'x' })
    db.$transaction.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }))

    const res = await addRelationRoute(
      send('POST', 'http://h/api/mcp/tickets/t1/relations', { targetTicketId: 't2', relationType: 'BLOCKS' }),
      ctx
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'This relation already exists' })
  })
})

describe('GET /companies', () => {
  it('answers 200 with the company list', async () => {
    db.company.findMany.mockResolvedValue([
      { id: 'c1', name: 'FTMO', _count: { tickets: 3, users: 4 } },
    ])

    const res = await companiesRoute(get('http://h/api/mcp/companies'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      companies: [{ id: 'c1', name: 'FTMO', ticketCount: 3, userCount: 4 }],
      count: 1,
    })
  })
})

describe('unexpected failures', () => {
  it('become 500 rather than leaking the error', async () => {
    db.ticket.findMany.mockRejectedValue(new Error('db down'))

    const res = await listRoute(get('http://h/api/mcp/tickets'))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
  })
})
