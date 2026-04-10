# Lib Directory

This directory contains utilities and services for the PropFirmsTech Support Portal.

## Structure

- `auth/` - Authentication and authorization utilities
- `db/` - Database access layer and Prisma client
- `tenant/` - Multi-tenant resolution and scoping utilities
- `email/` - Email notification service
- `upload/` - File upload and image handling service

## Prisma Client

The `prisma.ts` file exports a singleton instance of the Prisma Client to prevent multiple instances in development.

### Usage

```typescript
import { prisma } from '@/lib/prisma'

// Use the client in your API routes or server components
const companies = await prisma.company.findMany()
```

### Singleton Pattern

The singleton pattern prevents the creation of multiple Prisma Client instances during hot reloading in development:

- In production: Creates a single Prisma Client instance
- In development: Caches the instance on `globalThis` to survive hot reloads
- Includes query logging in development for debugging

### Database Connection

The Prisma Client connects to PostgreSQL using the `DATABASE_URL` environment variable defined in `.env`:

```
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

### Available Scripts

- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database (development)
- `npm run db:migrate` - Create and apply migrations (development)
- `npm run db:migrate:deploy` - Apply migrations (production)
- `npm run db:studio` - Open Prisma Studio GUI
