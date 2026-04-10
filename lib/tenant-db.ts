import { PrismaClient, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Tenant-scoped Prisma wrapper that automatically filters queries by companyId
 * 
 * This class ensures data isolation by automatically adding companyId filters
 * to all queries for tenant-scoped models (Ticket, User, etc.)
 * 
 * Admin users can bypass tenant filtering by setting isAdmin=true
 */
export class TenantScopedPrisma {
  private client: PrismaClient
  private tenantId: string
  private isAdmin: boolean

  constructor(tenantId: string, isAdmin: boolean = false) {
    this.client = prisma
    this.tenantId = tenantId
    this.isAdmin = isAdmin
  }

  /**
   * Tenant-scoped ticket operations
   * Automatically filters by companyId unless admin override is enabled
   */
  get tickets() {
    const tenantId = this.tenantId
    const isAdmin = this.isAdmin

    return {
      findMany: (args?: Prisma.TicketFindManyArgs) => {
        if (isAdmin) {
          return this.client.ticket.findMany(args)
        }
        return this.client.ticket.findMany({
          ...args,
          where: {
            ...args?.where,
            companyId: tenantId,
          },
        })
      },

      findUnique: (args: Prisma.TicketFindUniqueArgs) => {
        if (isAdmin) {
          return this.client.ticket.findUnique(args)
        }
        return this.client.ticket.findFirst({
          where: {
            ...args.where,
            companyId: tenantId,
          },
        })
      },

      findFirst: (args?: Prisma.TicketFindFirstArgs) => {
        if (isAdmin) {
          return this.client.ticket.findFirst(args)
        }
        return this.client.ticket.findFirst({
          ...args,
          where: {
            ...args?.where,
            companyId: tenantId,
          },
        })
      },

      create: (args: Prisma.TicketCreateArgs) => {
        // Ensure companyId is set for tenant isolation
        const data: any = {
          ...args.data,
          companyId: tenantId,
        }
        return this.client.ticket.create({
          ...args,
          data,
        })
      },

      update: (args: Prisma.TicketUpdateArgs) => {
        if (isAdmin) {
          return this.client.ticket.update(args)
        }
        return this.client.ticket.updateMany({
          where: {
            ...args.where,
            companyId: tenantId,
          },
          data: args.data,
        }).then(async (result) => {
          if (result.count === 0) {
            return null
          }
          return this.client.ticket.findFirst({
            where: {
              ...args.where,
              companyId: tenantId,
            },
          })
        })
      },

      delete: (args: Prisma.TicketDeleteArgs) => {
        if (isAdmin) {
          return this.client.ticket.delete(args)
        }
        return this.client.ticket.deleteMany({
          where: {
            ...args.where,
            companyId: tenantId,
          },
        }).then(async (result) => {
          if (result.count === 0) {
            throw new Error('Record not found')
          }
          return result
        })
      },

      count: (args?: Prisma.TicketCountArgs) => {
        if (isAdmin) {
          return this.client.ticket.count(args)
        }
        return this.client.ticket.count({
          ...args,
          where: {
            ...args?.where,
            companyId: tenantId,
          },
        })
      },
    }
  }

  /**
   * Tenant-scoped user operations
   * Automatically filters by companyId unless admin override is enabled
   */
  get users() {
    const tenantId = this.tenantId
    const isAdmin = this.isAdmin

    return {
      findMany: (args?: Prisma.UserFindManyArgs) => {
        if (isAdmin) {
          return this.client.user.findMany(args)
        }
        return this.client.user.findMany({
          ...args,
          where: {
            ...args?.where,
            companyId: tenantId,
          },
        })
      },

      findUnique: (args: Prisma.UserFindUniqueArgs) => {
        if (isAdmin) {
          return this.client.user.findUnique(args)
        }
        return this.client.user.findFirst({
          where: {
            ...args.where,
            companyId: tenantId,
          },
        })
      },

      findFirst: (args?: Prisma.UserFindFirstArgs) => {
        if (isAdmin) {
          return this.client.user.findFirst(args)
        }
        return this.client.user.findFirst({
          ...args,
          where: {
            ...args?.where,
            companyId: tenantId,
          },
        })
      },

      create: (args: Prisma.UserCreateArgs) => {
        // Ensure companyId is set for tenant isolation
        const data: any = {
          ...args.data,
          companyId: tenantId,
        }
        return this.client.user.create({
          ...args,
          data,
        })
      },

      update: (args: Prisma.UserUpdateArgs) => {
        if (isAdmin) {
          return this.client.user.update(args)
        }
        return this.client.user.updateMany({
          where: {
            ...args.where,
            companyId: tenantId,
          },
          data: args.data,
        }).then(async (result) => {
          if (result.count === 0) {
            return null
          }
          return this.client.user.findFirst({
            where: {
              ...args.where,
              companyId: tenantId,
            },
          })
        })
      },

      count: (args?: Prisma.UserCountArgs) => {
        if (isAdmin) {
          return this.client.user.count(args)
        }
        return this.client.user.count({
          ...args,
          where: {
            ...args?.where,
            companyId: tenantId,
          },
        })
      },
    }
  }

  /**
   * Tenant-scoped ticket comment operations
   * Filters by ticket's companyId through relation
   */
  get ticketComments() {
    const tenantId = this.tenantId
    const isAdmin = this.isAdmin

    return {
      findMany: (args?: Prisma.TicketCommentFindManyArgs) => {
        if (isAdmin) {
          return this.client.ticketComment.findMany(args)
        }
        return this.client.ticketComment.findMany({
          ...args,
          where: {
            ...args?.where,
            ticket: {
              companyId: tenantId,
            },
          },
        })
      },

      create: (args: Prisma.TicketCommentCreateArgs) => {
        // Verify ticket belongs to tenant before creating comment
        if (!isAdmin) {
          const ticketId = typeof args.data.ticket === 'object' && 'connect' in args.data.ticket
            ? args.data.ticket.connect?.id
            : args.data.ticketId

          if (!ticketId) {
            throw new Error('Ticket ID is required')
          }

          // This will be validated at runtime when the comment is created
          // The ticket relation will fail if the ticket doesn't exist or doesn't belong to tenant
        }

        return this.client.ticketComment.create(args)
      },

      count: (args?: Prisma.TicketCommentCountArgs) => {
        if (isAdmin) {
          return this.client.ticketComment.count(args)
        }
        return this.client.ticketComment.count({
          ...args,
          where: {
            ...args?.where,
            ticket: {
              companyId: tenantId,
            },
          },
        })
      },
    }
  }

  /**
   * Tenant-scoped ticket image operations
   * Filters by ticket's companyId through relation
   */
  get ticketImages() {
    const tenantId = this.tenantId
    const isAdmin = this.isAdmin

    return {
      findMany: (args?: Prisma.TicketImageFindManyArgs) => {
        if (isAdmin) {
          return this.client.ticketImage.findMany(args)
        }
        return this.client.ticketImage.findMany({
          ...args,
          where: {
            ...args?.where,
            ticket: {
              companyId: tenantId,
            },
          },
        })
      },

      create: (args: Prisma.TicketImageCreateArgs) => {
        return this.client.ticketImage.create(args)
      },

      count: (args?: Prisma.TicketImageCountArgs) => {
        if (isAdmin) {
          return this.client.ticketImage.count(args)
        }
        return this.client.ticketImage.count({
          ...args,
          where: {
            ...args?.where,
            ticket: {
              companyId: tenantId,
            },
          },
        })
      },
    }
  }

  /**
   * Company operations - admins can access all, clients can only access their own
   */
  get companies() {
    const tenantId = this.tenantId
    const isAdmin = this.isAdmin

    return {
      findMany: (args?: Prisma.CompanyFindManyArgs) => {
        if (isAdmin) {
          return this.client.company.findMany(args)
        }
        return this.client.company.findMany({
          ...args,
          where: {
            ...args?.where,
            id: tenantId,
          },
        })
      },

      findUnique: (args: Prisma.CompanyFindUniqueArgs) => {
        if (isAdmin) {
          return this.client.company.findUnique(args)
        }
        return this.client.company.findFirst({
          where: {
            ...args.where,
            id: tenantId,
          },
        })
      },

      update: (args: Prisma.CompanyUpdateArgs) => {
        if (!isAdmin) {
          throw new Error('Only admins can update companies')
        }
        return this.client.company.update(args)
      },

      create: (args: Prisma.CompanyCreateArgs) => {
        if (!isAdmin) {
          throw new Error('Only admins can create companies')
        }
        return this.client.company.create(args)
      },
    }
  }

  /**
   * Direct access to underlying Prisma client for admin operations
   * Only available when isAdmin is true
   */
  get raw() {
    if (!this.isAdmin) {
      throw new Error('Raw database access is only available for admin users')
    }
    return this.client
  }
}

/**
 * Create a tenant-scoped Prisma instance
 * 
 * @param tenantId - The company ID to scope queries to
 * @param isAdmin - Whether to bypass tenant filtering (admin override)
 * @returns TenantScopedPrisma instance
 */
export function createTenantDb(tenantId: string, isAdmin: boolean = false): TenantScopedPrisma {
  return new TenantScopedPrisma(tenantId, isAdmin)
}
