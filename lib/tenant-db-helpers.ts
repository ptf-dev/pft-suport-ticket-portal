import { getTenantFromRequest } from '@/lib/tenant'
import { createTenantDb, TenantScopedPrisma } from '@/lib/tenant-db'

/**
 * Session interface for type safety
 */
interface Session {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'CLIENT'
    companyId?: string | null
  }
}

/**
 * Create a tenant-scoped database instance from the current request context
 * 
 * This helper automatically:
 * 1. Extracts tenant ID from request headers (set by middleware)
 * 2. Determines if the user is an admin (for cross-tenant access)
 * 3. Returns a properly configured TenantScopedPrisma instance
 * 
 * @param session - The user's session (from NextAuth or similar)
 * @returns TenantScopedPrisma instance scoped to the current tenant
 * @throws Error if tenant context is not available
 * 
 * @example
 * // In an API route or server action
 * const session = await getServerSession(authOptions)
 * const db = await getTenantDb(session)
 * 
 * // Now all queries are automatically scoped to the tenant
 * const tickets = await db.tickets.findMany()
 */
export async function getTenantDb(session: Session | null): Promise<TenantScopedPrisma> {
  // Get tenant context from request headers
  const tenant = await getTenantFromRequest()
  
  if (!tenant) {
    throw new Error('Tenant context is required but not available')
  }

  // Determine if user is admin (admins get cross-tenant access)
  const isAdmin = session?.user?.role === 'ADMIN'

  return createTenantDb(tenant.tenantId, isAdmin)
}

/**
 * Create a tenant-scoped database instance for a specific tenant
 * 
 * Use this when you need to explicitly specify the tenant ID,
 * such as in background jobs or admin operations.
 * 
 * @param tenantId - The company ID to scope queries to
 * @param session - The user's session (optional, used to determine admin status)
 * @returns TenantScopedPrisma instance scoped to the specified tenant
 * 
 * @example
 * // In an admin operation
 * const session = await getServerSession(authOptions)
 * const db = getTenantDbForCompany('company-123', session)
 * const tickets = await db.tickets.findMany()
 */
export function getTenantDbForCompany(
  tenantId: string,
  session: Session | null = null
): TenantScopedPrisma {
  const isAdmin = session?.user?.role === 'ADMIN'
  return createTenantDb(tenantId, isAdmin)
}

/**
 * Create an admin database instance with cross-tenant access
 * 
 * This bypasses all tenant filtering and should only be used
 * for admin operations that need to access data across all tenants.
 * 
 * @param tenantId - The tenant ID (required but not used for filtering)
 * @returns TenantScopedPrisma instance with admin override enabled
 * 
 * @example
 * // In an admin dashboard showing all tickets
 * const db = getAdminDb('admin-context')
 * const allTickets = await db.tickets.findMany()
 */
export function getAdminDb(tenantId: string = 'admin'): TenantScopedPrisma {
  return createTenantDb(tenantId, true)
}
