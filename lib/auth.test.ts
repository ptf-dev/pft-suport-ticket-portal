import { describe, it, expect } from '@jest/globals'
import { authOptions } from './auth'

/**
 * Unit tests for NextAuth configuration
 * 
 * These tests validate the NextAuth configuration structure and callbacks.
 * The authorize function contains complex database logic that should be tested
 * through integration tests with a real database.
 * 
 * Requirements: 1.1, 1.2
 */

describe('NextAuth Configuration', () => {
  describe('Credentials Provider Configuration', () => {
    const credentialsProvider = authOptions.providers[0] as any

    it('should have exactly one provider (Credentials)', () => {
      expect(authOptions.providers).toHaveLength(1)
      expect(credentialsProvider.name).toBe('Credentials')
    })

    it('should have authorize function defined', () => {
      expect(credentialsProvider.authorize).toBeDefined()
      expect(typeof credentialsProvider.authorize).toBe('function')
    })
  })

  describe('Authorize Function Logic Validation', () => {
    const credentialsProvider = authOptions.providers[0] as any
    const authorize = credentialsProvider.authorize

    it('should return null when email is missing', async () => {
      const result = await authorize({
        password: 'password123',
      })
      
      expect(result).toBeNull()
    })

    it('should return null when password is missing', async () => {
      const result = await authorize({
        email: 'test@example.com',
      })
      
      expect(result).toBeNull()
    })

    // Note: Further testing of the authorize function requires database integration
    // These tests should be performed in integration test suites
  })

  describe('JWT Callback', () => {
    const jwtCallback = authOptions.callbacks?.jwt

    it('should add user data to token on sign in', async () => {
      const token = { sub: 'user-1' }
      const user = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'CLIENT' as const,
        companyId: 'company-1',
      }
      
      const result = await jwtCallback!({ token, user } as any)
      
      expect(result).toEqual({
        sub: 'user-1',
        id: 'user-1',
        role: 'CLIENT',
        companyId: 'company-1',
      })
    })

    it('should preserve existing token data when user is not provided', async () => {
      const token = {
        sub: 'user-1',
        id: 'user-1',
        role: 'CLIENT' as const,
        companyId: 'company-1',
      }
      
      const result = await jwtCallback!({ token } as any)
      
      expect(result).toEqual(token)
    })

    it('should handle admin users without companyId', async () => {
      const token = { sub: 'admin-1' }
      const user = {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@propfirmstech.com',
        role: 'ADMIN' as const,
        companyId: null,
      }
      
      const result = await jwtCallback!({ token, user } as any)
      
      expect(result).toEqual({
        sub: 'admin-1',
        id: 'admin-1',
        role: 'ADMIN',
        companyId: null,
      })
    })
  })

  describe('Session Callback', () => {
    const sessionCallback = authOptions.callbacks?.session

    it('should add user data from token to session', async () => {
      const session = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
        expires: '2024-12-31',
      }
      
      const token = {
        id: 'user-1',
        role: 'CLIENT' as const,
        companyId: 'company-1',
      }
      
      const result = await sessionCallback!({ session, token } as any)
      
      expect(result.user).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        id: 'user-1',
        role: 'CLIENT',
        companyId: 'company-1',
      })
    })

    it('should handle admin users without companyId', async () => {
      const session = {
        user: {
          name: 'Admin User',
          email: 'admin@propfirmstech.com',
        },
        expires: '2024-12-31',
      }
      
      const token = {
        id: 'admin-1',
        role: 'ADMIN' as const,
        companyId: null,
      }
      
      const result = await sessionCallback!({ session, token } as any)
      
      expect(result.user).toEqual({
        name: 'Admin User',
        email: 'admin@propfirmstech.com',
        id: 'admin-1',
        role: 'ADMIN',
        companyId: null,
      })
    })

    it('should handle missing user in session gracefully', async () => {
      const session = {
        expires: '2024-12-31',
      }
      
      const token = {
        id: 'user-1',
        role: 'CLIENT' as const,
        companyId: 'company-1',
      }
      
      const result = await sessionCallback!({ session, token } as any)
      
      // Session should be returned unchanged if user is missing
      expect(result).toEqual(session)
    })
  })

  describe('Configuration Options', () => {
    it('should use JWT session strategy', () => {
      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('should have correct session maxAge (30 days)', () => {
      const expectedMaxAge = 30 * 24 * 60 * 60 // 30 days in seconds
      expect(authOptions.session?.maxAge).toBe(expectedMaxAge)
    })

    it('should have custom sign-in page configured', () => {
      expect(authOptions.pages?.signIn).toBe('/login')
    })

    it('should have custom error page configured', () => {
      expect(authOptions.pages?.error).toBe('/login')
    })

    it('should have NEXTAUTH_SECRET configured', () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET)
    })

    it('should have exactly one provider (Credentials)', () => {
      expect(authOptions.providers).toHaveLength(1)
      expect((authOptions.providers[0] as any).name).toBe('Credentials')
    })
  })
})
