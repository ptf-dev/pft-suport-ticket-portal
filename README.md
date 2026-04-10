# PropFirmsTech Support Portal

A multi-tenant SaaS support ticketing system for proprietary trading firms. Built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## Features

- **Multi-tenant architecture** with subdomain-based tenant isolation
- **Role-based access control** (Admin and Client roles)
- **Support ticket management** with status tracking and priorities
- **Image attachments** for tickets
- **Internal and public comments** on tickets
- **Email notifications** (SMTP-based)
- **Secure authentication** with NextAuth and bcrypt

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Email**: SMTP (configurable)

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- SMTP server credentials (for email notifications)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Database Configuration

```env
DATABASE_URL="postgresql://username:password@localhost:5432/propfirmstech_support_portal?schema=public"
```

Replace `username`, `password`, and database name with your PostgreSQL credentials.

### NextAuth Configuration

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

Generate a secure secret with:
```bash
openssl rand -base64 32
```

### SMTP Email Configuration

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-username"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM_EMAIL="noreply@propfirmstech.com"
SMTP_REPLY_TO="support@propfirmstech.com"
```

Configure these with your SMTP provider credentials (Gmail, SendGrid, Mailgun, etc.).

### Application Configuration

```env
NODE_ENV="development"
```

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd propfirmstech-support-portal
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration values.

4. **Set up the database**

Create a PostgreSQL database:

```bash
createdb propfirmstech_support_portal
```

Or using psql:

```sql
CREATE DATABASE propfirmstech_support_portal;
```

5. **Run database migrations**

```bash
npm run db:migrate
```

This will create all necessary tables and schema in your database.

6. **Seed the database (optional)**

```bash
npm run db:seed
```

This creates sample data for testing including:
- 1 admin user
- 3 sample companies (Apex Trading, Quantum Capital, Elite Prop)
- 4 client users (distributed across companies)
- 6 sample tickets with various statuses and priorities
- 7 sample comments (public and internal)

**Test Credentials:**
- Admin: `admin@propfirmstech.com` / `password123`
- Client (Apex): `john.doe@apextrading.com` / `password123`
- Client (Quantum): `mike.johnson@quantumcapital.com` / `password123`
- Client (Elite): `emma.wilson@eliteprop.com` / `password123`

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database (without migrations)
- `npm run db:migrate` - Create and apply database migrations
- `npm run db:migrate:deploy` - Apply migrations in production
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Database Management

### Creating Migrations

After modifying the Prisma schema:

```bash
npm run db:migrate
```

This creates a new migration and applies it to your database.

### Viewing Database

Open Prisma Studio to view and edit data:

```bash
npm run db:studio
```

### Resetting Database

To reset the database (WARNING: deletes all data):

```bash
npx prisma migrate reset
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin interface routes
│   ├── portal/            # Client portal routes
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # Shared React components
├── lib/                   # Utilities and services
├── prisma/               # Database schema and migrations
│   └── schema.prisma     # Prisma schema definition
├── public/               # Static assets
└── .env                  # Environment variables (not in git)
```

## Authentication

The system uses NextAuth.js with credentials provider:

- **Admin users**: Full access to all companies and tickets
- **Client users**: Access restricted to their company's data only

### Default Credentials (after seeding)

After running `npm run db:seed`, you can log in with these test accounts:

- **Admin**: `admin@propfirmstech.com` / `password123`
- **Client (Apex Trading)**: `john.doe@apextrading.com` / `password123`
- **Client (Quantum Capital)**: `mike.johnson@quantumcapital.com` / `password123`
- **Client (Elite Prop)**: `emma.wilson@eliteprop.com` / `password123`

**Note**: Change these passwords in production!

## Multi-Tenant Architecture

The portal uses subdomain-based tenant resolution:

- `{tenant}.propfirmstech.com/portal` - Client portal
- `admin.propfirmstech.com/admin` - Admin dashboard
- `www.propfirmstech.com` - Public landing page

For local development, you can use localhost with different ports or configure local DNS.

## Email Notifications

Configure SMTP settings in `.env` to enable email notifications:

- Ticket status changes
- New comments
- Ticket resolution
- Custom triggers

Each company can configure their notification preferences through the portal settings.

## Production Deployment

1. **Set environment variables** in your hosting platform
2. **Set `NODE_ENV=production`**
3. **Run database migrations**:
   ```bash
   npm run db:migrate:deploy
   ```
4. **Build the application**:
   ```bash
   npm run build
   ```
5. **Start the server**:
   ```bash
   npm start
   ```

### Recommended Hosting

- **Application**: Vercel, Railway, Render, or any Node.js host
- **Database**: Supabase, Neon, Railway, or managed PostgreSQL
- **File Storage**: AWS S3, Cloudinary, or similar (for image uploads)

## Security Considerations

- All passwords are hashed with bcrypt
- Session-based authentication with NextAuth
- Tenant isolation enforced at database and session layers
- Role-based access control on all routes
- Input validation on all forms
- SQL injection prevention via Prisma ORM

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and credentials in `.env` are correct:

```bash
psql -U username -d propfirmstech_support_portal
```

### Prisma Client Issues

Regenerate the Prisma client:

```bash
npm run db:generate
```

### Port Already in Use

Change the port in `package.json` dev script:

```json
"dev": "next dev -p 3001"
```

## Support

For issues and questions, please open an issue in the repository or contact the development team.

## License

Proprietary - PropFirmsTech
# pft-suport-ticket-portal
