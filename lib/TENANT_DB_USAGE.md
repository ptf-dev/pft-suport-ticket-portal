# Tenant-Scoped Database Access Layer

## Overview

The tenant-scoped database access layer provides automatic data isolation for multi-tenant applications. It ensures that all database queries are automatically filtered by the tenant's `companyId`, preventing accidental cross-tenant data access.

## Key Features

- **Automatic Tenant Filtering**: All queries are automatically scoped to the current tenant
- **Admin Override**: Admins can bypass tenant filtering for cross-tenant operations
- **Type Safety**: Full TypeScript support with Prisma types
- **Easy Integration**: Simple helper functions for common use cases

## Basic Usage

### In API Routes

```typescript
import { getTenantDb } from '@/lib/tenant-db-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get tenant-scoped database instance
  const db = await getTenantDb(session)
  
  // All queries are automatically filtered by tenant
  const tickets = await db.tickets.findMany({
    where: { status: 'OPEN' },
    include: { createdBy: true }
  })
  
  return Response.json(tickets)
}
```

### In Server Actions

```typescript
'use server'

import { getTenantDb } from '@/lib/tenant-db-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function createTicket(data: {
  title: string
  description: string
  priority: string
}) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    throw new Error('Unauthorized')
  }

  const db = await getTenantDb(session)
  
  // companyId is automatically set
  const ticket = await db.tickets.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      createdById: session.user.id,
    }
  })
  
  return ticket
}
```

### Admin Operations

```typescript
import { getAdminDb } from '@/lib/tenant-db-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  // Get admin database instance (no tenant filtering)
  const db = getAdminDb()
  
  // This returns tickets from ALL tenants
  const allTickets = await db.tickets.findMany({
    include: { company: true }
  })
  
  return Response.json(allTickets)
}
```

### Specific Tenant Operations

```typescript
import { getTenantDbForCompany } from '@/lib/tenant-db-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return new Response('Forbidden', { status: 403 })
  }

  // Get database instance for specific tenant
  const db = getTenantDbForCompany(params.companyId, session)
  
  // Queries are scoped to the specified tenant
  const tickets = await db.tickets.findMany()
  
  return Response.json(tickets)
}
```

## Supported Operations

### Tickets

- `findMany()` - Find multiple tickets (auto-filtered by tenant)
- `findUnique()` - Find single ticket by ID (auto-filtered by tenant)
- `findFirst()` - Find first matching ticket (auto-filtered by tenant)
- `create()` - Create ticket (companyId auto-set)
- `update()` - Update ticket (auto-filtered by tenant)
- `delete()` - Delete ticket (auto-filtered by tenant)
- `count()` - Count tickets (auto-filtered by tenant)

### Users

- `findMany()` - Find multiple users (auto-filtered by tenant)
- `findUnique()` - Find single user (auto-filtered by tenant)
- `findFirst()` - Find first matching user (auto-filtered by tenant)
- `create()` - Create user (companyId auto-set)
- `update()` - Update user (auto-filtered by tenant)
- `count()` - Count users (auto-filtered by tenant)

### Ticket Comments

- `findMany()` - Find comments (filtered by ticket's tenant)
- `create()` - Create comment (validated against ticket's tenant)
- `count()` - Count comments (filtered by ticket's tenant)

### Ticket Images

- `findMany()` - Find images (filtered by ticket's tenant)
- `create()` - Create image (validated against ticket's tenant)
- `count()` - Count images (filtered by ticket's tenant)

### Companies

- `findMany()` - Find companies (clients see only their own, admins see all)
- `findUnique()` - Find single company (clients see only their own, admins see all)
- `create()` - Create company (admin only)
- `update()` - Update company (admin only)

## Security Considerations

### Automatic Protection

The tenant-scoped database layer provides automatic protection against:

1. **Cross-tenant data leaks**: Client users cannot access other tenants' data
2. **Accidental queries**: Even if you forget to add `companyId` filter, it's added automatically
3. **Malicious queries**: Users cannot override the tenant filter

### Admin Override

Admins have special privileges:

- Can access data from any tenant
- Can perform cross-tenant operations
- Still subject to role-based access control

### Best Practices

1. **Always use tenant-scoped database**: Never use the raw Prisma client in tenant-scoped routes
2. **Validate admin access**: Always check `session.user.role === 'ADMIN'` before using admin functions
3. **Use helper functions**: Prefer `getTenantDb()` over manually creating instances
4. **Test tenant isolation**: Write tests to verify tenant data isolation

## Testing

Example test for tenant isolation:

```typescript
import { createTenantDb } from '@/lib/tenant-db'

describe('Tenant Isolation', () => {
  it('should not allow client to access other tenant data', async () => {
    const db = createTenantDb('tenant-1', false)
    
    // This query will be automatically filtered by tenant-1
    const tickets = await db.tickets.findMany({
      where: { companyId: 'tenant-2' } // This will be overridden
    })
    
    // tickets will be empty or only contain tenant-1 tickets
    expect(tickets.every(t => t.companyId === 'tenant-1')).toBe(true)
  })
  
  it('should allow admin to access all tenant data', async () => {
    const db = createTenantDb('tenant-1', true)
    
    // Admin can access any tenant
    const tickets = await db.tickets.findMany({
      where: { companyId: 'tenant-2' }
    })
    
    // tickets can contain tenant-2 tickets
    expect(tickets.some(t => t.companyId === 'tenant-2')).toBe(true)
  })
})
```

## Migration Guide

If you're migrating from direct Prisma usage:

### Before

```typescript
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  // Manual tenant filtering (easy to forget!)
  const tickets = await prisma.ticket.findMany({
    where: { companyId: session.user.companyId }
  })
  
  return Response.json(tickets)
}
```

### After

```typescript
import { getTenantDb } from '@/lib/tenant-db-helpers'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const db = await getTenantDb(session)
  
  // Automatic tenant filtering!
  const tickets = await db.tickets.findMany()
  
  return Response.json(tickets)
}
```

## Troubleshooting

### "Tenant context is required but not available"

This error occurs when:
- The middleware hasn't set tenant headers
- You're calling `getTenantDb()` outside a tenant-scoped route
- The subdomain is invalid or not recognized

**Solution**: Ensure you're accessing the app via a valid tenant subdomain (e.g., `acme.propfirmstech.com`)

### "Only admins can create/update companies"

This error occurs when a non-admin user tries to perform admin-only operations.

**Solution**: Check the user's role before attempting admin operations:

```typescript
if (session.user.role !== 'ADMIN') {
  return new Response('Forbidden', { status: 403 })
}
```

### "Raw database access is only available for admin users"

This error occurs when a non-admin tries to access `db.raw`.

**Solution**: Use the appropriate scoped methods instead of raw access, or ensure the user is an admin.

## Implementation Details

### How It Works

1. **Middleware**: Sets `x-tenant-id` header based on subdomain
2. **Helper Functions**: Extract tenant ID from headers
3. **TenantScopedPrisma**: Wraps Prisma client with automatic filtering
4. **Query Interception**: Adds `companyId` filter to all queries

### Performance

- **No overhead**: The wrapper adds minimal overhead (just object property access)
- **Same queries**: Generated SQL is identical to manual filtering
- **Connection pooling**: Uses the same Prisma client instance

## Related Files

- `lib/tenant-db.ts` - Core implementation
- `lib/tenant-db-helpers.ts` - Helper functions
- `lib/tenant.ts` - Tenant context utilities
- `middleware.ts` - Tenant resolution middleware
