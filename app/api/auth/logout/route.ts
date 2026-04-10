import { NextResponse } from 'next/server'

/**
 * Logout API route
 * 
 * This endpoint handles logout by redirecting to NextAuth's signout endpoint
 * Requirements: 1.9, 10.4
 */
export async function POST() {
  // Redirect to NextAuth signout which will invalidate the session
  return NextResponse.redirect(new URL('/api/auth/signout', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
}

export async function GET() {
  // Also support GET for direct navigation
  return NextResponse.redirect(new URL('/api/auth/signout', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
}
