import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { TenantScopedPrisma, createTenantDb } from './tenant-db'
import { prisma } from './prisma'

// Mock the prisma client
jest.mock('./prisma', () => ({
  prisma: {
    ticket: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    ticketComment: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    ticketImage: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe('TenantScopedPrisma', () => {
  const TENANT_ID = 'company-123'
  const OTHER_TENANT_ID = 'company-456'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Ticket Operations', () => {
    describe('Client User (Non-Admin)', () => {
      it('should filter findMany by companyId', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockTickets = [{ id: '1', companyId: TENANT_ID }]
        ;(prisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets)

        await db.tickets.findMany({ where: { status: 'OPEN' } })

        expect(prisma.ticket.findMany).toHaveBeenCalledWith({
          where: {
            status: 'OPEN',
            companyId: TENANT_ID,
          },
        })
      })

      it('should filter findUnique by companyId using findFirst', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockTicket = { id: '1', companyId: TENANT_ID }
        ;(prisma.ticket.findFirst as jest.Mock).mockResolvedValue(mockTicket)

        await db.tickets.findUnique({ where: { id: '1' } })

        expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
          where: {
            id: '1',
            companyId: TENANT_ID,
          },
        })
      })

      it('should filter findFirst by companyId', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockTicket = { id: '1', companyId: TENANT_ID }
        ;(prisma.ticket.findFirst as jest.Mock).mockResolvedValue(mockTicket)

        await db.tickets.findFirst({ where: { status: 'OPEN' } })

        expect(prisma.ticket.findFirst).toHaveBeenCalledWith({
          where: {
            status: 'OPEN',
            companyId: TENANT_ID,
          },
        })
      })

      it('should automatically set companyId on create', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockTicket = { id: '1', companyId: TENANT_ID, title: 'Test' }
        ;(prisma.ticket.create as jest.Mock).mockResolvedValue(mockTicket)

        await db.tickets.create({
          data: {
            title: 'Test',
            description: 'Test description',
            createdById: 'user-1',
          },
        })

        expect(prisma.ticket.create).toHaveBeenCalledWith({
          data: {
            title: 'Test',
            description: 'Test description',
            createdById: 'user-1',
            companyId: TENANT_ID,
          },
        })
      })

      it('should filter count by companyId', async () => {
        const db = createTenantDb(TENANT_ID, false)
        ;(prisma.ticket.count as jest.Mock).mockResolvedValue(5)

        await db.tickets.count({ where: { status: 'OPEN' } })

        expect(prisma.ticket.count).toHaveBeenCalledWith({
          where: {
            status: 'OPEN',
            companyId: TENANT_ID,
          },
        })
      })

      it('should prevent access to tickets from other tenants', async () => {
        const db = createTenantDb(TENANT_ID, false)
        ;(prisma.ticket.findMany as jest.Mock).mockResolvedValue([])

        const result = await db.tickets.findMany({
          where: { companyId: OTHER_TENANT_ID },
        })

        // The query will have both companyId filters, effectively making it impossible
        expect(prisma.ticket.findMany).toHaveBeenCalledWith({
          where: {
            companyId: OTHER_TENANT_ID,
            companyId: TENANT_ID, // This will override the user's attempt
          },
        })
      })
    })

    describe('Admin User', () => {
      it('should not filter findMany when admin', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockTickets = [
          { id: '1', companyId: TENANT_ID },
          { id: '2', companyId: OTHER_TENANT_ID },
        ]
        ;(prisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets)

        await db.tickets.findMany({ where: { status: 'OPEN' } })

        expect(prisma.ticket.findMany).toHaveBeenCalledWith({
          where: { status: 'OPEN' },
        })
      })

      it('should not filter findUnique when admin', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockTicket = { id: '1', companyId: OTHER_TENANT_ID }
        ;(prisma.ticket.findUnique as jest.Mock).mockResolvedValue(mockTicket)

        await db.tickets.findUnique({ where: { id: '1' } })

        expect(prisma.ticket.findUnique).toHaveBeenCalledWith({
          where: { id: '1' },
        })
      })

      it('should allow admin to access tickets from any tenant', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockTickets = [{ id: '1', companyId: OTHER_TENANT_ID }]
        ;(prisma.ticket.findMany as jest.Mock).mockResolvedValue(mockTickets)

        await db.tickets.findMany({ where: { companyId: OTHER_TENANT_ID } })

        expect(prisma.ticket.findMany).toHaveBeenCalledWith({
          where: { companyId: OTHER_TENANT_ID },
        })
      })

      it('should still set companyId on create even for admin', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockTicket = { id: '1', companyId: TENANT_ID, title: 'Test' }
        ;(prisma.ticket.create as jest.Mock).mockResolvedValue(mockTicket)

        await db.tickets.create({
          data: {
            title: 'Test',
            description: 'Test description',
            createdById: 'user-1',
          },
        })

        expect(prisma.ticket.create).toHaveBeenCalledWith({
          data: {
            title: 'Test',
            description: 'Test description',
            createdById: 'user-1',
            companyId: TENANT_ID,
          },
        })
      })
    })
  })

  describe('User Operations', () => {
    describe('Client User (Non-Admin)', () => {
      it('should filter findMany by companyId', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockUsers = [{ id: '1', companyId: TENANT_ID }]
        ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers)

        await db.users.findMany({ where: { role: 'CLIENT' } })

        expect(prisma.user.findMany).toHaveBeenCalledWith({
          where: {
            role: 'CLIENT',
            companyId: TENANT_ID,
          },
        })
      })

      it('should automatically set companyId on create', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockUser = { id: '1', companyId: TENANT_ID, email: 'test@example.com' }
        ;(prisma.user.create as jest.Mock).mockResolvedValue(mockUser)

        await db.users.create({
          data: {
            name: 'Test User',
            email: 'test@example.com',
            password: 'hashed',
            role: 'CLIENT',
          },
        })

        expect(prisma.user.create).toHaveBeenCalledWith({
          data: {
            name: 'Test User',
            email: 'test@example.com',
            password: 'hashed',
            role: 'CLIENT',
            companyId: TENANT_ID,
          },
        })
      })
    })

    describe('Admin User', () => {
      it('should not filter findMany when admin', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockUsers = [
          { id: '1', companyId: TENANT_ID },
          { id: '2', companyId: OTHER_TENANT_ID },
        ]
        ;(prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers)

        await db.users.findMany()

        expect(prisma.user.findMany).toHaveBeenCalledWith(undefined)
      })
    })
  })

  describe('TicketComment Operations', () => {
    describe('Client User (Non-Admin)', () => {
      it('should filter findMany by ticket companyId', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockComments = [{ id: '1', ticketId: 'ticket-1' }]
        ;(prisma.ticketComment.findMany as jest.Mock).mockResolvedValue(mockComments)

        await db.ticketComments.findMany({ where: { ticketId: 'ticket-1' } })

        expect(prisma.ticketComment.findMany).toHaveBeenCalledWith({
          where: {
            ticketId: 'ticket-1',
            ticket: {
              companyId: TENANT_ID,
            },
          },
        })
      })

      it('should filter count by ticket companyId', async () => {
        const db = createTenantDb(TENANT_ID, false)
        ;(prisma.ticketComment.count as jest.Mock).mockResolvedValue(3)

        await db.ticketComments.count({ where: { ticketId: 'ticket-1' } })

        expect(prisma.ticketComment.count).toHaveBeenCalledWith({
          where: {
            ticketId: 'ticket-1',
            ticket: {
              companyId: TENANT_ID,
            },
          },
        })
      })
    })

    describe('Admin User', () => {
      it('should not filter findMany when admin', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockComments = [{ id: '1', ticketId: 'ticket-1' }]
        ;(prisma.ticketComment.findMany as jest.Mock).mockResolvedValue(mockComments)

        await db.ticketComments.findMany({ where: { ticketId: 'ticket-1' } })

        expect(prisma.ticketComment.findMany).toHaveBeenCalledWith({
          where: { ticketId: 'ticket-1' },
        })
      })
    })
  })

  describe('Company Operations', () => {
    describe('Client User (Non-Admin)', () => {
      it('should only allow access to own company', async () => {
        const db = createTenantDb(TENANT_ID, false)
        const mockCompanies = [{ id: TENANT_ID, name: 'My Company' }]
        ;(prisma.company.findMany as jest.Mock).mockResolvedValue(mockCompanies)

        await db.companies.findMany()

        expect(prisma.company.findMany).toHaveBeenCalledWith({
          where: {
            id: TENANT_ID,
          },
        })
      })

      it('should throw error when client tries to create company', () => {
        const db = createTenantDb(TENANT_ID, false)

        expect(() => {
          db.companies.create({
            data: {
              name: 'New Company',
              subdomain: 'new',
              contactEmail: 'test@example.com',
            },
          })
        }).toThrow('Only admins can create companies')
      })

      it('should throw error when client tries to update company', () => {
        const db = createTenantDb(TENANT_ID, false)

        expect(() => {
          db.companies.update({
            where: { id: TENANT_ID },
            data: { name: 'Updated Name' },
          })
        }).toThrow('Only admins can update companies')
      })
    })

    describe('Admin User', () => {
      it('should allow admin to access all companies', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockCompanies = [
          { id: TENANT_ID, name: 'Company 1' },
          { id: OTHER_TENANT_ID, name: 'Company 2' },
        ]
        ;(prisma.company.findMany as jest.Mock).mockResolvedValue(mockCompanies)

        await db.companies.findMany()

        expect(prisma.company.findMany).toHaveBeenCalledWith(undefined)
      })

      it('should allow admin to create companies', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockCompany = { id: 'new-id', name: 'New Company' }
        ;(prisma.company.create as jest.Mock).mockResolvedValue(mockCompany)

        await db.companies.create({
          data: {
            name: 'New Company',
            subdomain: 'new',
            contactEmail: 'test@example.com',
          },
        })

        expect(prisma.company.create).toHaveBeenCalled()
      })

      it('should allow admin to update companies', async () => {
        const db = createTenantDb(TENANT_ID, true)
        const mockCompany = { id: TENANT_ID, name: 'Updated Name' }
        ;(prisma.company.update as jest.Mock).mockResolvedValue(mockCompany)

        await db.companies.update({
          where: { id: TENANT_ID },
          data: { name: 'Updated Name' },
        })

        expect(prisma.company.update).toHaveBeenCalled()
      })
    })
  })

  describe('Raw Database Access', () => {
    it('should throw error when non-admin tries to access raw client', () => {
      const db = createTenantDb(TENANT_ID, false)

      expect(() => db.raw).toThrow('Raw database access is only available for admin users')
    })

    it('should allow admin to access raw client', () => {
      const db = createTenantDb(TENANT_ID, true)

      expect(db.raw).toBe(prisma)
    })
  })

  describe('Factory Function', () => {
    it('should create TenantScopedPrisma instance with correct parameters', () => {
      const db = createTenantDb(TENANT_ID, false)

      expect(db).toBeInstanceOf(TenantScopedPrisma)
    })

    it('should default isAdmin to false', () => {
      const db = createTenantDb(TENANT_ID)

      // Verify by checking that raw access throws
      expect(() => db.raw).toThrow('Raw database access is only available for admin users')
    })
  })
})
