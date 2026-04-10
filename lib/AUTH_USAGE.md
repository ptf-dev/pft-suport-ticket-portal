# NextAuth Configuration Usage Guide

This document explains how to use the NextAuth configuration in the PropFirmsTech Support Portal.

## Overview

The authentication system is built with NextAuth.js and provides:
- Email/password authentication with bcrypt
- Tenant-aware login (users scoped to their company)
- Role-based access control (ADMIN vs CLIENT)
- Session management with JWT strategy
- Helper functions for protecting routes and checking permissions

## Configuration Files

- `lib/auth.ts` - NextAuth configuration with credentials provider
- `lib/auth-helpers.ts` - Helper functions for authentication and authorization
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler

## Session Structure

When a user successfully authenticates, the session contains:

```typescript
{
  user: {
    id: string           // User ID
    name: string         // User's full name
    email: string        // User's email address
    role: 'ADMIN' | 'CLIENT'  // User's role
    companyId?: string   // Company ID (null for admins, required for clients)
  }
}
```

## Using Authentication in Server Components

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function MyPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  return <div>Welcome, {session.user.name}!</div>
}
```

## Using Authentication in API Routes

### Basic Authentication

```typescript
import { requireAuth } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const session = await requireAuth()
    
    // User is authenticated
    return Response.json({ user: session.user })
  } catch (error) {
    return new Response('Unauthorized', { status: 401 })
  }
}
```

### Require Admin Role

```typescript
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const session = await requireAdmin()
    
    // User is an authenticated admin
    return Response.json({ message: 'Admin access granted' })
  } catch (error) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

### Require Client Role

```typescript
import { requireClient } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const session = await requireClient()
    
    // User is an authenticated client with a companyId
    const companyId = session.user.companyId
    
    return Response.json({ companyId })
  } catch (error) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

### Check Company Access

```typescript
import { requireCompanyAccess } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id }
    })
    
    if (!ticket) {
      return new Response('Not found', { status: 404 })
    }
    
    // Verify user has access to this company's data
    await requireCompanyAccess(ticket.companyId)
    
    // User has access
    return Response.json(ticket)
  } catch (error) {
    return new Response('Forbidden', { status: 403 })
  }
}
```

## Using Authentication in Server Actions

```typescript
'use server'

import { requireAuth, requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function createTicket(formData: FormData) {
  const session = await requireAuth()
  
  // Create ticket logic here
  const ticket = await prisma.ticket.create({
    data: {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      companyId: session.user.companyId!,
      createdById: session.user.id,
    }
  })
  
  return ticket
}

export async function deleteCompany(companyId: string) {
  await requireAdmin()
  
  // Only admins can delete companies
  await prisma.company.delete({
    where: { id: companyId }
  })
}
```

## Tenant-Aware Login

The credentials provider supports tenant-scoped login by passing a `tenantId`:

```typescript
// In your login form
const result = await signIn('credentials', {
  email: 'user@example.com',
  password: 'password123',
  tenantId: 'company-id-here', // Optional: scope login to specific company
  redirect: false,
})
```

When `tenantId` is provided, the authentication will only look for users belonging to that company. This is useful for tenant-specific login pages.

## Role-Based Redirects

After successful login, users are automatically redirected based on their role:
- **ADMIN** users → `/admin`
- **CLIENT** users → `/portal`

This is handled by the authentication callbacks in `lib/auth.ts`.

## Session Management

### Check if User is Authenticated

```typescript
import { getSession } from '@/lib/auth-helpers'

const session = await getSession()

if (session) {
  console.log('User is authenticated:', session.user.email)
} else {
  console.log('User is not authenticated')
}
```

### Logout

```typescript
import { signOut } from 'next-auth/react'

// In a client component
<button onClick={() => signOut({ callbackUrl: '/login' })}>
  Logout
</button>
```

## Security Features

1. **Password Hashing**: All passwords are hashed with bcrypt before storage
2. **JWT Sessions**: Sessions are stored as JWTs for scalability
3. **Inactive User Check**: Inactive users cannot authenticate
4. **Inactive Company Check**: Users from inactive companies cannot authenticate
5. **Tenant Isolation**: Client users can only access their company's data
6. **Role-Based Access**: Admins and clients have different permissions

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

Generate a secure secret with:
```bash
openssl rand -base64 32
```

## Testing

Unit tests for the authentication configuration are in `lib/auth.test.ts`.

Run tests with:
```bash
npm test lib/auth.test.ts
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 1.1**: Email/password authentication with bcrypt
- **Requirement 1.2**: Session contains id, name, email, role, and companyId
- **Requirement 2.1**: `requireAdmin()` helper for admin-only routes
- **Requirement 2.2**: `requireClient()` helper for client-only routes
- **Requirement 2.3**: Tenant access validation for client users
- **Requirement 2.4**: Company access checks with `requireCompanyAccess()`

## Next Steps

After configuring NextAuth, you'll need to:

1. Create the login page at `/login`
2. Implement role-based redirect logic
3. Add route protection middleware
4. Create logout functionality
5. Build the admin and portal layouts with navigation

See the tasks.md file for the complete implementation plan.
