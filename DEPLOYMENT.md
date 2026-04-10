# Deployment Guide

This guide covers deploying the PropFirmsTech Support Portal to production.

## Pre-Deployment Checklist

- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] SMTP credentials obtained (if using email notifications)
- [ ] Domain/subdomain DNS configured
- [ ] SSL certificates ready (or using platform SSL)
- [ ] Backup strategy in place

## Environment Setup

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"

# SMTP (Optional - for email notifications)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-username"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM_EMAIL="noreply@yourdomain.com"
SMTP_REPLY_TO="support@yourdomain.com"

# Application
NODE_ENV="production"
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Push code to GitHub/GitLab/Bitbucket
   - Import project in Vercel dashboard

2. **Configure Environment Variables**
   - Add all environment variables in Vercel project settings
   - Ensure `DATABASE_URL` points to production database

3. **Configure Build Settings**
   ```
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Run migrations manually after first deploy:
     ```bash
     npx prisma migrate deploy
     ```

### Option 2: Railway

1. **Create New Project**
   - Connect GitHub repository
   - Railway auto-detects Next.js

2. **Add PostgreSQL Database**
   - Add PostgreSQL service in Railway
   - Copy `DATABASE_URL` to environment variables

3. **Configure Environment Variables**
   - Add all required variables in Railway dashboard

4. **Deploy**
   - Railway automatically builds and deploys
   - Migrations run automatically if configured in build script

### Option 3: Docker (Self-Hosted)

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies
   FROM base AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   
   # Build application
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npx prisma generate
   RUN npm run build
   
   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

2. **Create docker-compose.yml**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=${DATABASE_URL}
         - NEXTAUTH_URL=${NEXTAUTH_URL}
         - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
       depends_on:
         - db
     
     db:
       image: postgres:14
       environment:
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=postgres
         - POSTGRES_DB=propfirmstech
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

3. **Deploy**
   ```bash
   docker-compose up -d
   docker-compose exec app npx prisma migrate deploy
   ```

## Database Migration

### Initial Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

### Ongoing Migrations

When schema changes are made:

```bash
# Create migration (development)
npx prisma migrate dev --name description_of_change

# Apply to production
npx prisma migrate deploy
```

## Database Backup

### Automated Backups

**PostgreSQL (pg_dump)**
```bash
# Create backup
pg_dump -U username -d database_name -F c -f backup_$(date +%Y%m%d).dump

# Restore backup
pg_restore -U username -d database_name backup_20240101.dump
```

**Automated Script (cron)**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup-script.sh
```

### Backup Script Example

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE_URL="postgresql://user:pass@host:5432/db"

pg_dump $DATABASE_URL -F c -f "$BACKUP_DIR/backup_$DATE.dump"

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.dump" -mtime +7 -delete
```

## SSL/TLS Configuration

### Using Platform SSL (Vercel/Railway)
- Automatic SSL certificates provided
- No additional configuration needed

### Using Let's Encrypt (Self-Hosted)
```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring and Logging

### Application Monitoring

**Recommended Tools:**
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (infrastructure monitoring)

**Setup Sentry:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### Database Monitoring

**PostgreSQL Monitoring:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('database_name'));

-- Check slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Performance Optimization

### Database Indexing

Key indexes are already defined in Prisma schema:
- User email + companyId (unique)
- Ticket companyId (for tenant filtering)
- Comment ticketId (for comment queries)

### Caching Strategy

**Redis for Session Storage (Optional):**
```bash
npm install @upstash/redis
```

Configure in `lib/auth.ts`:
```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})
```

### CDN for Static Assets

**Cloudflare/Vercel Edge:**
- Automatically handled by platform
- Configure cache headers in `next.config.js`

## Security Hardening

### Environment Security
- Never commit `.env` files
- Use secrets management (AWS Secrets Manager, Vault)
- Rotate credentials regularly

### Application Security
- Enable CORS restrictions
- Implement rate limiting
- Use security headers

**Add to `next.config.js`:**
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

## Rollback Procedure

### Application Rollback

**Vercel:**
```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-url>
```

**Docker:**
```bash
# Rollback to previous image
docker-compose down
docker-compose up -d --force-recreate
```

### Database Rollback

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup
pg_restore -U username -d database_name backup.dump
```

## Health Checks

### Application Health Endpoint

Already implemented at `/api/health`:
```typescript
// Returns 200 OK if app is healthy
GET /api/health
```

### Database Health Check

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple app instances behind load balancer
- Use shared session store (Redis)
- Ensure database can handle concurrent connections

### Database Scaling
- Connection pooling (PgBouncer)
- Read replicas for reporting queries
- Vertical scaling (increase resources)

### File Storage Scaling
- Move uploads to S3/Cloudinary
- Implement CDN for image delivery

## Post-Deployment Verification

1. **Test Authentication**
   - Admin login
   - Client login
   - Logout functionality

2. **Test Core Features**
   - Create ticket
   - Add comment
   - Upload image
   - Change ticket status

3. **Test Access Control**
   - Verify tenant isolation
   - Test role-based permissions

4. **Monitor Logs**
   - Check for errors
   - Verify database queries
   - Monitor response times

## Support and Maintenance

### Regular Maintenance Tasks
- Weekly database backups verification
- Monthly security updates
- Quarterly dependency updates
- Annual SSL certificate renewal (if manual)

### Emergency Contacts
- Database Administrator: [contact]
- DevOps Lead: [contact]
- Security Team: [contact]

## Troubleshooting

### Common Issues

**Database Connection Timeout:**
```bash
# Increase connection pool size
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

**Out of Memory:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096"
```

**Slow Queries:**
```sql
-- Enable query logging
ALTER DATABASE database_name SET log_min_duration_statement = 1000;
```

## Conclusion

This deployment guide covers the essential steps for deploying the PropFirmsTech Support Portal to production. Always test deployments in a staging environment before applying to production.

For additional support, refer to the main README.md or contact the development team.
