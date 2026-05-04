import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * Extract subdomain from hostname
 * Examples:
 * - acme.propfirmstech.com -> acme
 * - localhost:3000 -> null (development)
 * - admin.propfirmstech.com -> admin
 */
function extractSubdomain(hostname: string): string | null {
  // Handle localhost and IP addresses (development)
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1') || hostname.startsWith('192.168.')) {
    return null
  }

  // Split hostname by dots
  const parts = hostname.split('.')
  
  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length < 3) {
    return null
  }

  // Return the first part as subdomain
  return parts[0]
}

/**
 * Validate that a tenant exists and is active
 */
async function validateTenant(subdomain: string): Promise<{ id: string; subdomain: string; isActive: boolean } | null> {
  try {
    const company = await prisma.company.findUnique({
      where: { subdomain },
      select: {
        id: true,
        subdomain: true,
        isActive: true,
      },
    })

    return company
  } catch (error) {
    console.error('Error validating tenant:', error)
    return null
  }
}

/**
 * Multi-tenant middleware with authentication and authorization
 * 
 * This middleware:
 * 1. Resolves tenant from subdomain
 * 2. Validates tenant exists and is active
 * 3. Checks authentication for protected routes
 * 4. Enforces role-based access control
 * 
 * Requirements: 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5
 */
const SOCIAL_CRAWLERS = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.nextUrl.hostname
  const subdomain = extractSubdomain(hostname)
  const userAgent = request.headers.get('user-agent') || ''

  // Rewrite social media crawler requests to the OG-only page (outside auth layouts)
  if (SOCIAL_CRAWLERS.test(userAgent)) {
    const ticketMatch = pathname.match(/^\/(portal|admin)\/tickets\/([^/]+)$/)
    if (ticketMatch) {
      const ogUrl = new URL(`/og/tickets/${ticketMatch[2]}`, request.url)
      return NextResponse.rewrite(ogUrl)
    }
  }

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // --- Route Protection Logic ---
  
  // Protect /admin/* routes - require ADMIN role
  if (pathname.startsWith('/admin')) {
    if (!token) {
      // Not authenticated - redirect to login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    if (token.role !== 'ADMIN') {
      const portalPath = pathname.replace(/^\/admin/, '/portal')
      return NextResponse.redirect(new URL(portalPath, request.url))
    }

    // Admin authenticated - allow access
    return NextResponse.next()
  }

  // Protect /portal/* routes - require any authenticated user
  if (pathname.startsWith('/portal')) {
    if (!token) {
      // Not authenticated - redirect to login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    // Authenticated - check if admin is visiting portal routes
    if (token.role === 'ADMIN') {
      const adminPath = pathname.replace(/^\/portal/, '/admin')
      return NextResponse.redirect(new URL(adminPath, request.url))
    }

    // Client authenticated - allow access
    return NextResponse.next()
  }

  // --- Tenant Resolution Logic ---
  
  // If no subdomain (localhost or www), allow request to proceed
  if (!subdomain) {
    return NextResponse.next()
  }

  // Skip tenant validation for admin subdomain
  if (subdomain === 'admin') {
    return NextResponse.next()
  }

  // Skip tenant validation for www subdomain (public pages)
  if (subdomain === 'www') {
    return NextResponse.next()
  }

  // Validate tenant exists and is active
  const tenant = await validateTenant(subdomain)

  if (!tenant) {
    // Tenant not found - return 404
    return new NextResponse('Tenant not found', { status: 404 })
  }

  if (!tenant.isActive) {
    // Tenant is inactive - return 404 (don't reveal tenant exists but is inactive)
    return new NextResponse('Tenant not found', { status: 404 })
  }

  // Set tenant context in request headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.id)
  requestHeaders.set('x-tenant-subdomain', tenant.subdomain)

  // Continue with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
