import { ticketAccess } from './ticket-access'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn() },
    ticketWatcher: { findUnique: jest.fn() },
  },
}))

const mockTicketFind = prisma.ticket.findUnique as jest.MockedFunction<typeof prisma.ticket.findUnique>
const mockWatcherFind = prisma.ticketWatcher.findUnique as jest.MockedFunction<typeof prisma.ticketWatcher.findUnique>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('ticketAccess', () => {
  const ticketId = 'ticket-1'
  const ticket = { companyId: 'company-a' }

  it('admin gets full access', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    const result = await ticketAccess('admin-1', 'ADMIN', null, ticketId)
    expect(result).toEqual({ view: true, comment: true, manage: true })
    expect(mockWatcherFind).not.toHaveBeenCalled()
  })

  it('owner-firm client gets full access', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    const result = await ticketAccess('client-1', 'CLIENT', 'company-a', ticketId)
    expect(result).toEqual({ view: true, comment: true, manage: true })
    expect(mockWatcherFind).not.toHaveBeenCalled()
  })

  it('watcher gets view+comment, not manage', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    mockWatcherFind.mockResolvedValue({ id: 'w-1' } as any)
    const result = await ticketAccess('client-2', 'CLIENT', 'company-b', ticketId)
    expect(result).toEqual({ view: true, comment: true, manage: false })
  })

  it('non-watcher cross-firm client gets nothing', async () => {
    mockTicketFind.mockResolvedValue(ticket as any)
    mockWatcherFind.mockResolvedValue(null)
    const result = await ticketAccess('client-3', 'CLIENT', 'company-c', ticketId)
    expect(result).toEqual({ view: false, comment: false, manage: false })
  })

  it('returns no access when ticket not found', async () => {
    mockTicketFind.mockResolvedValue(null)
    const result = await ticketAccess('client-1', 'CLIENT', 'company-a', ticketId)
    expect(result).toEqual({ view: false, comment: false, manage: false })
  })

  it('deleted ticket returns no access', async () => {
    mockTicketFind.mockResolvedValue({ companyId: 'company-a', isDeleted: true } as any)
    const result = await ticketAccess('client-1', 'CLIENT', 'company-a', ticketId)
    expect(result).toEqual({ view: false, comment: false, manage: false })
  })
})
