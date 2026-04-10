# Testing the Tenant Resolution Middleware

## Quick Start

After seeding the database, you can test the middleware with these subdomains:

### Available Test Tenants

From the seed data:
- `apex-trading` - Apex Trading Firm
- `quantum-capital` - Quantum Capital Partners
- `elite-prop` - Elite Prop Trading

### Test URLs (Development)

1. **Valid tenant - Apex Trading:**
   ```
   http://apex-trading.localhost:3000/api/tenant-info
   ```
   Expected: Returns tenant context with tenantId and subdomain

2. **Valid tenant - Quantum Capital:**
   ```
   http://quantum-capital.localhost:3000/api/tenant-info
   ```
   Expected: Returns tenant context

3. **Valid tenant - Elite Prop:**
   ```
   http://elite-prop.localhost:3000/api/tenant-info
   ```
   Expected: Returns tenant context

4. **Invalid tenant:**
   ```
   http://nonexistent.localhost:3000/api/tenant-info
   ```
   Expected: 404 Not Found

5. **Admin subdomain:**
   ```
   http://admin.localhost:3000/api/tenant-info
   ```
   Expected: No tenant context (bypasses validation)

6. **No subdomain:**
   ```
   http://localhost:3000/api/tenant-info
   ```
   Expected: No tenant context (bypasses validation)

## Setup Steps

1. **Ensure database is running:**
   ```bash
   # Check if PostgreSQL is running
   # Connection details should be in .env file
   ```

2. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Seed the database:**
   ```bash
   npm run db:seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Test the middleware:**
   Use curl or your browser to test the URLs above.

## Testing with curl

```bash
# Test valid tenant
curl http://apex-trading.localhost:3000/api/tenant-info

# Test invalid tenant (should return 404)
curl http://invalid.localhost:3000/api/tenant-info

# Test admin subdomain (should return no tenant context)
curl http://admin.localhost:3000/api/tenant-info
```

## Expected Responses

### Valid Tenant
```json
{
  "success": true,
  "tenant": {
    "tenantId": "clxxxxx...",
    "subdomain": "apex-trading"
  }
}
```

### Invalid Tenant
```
404 Not Found
Tenant not found
```

### No Tenant Context (admin/localhost)
```json
{
  "error": "No tenant context available"
}
```

## Troubleshooting

### Issue: "Tenant not found" for valid subdomain

**Solution:**
1. Check if the database is seeded: `npm run db:seed`
2. Verify the company exists in the database
3. Check that `isActive` is `true` for the company

### Issue: Subdomain not being recognized

**Solution:**
1. Ensure you're using `.localhost:3000` format
2. Check that the middleware is running (should see it in server logs)
3. Verify the subdomain matches exactly (case-sensitive)

### Issue: "No tenant context available" for valid tenant

**Solution:**
1. Check middleware.ts is in the root directory
2. Verify the middleware config matcher is correct
3. Check server logs for any errors

## Next Steps

Once the middleware is verified to work:
1. Task 3.2 will create tenant-scoped database access layer
2. Task 3.3 will create additional tenant context utilities
3. Task 3.4 will write property tests for tenant isolation
