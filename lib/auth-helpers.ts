import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'

/**
 * Authentication helper functions for API routes and server actions
 * 
 * These helpers provide convenient ways to:
 * - Get the current session
 * - Require authentication
 * - Require specific roles (admin/client)
 * - Validate tenant access
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2
 */

/**
 * Get the current user session
 * Returns null if not authenticated
 */
export async function getSession() {
  return await getServerSession(authOptions)
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes and server actions that require any authenticated user
 * 
 * @throws Error if user is not authenticated
 * @returns The authenticated session
 * 
 * @example
 * export async function GET() {
 *   const session = await requireAuth()
 *   // User is guaranteed to be authenticated here
 * }
 */
export async function requireAuth() {
  const session = await getSession()
  
  if (!session?.user) {
    throw new Error('Authentication required')
  }
  
  return session
}

/**
 * Require admin role - throws error if user is not an admin
 * Use this in admin-only API routes and server actions
 * 
 * Requirements: 2.1
 * 
 * @throws Error if user is not authenticated or not an admin
 * @returns The authenticated admin session
 * 
 * @example
 * export async function GET() {
 *   const session = await requireAdmin()
 *   // User is guaranteed to be an authenticated admin here
 * }
 */
export async function requireAdmin() {
  const session = await requireAuth()
  
  if (session.user.role !== Role.ADMIN) {
    throw new Error('Admin access required')
  }
  
  return session
}

/**
 * Require client role - throws error if user is not a client
 * Use this in client-only API routes and server actions
 * 
 * Requirements: 2.2
 * 
 * @throws Error if user is not authenticated or not a client
 * @returns The authenticated client session
 * 
 * @example
 * export async function GET() {
 *   const session = await requireClient()
 *   // User is guaranteed to be an authenticated client here
 *   const companyId = session.user.companyId
 * }
 */
export async function requireClient() {
  const session = await requireAuth()
  
  if (session.user.role !== Role.CLIENT) {
    throw new Error('Client access required')
  }
  
  if (!session.user.companyId) {
    throw new Error('Client user must have a companyId')
  }
  
  return session
}

/**
 * Check if the current user has access to a specific company's data
 * Admins have access to all companies, clients only to their own
 * 
 * Requirements: 2.3, 2.4
 * 
 * @param companyId - The company ID to check access for
 * @returns true if user has access, false otherwise
 * 
 * @example
 * export async function GET(request: Request, { params }: { params: { id: string } }) {
 *   const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
 *   
 *   if (!await hasCompanyAccess(ticket.companyId)) {
 *     return new Response('Forbidden', { status: 403 })
 *   }
 *   
 *   return Response.json(ticket)
 * }
 */
export async function hasCompanyAccess(companyId: string): Promise<boolean> {
  const session = await getSession()
  
  if (!session?.user) {
    return false
  }
  
  // Admins have access to all companies
  if (session.user.role === Role.ADMIN) {
    return true
  }
  
  // Clients only have access to their own company
  return session.user.companyId === companyId
}

/**
 * Require access to a specific company's data
 * Throws error if user doesn't have access
 * 
 * Requirements: 2.3, 2.4
 * 
 * @param companyId - The company ID to require access for
 * @throws Error if user doesn't have access
 * 
 * @example
 * export async function GET(request: Request, { params }: { params: { id: string } }) {
 *   const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
 *   await requireCompanyAccess(ticket.companyId)
 *   
 *   // User is guaranteed to have access to this company's data
 *   return Response.json(ticket)
 * }
 */
export async function requireCompanyAccess(companyId: string): Promise<void> {
  const hasAccess = await hasCompanyAccess(companyId)
  
  if (!hasAccess) {
    throw new Error('Access denied: You do not have permission to access this company\'s data')
  }
}
