import { prisma } from '@/lib/prisma'
import { NotFoundError, createTicket, getTicket } from './operations'

// These operations are the shared ticket layer behind both the /api/mcp REST
// routes and the MCP protocol endpoint, so the contract is pinned here rather
// than once per transport.
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: {
      findUnique: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as unknown as {
  ticket: { findUnique: jest.Mock }
  company: { findUnique: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('returns the ticket key so callers can show FTM-042', async () => {
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

  const t = await getTicket('t1')

  expect(t).toMatchObject({ ticket: { id: 't1', key: 'FTM-042' } })
})

it('throws NotFoundError when the ticket does not exist', async () => {
  mockPrisma.ticket.findUnique.mockResolvedValue(null)

  await expect(getTicket('nope')).rejects.toBeInstanceOf(NotFoundError)
})

it('throws NotFoundError when creating against an unknown company', async () => {
  mockPrisma.company.findUnique.mockResolvedValue(null)

  await expect(createTicket({ title: 'a', description: 'b', companyId: 'nope' }))
    .rejects.toBeInstanceOf(NotFoundError)
})
