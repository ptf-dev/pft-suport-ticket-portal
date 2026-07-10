import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GET as listTickets } from './route'
import { GET as searchTickets } from './search/route'
import { GET as getTicket } from './[id]/route'

// Regression guard: the MCP read endpoints must expose the ticket `key`
// (human key, unique per company/prop firm, e.g. FTM-042). It was previously
// dropped because each route hand-builds its JSON response.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as unknown as {
  ticket: { findMany: jest.Mock; findUnique: jest.Mock }
}

const API_KEY = 'test-mcp-key'
const authReq = (url: string) =>
  new NextRequest(url, { headers: { Authorization: `Bearer ${API_KEY}` } })

beforeEach(() => {
  jest.clearAllMocks()
  process.env.MCP_API_KEY = API_KEY
})

it('list route exposes ticket key', async () => {
  mockPrisma.ticket.findMany.mockResolvedValue([
    {
      id: 't1',
      key: 'FTM-042',
      title: 'Login broken',
      description: 'short desc',
      status: 'OPEN',
      priority: 'HIGH',
      category: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      company: { id: 'c1', name: 'FTMO' },
      createdBy: { id: 'u1', name: 'Alice' },
      assignedTo: null,
      _count: { comments: 0, images: 0 },
    },
  ] as any)

  const res = await listTickets(authReq('http://localhost/api/mcp/tickets'))
  const data = await res.json()

  expect(res.status).toBe(200)
  expect(data.tickets[0].key).toBe('FTM-042')
})

it('search route exposes ticket key', async () => {
  mockPrisma.ticket.findMany.mockResolvedValue([
    {
      id: 't1',
      key: 'FTM-042',
      title: 'Login broken',
      description: 'short desc',
      status: 'OPEN',
      priority: 'HIGH',
      updatedAt: new Date(),
      company: { name: 'FTMO' },
      createdBy: { name: 'Alice' },
      assignedTo: null,
      _count: { comments: 0 },
    },
  ] as any)

  const res = await searchTickets(authReq('http://localhost/api/mcp/tickets/search?q=login'))
  const data = await res.json()

  expect(res.status).toBe(200)
  expect(data.results[0].key).toBe('FTM-042')
})

it('detail route exposes ticket key', async () => {
  mockPrisma.ticket.findUnique.mockResolvedValue({
    id: 't1',
    key: 'FTM-042',
    title: 'Login broken',
    description: 'full desc',
    status: 'OPEN',
    priority: 'HIGH',
    category: null,
    assignedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    company: { id: 'c1', name: 'FTMO' },
    createdBy: { id: 'u1', name: 'Alice', email: 'a@x.com' },
    assignedTo: null,
    comments: [],
    images: [],
  } as any)

  const res = await getTicket(authReq('http://localhost/api/mcp/tickets/t1'), {
    params: { id: 't1' },
  })
  const data = await res.json()

  expect(res.status).toBe(200)
  expect(data.ticket.key).toBe('FTM-042')
})
