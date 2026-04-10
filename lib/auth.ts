import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

/**
 * NextAuth configuration with tenant-aware credentials provider
 * 
 * This configuration implements:
 * - Email/password authentication with bcrypt verification
 * - Tenant-scoped user lookup
 * - Session enrichment with role and companyId
 * - JWT session strategy for scalability
 * 
 * Requirements: 1.1, 1.2
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email
          // Note: If tenantId is provided, we can scope the lookup
          const whereClause: any = { email: credentials.email }
          
          // For tenant-scoped login, filter by companyId
          if (credentials.tenantId) {
            whereClause.companyId = credentials.tenantId
          }

          const user = await prisma.user.findFirst({
            where: whereClause,
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  subdomain: true,
                  isActive: true,
                },
              },
            },
          })

          if (!user) {
            return null
          }

          // Verify user is active
          if (!user.isActive) {
            return null
          }

          // Verify company is active (for CLIENT users)
          if (user.companyId && user.company && !user.company.isActive) {
            return null
          }

          // Verify password with bcrypt
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          // Return user object that will be stored in JWT
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId,
          }
        } catch (error) {
          console.error('Authentication error:', error)
          return null
        }
      },
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  callbacks: {
    /**
     * JWT callback - called when JWT is created or updated
     * Adds user role and companyId to the token
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
      }
      return token
    },
    
    /**
     * Session callback - called when session is checked
     * Adds user role and companyId to the session object
     * 
     * This ensures the session contains all required fields:
     * - user.id
     * - user.name
     * - user.email
     * - user.role
     * - user.companyId
     * 
     * Requirements: 1.2
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
        session.user.companyId = token.companyId as string | undefined
      }
      return session
    },
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * Type augmentation for NextAuth to include custom session fields
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: Role
      companyId?: string
    }
  }

  interface User {
    id: string
    name: string
    email: string
    role: Role
    companyId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    companyId?: string | null
  }
}
