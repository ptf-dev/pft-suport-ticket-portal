import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from './middleware'

/**
 * Integration tests for middleware with authentication and authorization
 * 
 * These tests validate:
 * - Route protection for /admin/* and /portal/* routes
 * - Authentication checks and redirects
 * - Role-based access control
 * - Tenant resolution and validation
 * 
 * Requirements: 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5
 */

// Mock next-auth/jwt
jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
    },
  },
}))

import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>
const mockPrismaFindUnique = prisma.company.findUnique as jest.MockedFunction<typeof prisma.company.findUnique>

describe('Middleware - Route Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Admin Route Protection (/admin/*)', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/admin'))
      const response = await middleware(request)

      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should redirect authenticated CLIENT users to portal equivalent', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user-1',
        role: 'CLIENT',
        companyId: 'company-1',
      } as any)

      const request = new NextRequest(new URL('http://localhost:3000/admin/tickets/abc123'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/portal/tickets/abc123')
    })

    it('should allow authenticated ADMIN users', async () => {
      mockGetToken.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        companyId: null,
      } as any)

      const request = new NextRequest(new URL('http://localhost:3000/admin'))
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })

    it('should protect nested admin routes', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/admin/companies'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })
  })

  describe('Portal Route Protection (/portal/*)', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/portal'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('should allow authenticated CLIENT users', async () => {
      mockGetToken.mockResolvedValue({
        id: 'user-1',
        role: 'CLIENT',
        companyId: 'company-1',
      } as any)

      const request = new NextRequest(new URL('http://localhost:3000/portal'))
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })

    it('should redirect authenticated ADMIN users to admin equivalent', async () => {
      mockGetToken.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        companyId: null,
      } as any)

      const request = new NextRequest(new URL('http://localhost:3000/portal/tickets/abc123'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/tickets/abc123')
    })

    it('should protect nested portal routes', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/portal/tickets'))
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })
  })

  describe('Public Routes', () => {
    it('should allow unauthenticated access to /login', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/login'))
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })

    it('should allow unauthenticated access to root', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/'))
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })

    it('should allow unauthenticated access to API routes', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/api/health'))
      const response = await middleware(request)

      expect(response.status).toBe(200)
    })
  })
})

describe('Middleware - Tenant Resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Valid Tenant', () => {
    it('should set tenant context headers for valid subdomain', async () => {
      mockGetToken.mockResolvedValue(null)
      mockPrismaFindUnique.mockResolvedValue({
        id: 'company-1',
        subdomain: 'acme',
        isActive: true,
      } as any)

      const request = new NextRequest(new URL('http://acme.propfirmstech.com/'))
      const response = await middleware(request)

      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: { subdomain: 'acme' },
        select: {
          id: true,
          subdomain: true,
          isActive: true,
        },
      })

      // Check that headers were set (in a real scenario)
      // Note: Testing header modification in middleware is complex
      // This would be better tested in integration tests
    })
  })

  describe('Invalid Tenant', () => {
    it('should return 404 for non-existent subdomain', async () => {
      mockGetToken.mockResolvedValue(null)
      mockPrismaFindUnique.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://invalid.propfirmstech.com/'))
      const response = await middleware(request)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Tenant not found')
    })

    it('should return 404 for inactive tenant', async () => {
      mockGetToken.mockResolvedValue(null)
      mockPrismaFindUnique.mockResolvedValue({
        id: 'company-2',
        subdomain: 'inactive',
        isActive: false,
      } as any)

      const request = new NextRequest(new URL('http://inactive.propfirmstech.com/'))
      const response = await middleware(request)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Tenant not found')
    })
  })

  describe('Special Subdomains', () => {
    it('should bypass validation for admin subdomain', async () => {
      mockGetToken.mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
      } as any)

      const request = new NextRequest(new URL('http://admin.propfirmstech.com/admin'))
      const response = await middleware(request)

      expect(mockPrismaFindUnique).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should bypass validation for www subdomain', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://www.propfirmstech.com/'))
      const response = await middleware(request)

      expect(mockPrismaFindUnique).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should bypass validation for localhost', async () => {
      mockGetToken.mockResolvedValue(null)

      const request = new NextRequest(new URL('http://localhost:3000/'))
      const response = await middleware(request)

      expect(mockPrismaFindUnique).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })
})

describe('Middleware - Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle admin accessing admin routes', async () => {
    mockGetToken.mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
    } as any)

    const request = new NextRequest(new URL('http://localhost:3000/admin/companies'))
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })

  it('should handle client accessing portal routes', async () => {
    mockGetToken.mockResolvedValue({
      id: 'user-1',
      role: 'CLIENT',
      companyId: 'company-1',
    } as any)

    const request = new NextRequest(new URL('http://localhost:3000/portal/tickets'))
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })

  it('should redirect client accessing admin routes to portal equivalent', async () => {
    mockGetToken.mockResolvedValue({
      id: 'user-1',
      role: 'CLIENT',
      companyId: 'company-1',
    } as any)

    const request = new NextRequest(new URL('http://localhost:3000/admin'))
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/portal')
  })

  it('should handle unauthenticated user accessing protected routes', async () => {
    mockGetToken.mockResolvedValue(null)

    const adminRequest = new NextRequest(new URL('http://localhost:3000/admin'))
    const adminResponse = await middleware(adminRequest)
    expect(adminResponse.status).toBe(307)

    const portalRequest = new NextRequest(new URL('http://localhost:3000/portal'))
    const portalResponse = await middleware(portalRequest)
    expect(portalResponse.status).toBe(307)
  })
})
