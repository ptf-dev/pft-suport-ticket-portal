import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * NextAuth API route handler
 * 
 * This handles all NextAuth routes:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/session
 * - /api/auth/csrf
 * - /api/auth/providers
 * - /api/auth/callback/*
 * 
 * The configuration is imported from lib/auth.ts
 */
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
