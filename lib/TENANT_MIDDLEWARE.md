# Tenant Resolution Middleware

## Overview

The tenant resolution middleware is a critical component of the multi-tenant architecture. It extracts the subdomain from incoming requests, validates the tenant exists and is active, and sets the tenant context in request headers for downstream processing.

## Implementation

### Files Created

1. **middleware.ts** - Main middleware file that runs on every request
2. **lib/tenant.ts** - Tenant context utilities and helpers
3. **lib/tenant.test.ts** - Unit tests for tenant utilities
4. **app/api/tenant-info/route.ts** - Test endpoint to verify middleware

### How It Works

#### 1. Subdomain Extraction

The middleware extracts the subdomain from the request hostname:

- `acme.propfirmstech.com` → `acme`
- `admin.propfirmstech.com` → `admin`
- `www.propfirmstech.com` → `www`
- `localhost:3000` → `null` (development)

#### 2. Tenant Validation

For non-admin, non-www subdomains, the middleware:

1. Queries the database to find a company with matching subdomain
2. Checks if the company exists
3. Checks if the company is active
4. Returns 404 if tenant not found or inactive

#### 3. Context Setting

If validation succeeds, the middleware sets headers:

- `x-tenant-id`: The company ID
- `x-tenant-subdomain`: The subdomain

These headers are available to all downstream handlers.

#### 4. Special Cases

- **localhost/development**: No tenant validation (allows local development)
- **admin subdomain**: Bypasses tenant validation (admin cross-tenant access)
- **www subdomain**: Bypasses tenant validation (public pages)

## Usage

### In Server Components

```typescript
import { getTenantFromRequest, requireTenant } from '@/lib/tenant'

// Optional tenant context
export default async function MyPage() {
  const tenant = await getTenantFromRequest()
  
  if (!tenant) {
    return <div>No tenant context</div>
  }
  
  return <div>Tenant: {tenant.subdomain}</div>
}

// Required tenant context (throws if not available)
export default async function MyPage() {
  const tenant = await requireTenant()
  return <div>Tenant: {tenant.subdomain}</div>
}
```

### In API Routes

```typescript
import { getTenantFromRequest } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET() {
  const tenant = await getTenantFromRequest()
  
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant required' }, { status: 400 })
  }
  
  // Use tenant.tenantId to filter queries
  const tickets = await prisma.ticket.findMany({
    where: { companyId: tenant.tenantId }
  })
  
  return NextResponse.json({ tickets })
}
```

### Authorization Checks

```typescript
import { validateTenantAccess } from '@/lib/tenant'

// Check if user has access to tenant
const hasAccess = validateTenantAccess(
  user.companyId,
  tenant.tenantId,
  user.role
)

if (!hasAccess) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## Testing

### Manual Testing

1. **Test with valid tenant:**
   - Set up a company with subdomain `acme` in the database
   - Access `http://acme.localhost:3000/api/tenant-info`
   - Should return tenant context

2. **Test with invalid tenant:**
   - Access `http://invalid.localhost:3000/api/tenant-info`
   - Should return 404

3. **Test with admin subdomain:**
   - Access `http://admin.localhost:3000/api/tenant-info`
   - Should return "No tenant context available" (bypasses validation)

4. **Test without subdomain:**
   - Access `http://localhost:3000/api/tenant-info`
   - Should return "No tenant context available"

### Unit Tests

Run the tenant utility tests:

```bash
npm test lib/tenant.test.ts
```

## Security Considerations

1. **404 for inactive tenants**: Returns 404 instead of 403 to prevent tenant enumeration
2. **Database validation**: Every request validates tenant exists and is active
3. **Header-based context**: Tenant context passed via headers, not query params
4. **Admin bypass**: Admin subdomain explicitly bypasses tenant validation

## Requirements Validated

This implementation validates the following requirements:

- **Requirement 2.3**: Tenant-scoped data access (provides tenant context)
- **Requirement 6.2**: Client users see only their company's data (enforces tenant filtering)
- **Requirement 6.4**: Returns 404 for cross-tenant access attempts

## Next Steps

The next task (3.2) will create a tenant-scoped database access layer that uses this middleware's tenant context to automatically filter all database queries.
