# Tenant Context Utilities Usage Guide

This guide demonstrates how to use the tenant context utilities for building multi-tenant API routes and server actions.

## Overview

The tenant context utilities provide three main functions:

1. **`getTenantFromRequest()`** - Extract tenant context from request headers
2. **`validateTenantAccess()`** - Validate if a user has access to a specific tenant
3. **`requireTenantAccess()`** - Middleware-style helper that combines authentication and tenant validation

## Core Functions

### getTenantFromRequest()

Extracts tenant context from request headers (set by middleware).

```typescript
import { getTenantFromRequest } from '@/lib/tenant'

export async function GET() {
  const tenant = await getTenantFromRequest()
  
  if (!tenant) {
    return new Response('Tenant context not found', { status: 404 })
  }
  
  console.log(tenant.tenantId)    // e.g., "company-123"
  console.log(tenant.subdomain)   // e.g., "acme"
}
```

### validateTenantAccess()

Validates if a user has access to a specific tenant based on their role and companyId.

```typescript
import { validateTenantAccess } from '@/lib/tenant'

const hasAccess = validateTenantAccess(
  userCompanyId,      // User's companyId from session
  requiredTenantId,   // Tenant being accessed
  userRole            // 'ADMIN' or 'CLIENT'
)

// Admins always have access
// Clients only have access if their companyId matches the tenant
```

### requireTenantAccess()

**Recommended approach** - Combines authentication check, tenant extraction, and access validation in one call.

```typescript
import { requireTenantAccess } from '@/lib/tenant'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  try {
    const tenant = await requireTenantAccess(session)
    
    // If we reach here, user is authenticated and has access to the tenant
    // Use tenant.tenantId for database queries
    
  } catch (error) {
    return new Response(error.message, { status: 403 })
  }
}
```

## Usage Examples

### Example 1: Basic API Route (Client Portal)

```typescript
// app/api/portal/tickets/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireTenantAccess } from '@/lib/tenant'
import { getTenantDb } from '@/lib/tenant-db-helpers'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  try {
    // Validate authentication and tenant access
    const tenant = await requireTenantAccess(session)
    
    // Get tenant-scoped database instance
    const db = await getTenantDb(session)
    
    // All queries are automatically scoped to the tenant
    const tickets = await db.tickets.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    return Response.json({ tickets })
    
  } catch (error) {
    return new Response(error.message, { status: 403 })
  }
}
```

### Example 2: Admin-Only Endpoint

```typescript
// app/api/admin/companies/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireTenantAccess } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  try {
    // Require admin role
    await requireTenantAccess(session, { requireAdmin: true })
    
    // Admin can access all companies
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: { users: true, tickets: true }
        }
      }
    })
    
    return Response.json({ companies })
    
  } catch (error) {
    return new Response(error.message, { status: 403 })
  }
}
```

### Example 3: Server Action with Tenant Context

```typescript
// app/portal/actions.ts
'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireTenantAccess } from '@/lib/tenant'
import { getTenantDb } from '@/lib/tenant-db-helpers'

export async function createTicket(formData: FormData) {
  const session = await getServerSession(authOptions)
  
  try {
    // Validate tenant access
    const tenant = await requireTenantAccess(session)
    
    // Get tenant-scoped database
    const db = await getTenantDb(session)
    
    // Create ticket (automatically scoped to tenant)
    const ticket = await db.tickets.create({
      data: {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        priority: formData.get('priority') as any,
        createdById: session.user.id,
        // companyId is automatically set by tenant-scoped DB
      }
    })
    
    return { success: true, ticket }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Example 4: Admin with Cross-Tenant Access

```typescript
// app/api/admin/tickets/[id]/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireTenantAccess } from '@/lib/tenant'
import { getAdminDb } from '@/lib/tenant-db-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  try {
    // Require admin and allow cross-tenant access
    await requireTenantAccess(session, { 
      requireAdmin: true,
      allowAdminBypass: true 
    })
    
    // Get admin database with cross-tenant access
    const db = getAdminDb()
    
    // Can access tickets from any tenant
    const ticket = await db.tickets.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        createdBy: true,
        comments: true
      }
    })
    
    if (!ticket) {
      return new Response('Ticket not found', { status: 404 })
    }
    
    return Response.json({ ticket })
    
  } catch (error) {
    return new Response(error.message, { status: 403 })
  }
}
```

### Example 5: Validating Resource Access

```typescript
// app/api/portal/tickets/[id]/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireTenantAccess } from '@/lib/tenant'
import { getTenantDb } from '@/lib/tenant-db-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  try {
    // Validate tenant access
    const tenant = await requireTenantAccess(session)
    
    // Get tenant-scoped database
    const db = await getTenantDb(session)
    
    // Automatically filtered by tenant - returns null if ticket belongs to different tenant
    const ticket = await db.tickets.findUnique({
      where: { id: params.id }
    })
    
    if (!ticket) {
      // Could be: ticket doesn't exist OR belongs to different tenant
      // Return 404 to avoid leaking tenant information
      return new Response('Ticket not found', { status: 404 })
    }
    
    return Response.json({ ticket })
    
  } catch (error) {
    return new Response(error.message, { status: 403 })
  }
}
```

## Options Reference

### requireTenantAccess Options

```typescript
interface RequireTenantAccessOptions {
  // Require user to be an admin
  requireAdmin?: boolean
  
  // Allow admins to bypass tenant matching
  // (admins can access any tenant's data)
  allowAdminBypass?: boolean
}
```

## Error Handling

The `requireTenantAccess` function throws errors with specific messages:

- `"Authentication required"` - No session or user in session
- `"Admin access required"` - User is not an admin when `requireAdmin: true`
- `"Tenant context is required but not available"` - Tenant headers not set by middleware
- `"Access denied: User does not have access to this tenant"` - Client user trying to access different tenant

## Best Practices

1. **Always use `requireTenantAccess` at the start of API routes** - This ensures authentication and authorization before any business logic

2. **Use tenant-scoped database helpers** - Combine `requireTenantAccess` with `getTenantDb()` for automatic query filtering

3. **Return 404 instead of 403 for missing resources** - Prevents tenant enumeration attacks

4. **Use `requireAdmin: true` for admin-only endpoints** - Explicitly mark admin routes

5. **Leverage TypeScript types** - Import the `Session` type for type safety

## Integration with Existing Code

The tenant context utilities work seamlessly with:

- **Middleware** (`middleware.ts`) - Sets tenant headers
- **Tenant-scoped database** (`lib/tenant-db.ts`) - Automatic query filtering
- **Database helpers** (`lib/tenant-db-helpers.ts`) - Convenience functions
- **NextAuth** - Session management and authentication

## Testing

Unit tests for `validateTenantAccess` are in `lib/tenant-context.test.ts`.

Integration tests for `requireTenantAccess` should be done in actual API route tests, as the function depends on Next.js request context.

## Requirements Validation

This implementation validates:

- **Requirement 2.3**: Client users can only access their company's data
- **Requirement 2.4**: Session validation includes tenant context
- **Requirement 2.5**: Role checks enforced on every protected route
