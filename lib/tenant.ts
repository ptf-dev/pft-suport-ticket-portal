import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

/**
 * Tenant context interface
 */
export interface TenantContext {
  tenantId: string
  subdomain: string
}

/**
 * Get tenant context from request headers
 * This should be called in server components, API routes, or server actions
 * The middleware sets these headers for tenant-scoped requests
 */
export async function getTenantFromRequest(): Promise<TenantContext | null> {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-tenant-subdomain')

  if (!tenantId || !subdomain) {
    return null
  }

  return {
    tenantId,
    subdomain,
  }
}

/**
 * Require tenant context - throws error if not available
 * Use this in routes that must have tenant context
 */
export async function requireTenant(): Promise<TenantContext> {
  const tenant = await getTenantFromRequest()

  if (!tenant) {
    throw new Error('Tenant context is required but not available')
  }

  return tenant
}

/**
 * Validate that a user has access to a specific tenant
 * Used for authorization checks
 */
export function validateTenantAccess(
  userCompanyId: string | null,
  requiredTenantId: string,
  userRole: 'ADMIN' | 'CLIENT'
): boolean {
  // Admins have cross-tenant access
  if (userRole === 'ADMIN') {
    return true
  }

  // Client users must match the tenant
  return userCompanyId === requiredTenantId
}

/**
 * Get company details for a tenant
 */
export async function getTenantCompany(tenantId: string) {
  return await prisma.company.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      subdomain: true,
      contactEmail: true,
      whatsappLink: true,
      isActive: true,
    },
  })
}

/**
 * Session interface for type safety
 */
export interface Session {
  user: {
    id: string
    name: string
    email: string
    role: 'ADMIN' | 'CLIENT'
    companyId?: string | null
  }
}

/**
 * Middleware-style helper to require and validate tenant access
 * 
 * This function combines tenant context extraction and access validation
 * into a single helper that can be used at the start of API routes and server actions.
 * 
 * @param session - The user's session (from NextAuth or similar)
 * @param options - Optional configuration for access requirements
 * @returns TenantContext if access is granted
 * @throws Error with appropriate message if access is denied
 * 
 * @example
 * // In an API route
 * export async function GET(request: Request) {
 *   const session = await getServerSession(authOptions)
 *   const tenant = await requireTenantAccess(session)
 *   
 *   // Now you can safely use tenant.tenantId
 *   const tickets = await db.tickets.findMany({ where: { companyId: tenant.tenantId } })
 * }
 * 
 * @example
 * // Require admin access
 * const tenant = await requireTenantAccess(session, { requireAdmin: true })
 * 
 * @example
 * // Allow admin to bypass tenant matching
 * const tenant = await requireTenantAccess(session, { allowAdminBypass: true })
 */
export async function requireTenantAccess(
  session: Session | null,
  options: {
    requireAdmin?: boolean
    allowAdminBypass?: boolean
  } = {}
): Promise<TenantContext> {
  // Check if user is authenticated
  if (!session?.user) {
    throw new Error('Authentication required')
  }

  // Check admin requirement
  if (options.requireAdmin && session.user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }

  // Get tenant context from request
  const tenant = await getTenantFromRequest()

  if (!tenant) {
    throw new Error('Tenant context is required but not available')
  }

  // Validate tenant access
  const hasAccess = validateTenantAccess(
    session.user.companyId ?? null,
    tenant.tenantId,
    session.user.role
  )

  if (!hasAccess && !options.allowAdminBypass) {
    throw new Error('Access denied: User does not have access to this tenant')
  }

  return tenant
}
