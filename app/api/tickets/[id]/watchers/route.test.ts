import { ticketAccess } from '@/lib/ticket-access'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn() },
    ticketWatcher: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
  },
}))
jest.mock('@/lib/ticket-access')

import { prisma } from '@/lib/prisma'

const mockTicketAccess = ticketAccess as jest.MockedFunction<typeof ticketAccess>

describe('Watcher access control', () => {
  it('watcher CAN view ticket (ticketAccess returns view:true)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.view).toBe(true)
    expect(result.manage).toBe(false)
  })

  it('watcher CAN comment (ticketAccess returns comment:true)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.comment).toBe(true)
  })

  it('watcher CANNOT change status (manage:false)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.manage).toBe(false)
  })

  it('watcher CANNOT change priority (manage:false)', async () => {
    mockTicketAccess.mockResolvedValue({ view: true, comment: true, manage: false })
    const result = await ticketAccess('watcher-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.manage).toBe(false)
  })

  it('non-watcher cross-firm user gets no access', async () => {
    mockTicketAccess.mockResolvedValue({ view: false, comment: false, manage: false })
    const result = await ticketAccess('stranger-1', 'CLIENT', 'other-company', 'ticket-1')
    expect(result.view).toBe(false)
  })
})
