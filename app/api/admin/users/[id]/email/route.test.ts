import { NextRequest } from 'next/server'
import { PATCH } from './route'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/auth-helpers')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockRequireAdmin = requireAdmin as jest.MockedFunction<typeof requireAdmin>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PATCH /api/admin/users/[id]/email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAdmin.mockResolvedValue(undefined)
  })

  it('should update user email successfully', async () => {
    const userId = 'user-123'
    const existingUser = {
      id: userId,
      email: 'old@example.com',
      companyId: 'company-123',
      role: 'CLIENT' as const,
    }
    const updatedUser = {
      id: userId,
      name: 'Test User',
      email: 'new@example.com',
      role: 'CLIENT' as const,
      companyId: 'company-123',
      updatedAt: new Date(),
    }

    mockPrisma.user.findUnique.mockResolvedValue(existingUser as any)
    mockPrisma.user.findFirst.mockResolvedValue(null)
    mockPrisma.user.update.mockResolvedValue(updatedUser as any)

    const request = new NextRequest('http://localhost/api/admin/users/user-123/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'new@example.com' }),
    })

    const response = await PATCH(request, { params: { id: userId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Email updated successfully')
    expect(data.user.email).toBe('new@example.com')
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: {
        email: 'new@example.com',
        updatedAt: expect.any(Date),
      },
      select: expect.any(Object),
    })
  })

  it('should return 404 if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/admin/users/invalid-id/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'new@example.com' }),
    })

    const response = await PATCH(request, { params: { id: 'invalid-id' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('should return 400 if email is the same as current', async () => {
    const userId = 'user-123'
    const existingUser = {
      id: userId,
      email: 'same@example.com',
      companyId: 'company-123',
      role: 'CLIENT' as const,
    }

    mockPrisma.user.findUnique.mockResolvedValue(existingUser as any)

    const request = new NextRequest('http://localhost/api/admin/users/user-123/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'same@example.com' }),
    })

    const response = await PATCH(request, { params: { id: userId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('New email must be different from current email')
  })

  it('should return 400 if email is already in use', async () => {
    const userId = 'user-123'
    const existingUser = {
      id: userId,
      email: 'old@example.com',
      companyId: 'company-123',
      role: 'CLIENT' as const,
    }
    const duplicateUser = {
      id: 'user-456',
      email: 'duplicate@example.com',
      companyId: 'company-123',
    }

    mockPrisma.user.findUnique.mockResolvedValue(existingUser as any)
    mockPrisma.user.findFirst.mockResolvedValue(duplicateUser as any)

    const request = new NextRequest('http://localhost/api/admin/users/user-123/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'duplicate@example.com' }),
    })

    const response = await PATCH(request, { params: { id: userId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
    expect(data.details.email).toContain('This email address is already in use')
  })

  it('should return 400 for invalid email format', async () => {
    const userId = 'user-123'
    const existingUser = {
      id: userId,
      email: 'old@example.com',
      companyId: 'company-123',
      role: 'CLIENT' as const,
    }

    mockPrisma.user.findUnique.mockResolvedValue(existingUser as any)

    const request = new NextRequest('http://localhost/api/admin/users/user-123/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'invalid-email' }),
    })

    const response = await PATCH(request, { params: { id: userId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Validation failed')
  })

  it('should return 403 if not admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

    const request = new NextRequest('http://localhost/api/admin/users/user-123/email', {
      method: 'PATCH',
      body: JSON.stringify({ email: 'new@example.com' }),
    })

    const response = await PATCH(request, { params: { id: 'user-123' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Unauthorized')
  })
})
