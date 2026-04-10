# Middleware Integration Tests

## Manual Testing Guide

Since the test framework is not yet configured (will be done in task 20.1), here are manual tests to verify the middleware implementation.

### Prerequisites

1. Ensure the database is running and seeded with test data
2. Run the development server: `npm run dev`
3. You'll need to test with actual subdomains or modify your hosts file

### Test Cases

#### Test 1: Valid Tenant Access

**Setup:**
```sql
-- Ensure a company exists with subdomain 'acme'
INSERT INTO companies (id, name, subdomain, "contactEmail", "isActive", "createdAt", "updatedAt")
VALUES ('test-company-1', 'Acme Corp', 'acme', 'contact@acme.com', true, NOW(), NOW());
```

**Test:**
1. Access: `http://acme.localhost:3000/api/tenant-info`
2. Expected Response:
```json
{
  "success": true,
  "tenant": {
    "tenantId": "test-company-1",
    "subdomain": "acme"
  }
}
```

#### Test 2: Invalid Tenant (Not Found)

**Test:**
1. Access: `http://nonexistent.localhost:3000/api/tenant-info`
2. Expected Response: `404 Not Found` with body "Tenant not found"

#### Test 3: Inactive Tenant

**Setup:**
```sql
-- Create an inactive company
INSERT INTO companies (id, name, subdomain, "contactEmail", "isActive", "createdAt", "updatedAt")
VALUES ('test-company-2', 'Inactive Corp', 'inactive', 'contact@inactive.com', false, NOW(), NOW());
```

**Test:**
1. Access: `http://inactive.localhost:3000/api/tenant-info`
2. Expected Response: `404 Not Found` with body "Tenant not found"
3. Note: Returns 404 (not 403) to prevent tenant enumeration

#### Test 4: Admin Subdomain (Bypass)

**Test:**
1. Access: `http://admin.localhost:3000/api/tenant-info`
2. Expected Response:
```json
{
  "error": "No tenant context available"
}
```
3. Note: Admin subdomain bypasses tenant validation, so no tenant context is set

#### Test 5: No Subdomain (Development)

**Test:**
1. Access: `http://localhost:3000/api/tenant-info`
2. Expected Response:
```json
{
  "error": "No tenant context available"
}
```
3. Note: Localhost without subdomain bypasses tenant validation

#### Test 6: WWW Subdomain (Public)

**Test:**
1. Access: `http://www.localhost:3000/api/tenant-info`
2. Expected Response:
```json
{
  "error": "No tenant context available"
}
```
3. Note: WWW subdomain bypasses tenant validation for public pages

### Testing with Real Subdomains

If you want to test with real subdomains locally, modify your `/etc/hosts` file:

```
127.0.0.1 acme.localhost
127.0.0.1 admin.localhost
127.0.0.1 www.localhost
127.0.0.1 invalid.localhost
```

Then access using these hostnames.

### Automated Testing

Once the test framework is set up (task 20.1), convert these manual tests to automated integration tests using the following structure:

```typescript
describe('Tenant Resolution Middleware', () => {
  it('should set tenant context for valid subdomain', async () => {
    // Test implementation
  })

  it('should return 404 for invalid subdomain', async () => {
    // Test implementation
  })

  it('should return 404 for inactive tenant', async () => {
    // Test implementation
  })

  it('should bypass validation for admin subdomain', async () => {
    // Test implementation
  })

  it('should bypass validation for localhost', async () => {
    // Test implementation
  })
})
```

### Verification Checklist

- [ ] Valid tenant returns tenant context
- [ ] Invalid tenant returns 404
- [ ] Inactive tenant returns 404
- [ ] Admin subdomain bypasses validation
- [ ] Localhost bypasses validation
- [ ] WWW subdomain bypasses validation
- [ ] Tenant context headers are set correctly
- [ ] No TypeScript errors in middleware files
