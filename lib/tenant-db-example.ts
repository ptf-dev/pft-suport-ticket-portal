/**
 * Example usage of the tenant-scoped database access layer
 * 
 * This file demonstrates how to use the tenant-scoped database
 * in various scenarios within the PropFirmsTech Support Portal.
 */

import { getTenantDb, getTenantDbForCompany, getAdminDb } from '@/lib/tenant-db-helpers'

// Example 1: Client user accessing their tickets
export async function getClientTickets(session: any) {
  // Get tenant-scoped database instance
  // This automatically filters all queries by the client's companyId
  const db = await getTenantDb(session)
  
  // Find all open tickets for this tenant
  const tickets = await db.tickets.findMany({
    where: { status: 'OPEN' },
    include: {
      createdBy: true,
      comments: {
        where: { internal: false }, // Only public comments for clients
        orderBy: { createdAt: 'asc' }
      }
    }
  })
  
  return tickets
}

// Example 2: Client user creating a ticket
export async function createClientTicket(
  session: any,
  data: { title: string; description: string; priority: string }
) {
  const db = await getTenantDb(session)
  
  // The companyId is automatically set to the client's company
  // Note: In actual implementation, use the tenant-scoped DB which handles companyId automatically
  const ticket = await db.tickets.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority as any,
      company: { connect: { id: session.user.companyId! } },
      createdBy: { connect: { id: session.user.id } },
    }
  })
  
  return ticket
}

// Example 3: Admin viewing all tickets across all tenants
export async function getAdminDashboard(session: any) {
  if (session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  
  // Get admin database instance (no tenant filtering)
  const db = getAdminDb()
  
  // Get tickets from all tenants
  const allTickets = await db.tickets.findMany({
    include: {
      company: true,
      createdBy: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  // Get ticket counts by status
  const openCount = await db.tickets.count({ where: { status: 'OPEN' } })
  const inProgressCount = await db.tickets.count({ where: { status: 'IN_PROGRESS' } })
  const resolvedCount = await db.tickets.count({ where: { status: 'RESOLVED' } })
  
  return {
    recentTickets: allTickets,
    stats: {
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount
    }
  }
}

// Example 4: Admin managing a specific tenant
export async function getCompanyTickets(session: any, companyId: string) {
  if (session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  
  // Get database instance scoped to specific tenant
  const db = getTenantDbForCompany(companyId, session)
  
  // Get all tickets for this specific company
  const tickets = await db.tickets.findMany({
    include: {
      createdBy: true,
      comments: true // Admins see all comments including internal
    }
  })
  
  return tickets
}

// Example 5: Client user accessing their company info
export async function getClientCompanyInfo(session: any) {
  const db = await getTenantDb(session)
  
  // Client can only see their own company
  const companies = await db.companies.findMany()
  
  // This will only return the client's company
  return companies[0]
}

// Example 6: Admin creating a new company
export async function createCompany(
  session: any,
  data: { name: string; subdomain: string; contactEmail: string }
) {
  if (session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  
  const db = getAdminDb()
  
  // Only admins can create companies
  const company = await db.companies.create({
    data: {
      name: data.name,
      subdomain: data.subdomain,
      contactEmail: data.contactEmail,
      isActive: true
    }
  })
  
  return company
}

// Example 7: Adding a comment to a ticket
export async function addTicketComment(
  session: any,
  ticketId: string,
  message: string,
  isInternal: boolean = false
) {
  const db = await getTenantDb(session)
  
  // For clients, isInternal is always false
  // For admins, they can choose
  const internal = session.user.role === 'ADMIN' ? isInternal : false
  
  const comment = await db.ticketComments.create({
    data: {
      ticketId,
      authorId: session.user.id,
      message,
      internal
    }
  })
  
  return comment
}

// Example 8: Getting ticket statistics for a client
export async function getClientStats(session: any) {
  const db = await getTenantDb(session)
  
  // All counts are automatically scoped to the client's company
  const totalTickets = await db.tickets.count()
  const openTickets = await db.tickets.count({ where: { status: 'OPEN' } })
  const inProgressTickets = await db.tickets.count({ where: { status: 'IN_PROGRESS' } })
  const resolvedTickets = await db.tickets.count({ where: { status: 'RESOLVED' } })
  
  return {
    total: totalTickets,
    open: openTickets,
    inProgress: inProgressTickets,
    resolved: resolvedTickets
  }
}

// Example 9: Updating a ticket (with tenant validation)
export async function updateTicketStatus(
  session: any,
  ticketId: string,
  newStatus: string
) {
  const db = await getTenantDb(session)
  
  // This will only update the ticket if it belongs to the user's tenant
  // If the ticket belongs to another tenant, it won't be found
  const ticket = await db.tickets.update({
    where: { id: ticketId },
    data: { status: newStatus as any }
  })
  
  return ticket
}

// Example 10: Admin searching across all tenants
export async function searchTicketsGlobally(session: any, searchTerm: string) {
  if (session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Admin access required')
  }
  
  const db = getAdminDb()
  
  // Search across all tenants
  const tickets = await db.tickets.findMany({
    where: {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ]
    },
    include: {
      company: true,
      createdBy: true
    }
  })
  
  return tickets
}
