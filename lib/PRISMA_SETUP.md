# Prisma Client Configuration

This document describes the Prisma client setup for the PropFirmsTech Support Portal.

## Overview

The Prisma client is configured with a singleton pattern to prevent multiple instances during development hot reloading. This is a best practice recommended by Prisma for Next.js applications.

## Files

- `lib/prisma.ts` - Prisma client singleton export
- `lib/prisma-example.ts` - Example usage patterns
- `lib/test-prisma-connection.ts` - Connection test script

## Singleton Pattern

The singleton pattern implementation:

```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### How it works

1. **Production**: Creates a single Prisma Client instance
2. **Development**: Caches the instance on `globalThis` to survive hot reloads
3. **Logging**: Enables query logging in development for debugging

## Database Connection

The Prisma client connects to PostgreSQL using the `DATABASE_URL` environment variable:

```env
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

### Configuration

- **Host**: PostgreSQL server hostname
- **Port**: PostgreSQL server port (default: 5432)
- **Database**: Database name
- **Schema**: Database schema (default: public)

## Usage

Import the Prisma client in your API routes or server components:

```typescript
import { prisma } from '@/lib/prisma'

// Query example
const companies = await prisma.company.findMany()

// Create example
const company = await prisma.company.create({
  data: {
    name: 'Example Company',
    subdomain: 'example',
    contactEmail: 'contact@example.com',
  },
})
```

## Available Scripts

The following npm scripts are available for database management:

- `npm run db:generate` - Generate Prisma Client from schema
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply migrations (development)
- `npm run db:migrate:deploy` - Apply migrations (production)
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio GUI

## Testing Connection

To test the database connection:

```bash
npx tsx lib/test-prisma-connection.ts
```

This will:
1. Connect to the database
2. Run a simple query
3. Disconnect from the database

## Next Steps

After configuring the Prisma client:

1. Run migrations to create database tables: `npm run db:migrate`
2. Seed the database with test data: `npm run db:seed`
3. Start using the Prisma client in your application

## References

- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Best Practices for Next.js](https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices)
- [Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
