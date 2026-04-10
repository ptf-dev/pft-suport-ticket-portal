# Coolify Deployment Guide

Complete guide for deploying the PropFirmsTech Support Portal on Coolify.

## Overview

This guide covers deploying a Next.js 14 multi-tenant support portal with PostgreSQL on Coolify, including:
- Application deployment with automatic builds
- PostgreSQL database setup
- Environment variable configuration
- Domain and SSL setup
- Database migrations
- Monitoring and maintenance

## Prerequisites

- Coolify instance running (self-hosted or cloud)
- Domain name with DNS access
- GitHub/GitLab repository access
- SMTP credentials (for email notifications)

## Step 1: Create New Project in Coolify

1. **Log into Coolify Dashboard**
   - Navigate to your Coolify instance
   - Click "New Project"

2. **Project Configuration**
   - Project Name: `propfirmstech-support-portal`
   - Description: Multi-tenant support ticketing system
   - Environment: Production

## Step 2: Add PostgreSQL Database

1. **Create Database Service**
   - In your project, click "Add Resource"
   - Select "Database" → "PostgreSQL"
   - Version: PostgreSQL 14 or higher

2. **Database Configuration**
   ```
   Name: propfirmstech-db
   Database Name: propfirmstech_support_portal
   Username: propfirmstech_user
   Password: [Generate secure password]
   Port: 5432 (internal)
   ```

3. **Database Settings**
   - Enable persistent storage: ✓
   - Storage size: 10GB (adjust based on needs)
   - Enable automatic backups: ✓
   - Backup retention: 7 days

4. **Save and Deploy Database**
   - Click "Deploy"
   - Wait for database to be ready (green status)
   - Copy the internal connection URL (format: `postgresql://user:pass@postgres:5432/db`)

## Step 3: Add Application Service

1. **Create Application**
   - Click "Add Resource" → "Application"
   - Select "Public Repository" or connect your Git provider

2. **Repository Configuration**
   ```
   Repository URL: https://github.com/your-org/propfirmstech-support-portal
   Branch: main
   Build Pack: nixpacks (auto-detected for Next.js)
   ```

3. **Build Configuration**
   ```
   Build Command: npm run build
   Start Command: npm start
   Port: 3000
   Install Command: npm install
   ```

4. **Advanced Build Settings**
   - Node.js Version: 18 or higher
   - Enable build cache: ✓
   - Build timeout: 600 seconds

## Step 4: Configure Environment Variables

In the Application settings, add these environment variables:

### Database Configuration

```env
DATABASE_URL=postgresql://propfirmstech_user:YOUR_PASSWORD@propfirmstech-db:5432/propfirmstech_support_portal?schema=public
```

**Note**: Use the internal database connection URL from Step 2. Coolify handles internal networking.

### NextAuth Configuration

```env
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

Generate secret:
```bash
openssl rand -base64 32
```

### SMTP Configuration (Email Notifications)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_REPLY_TO=support@yourdomain.com
```

### Application Configuration

```env
NODE_ENV=production
```

### Optional: Performance Tuning

```env
NODE_OPTIONS=--max-old-space-size=2048
```

## Step 5: Domain and SSL Configuration

1. **Add Domain**
   - In Application settings, go to "Domains"
   - Click "Add Domain"
   - Enter your domain: `yourdomain.com`
   - Add www subdomain if needed: `www.yourdomain.com`

2. **DNS Configuration**
   
   Add these DNS records at your domain provider:
   
   ```
   Type: A
   Name: @
   Value: [Your Coolify server IP]
   TTL: 3600
   
   Type: A
   Name: www
   Value: [Your Coolify server IP]
   TTL: 3600
   ```

3. **SSL Certificate**
   - Coolify automatically provisions Let's Encrypt SSL
   - Enable "Force HTTPS": ✓
   - Wait for SSL certificate to be issued (2-5 minutes)

4. **Multi-tenant Subdomains (Optional)**
   
   For tenant-specific subdomains:
   ```
   Type: A
   Name: *
   Value: [Your Coolify server IP]
   TTL: 3600
   ```
   
   Then add wildcard domain in Coolify:
   - Domain: `*.yourdomain.com`
   - Enable SSL for wildcard

## Step 6: Deploy Application

1. **Initial Deployment**
   - Click "Deploy" button
   - Monitor build logs in real-time
   - Wait for deployment to complete (3-5 minutes)

2. **Verify Build Success**
   - Check logs for "Build successful"
   - Verify application is running (green status)

## Step 7: Run Database Migrations

After first deployment, run Prisma migrations:

1. **Access Application Console**
   - In Coolify, go to Application → "Terminal"
   - Or use SSH to connect to your Coolify server

2. **Run Migrations**
   ```bash
   # Navigate to application directory
   cd /path/to/app
   
   # Run migrations
   npx prisma migrate deploy
   ```

3. **Verify Migration Success**
   ```bash
   # Check database tables
   npx prisma studio
   ```

## Step 8: Seed Database (Optional)

For initial setup with test data:

```bash
npm run db:seed
```

This creates:
- 1 admin user (`admin@propfirmstech.com` / `password123`)
- 3 sample companies
- 4 client users
- Sample tickets and comments

**Important**: Change default passwords immediately!

## Step 9: Post-Deployment Verification

1. **Test Application Access**
   - Visit `https://yourdomain.com`
   - Verify landing page loads

2. **Test Authentication**
   - Navigate to `/login`
   - Test admin login
   - Test client login

3. **Test Core Features**
   - Create a ticket
   - Add a comment
   - Upload an image
   - Change ticket status

4. **Test Email Notifications**
   - Trigger a notification event
   - Verify email delivery

5. **Check Logs**
   - Review application logs in Coolify
   - Look for any errors or warnings

## Monitoring and Maintenance

### Application Monitoring

1. **Coolify Built-in Monitoring**
   - CPU usage
   - Memory usage
   - Network traffic
   - Application logs

2. **Health Checks**
   - Coolify automatically monitors `/api/health` endpoint
   - Configure custom health check interval if needed

3. **Log Management**
   - Access logs via Coolify dashboard
   - Set log retention period
   - Export logs for analysis

### Database Monitoring

1. **Database Metrics**
   - Monitor connection count
   - Track database size
   - Review slow queries

2. **Database Backups**
   - Coolify automatic backups (configured in Step 2)
   - Manual backup:
     ```bash
     pg_dump -U propfirmstech_user propfirmstech_support_portal > backup.sql
     ```

3. **Restore from Backup**
   ```bash
   psql -U propfirmstech_user propfirmstech_support_portal < backup.sql
   ```

## Continuous Deployment

### Automatic Deployments

1. **Enable Webhook**
   - In Coolify Application settings
   - Enable "Deploy on Push"
   - Copy webhook URL

2. **Configure GitHub Webhook**
   - Go to GitHub repository settings
   - Add webhook with Coolify URL
   - Select "Push" events
   - Save webhook

3. **Automatic Deployment Flow**
   - Push to main branch
   - GitHub triggers webhook
   - Coolify automatically builds and deploys
   - Zero-downtime deployment

### Manual Deployments

- Click "Deploy" button in Coolify dashboard
- Select specific commit or branch
- Monitor deployment progress

## Scaling and Performance

### Horizontal Scaling

1. **Add More Instances**
   - In Application settings, increase replicas
   - Coolify handles load balancing automatically

2. **Database Connection Pooling**
   - Update DATABASE_URL:
     ```
     postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
     ```

### Vertical Scaling

1. **Increase Resources**
   - In Application settings → Resources
   - Adjust CPU limits
   - Adjust memory limits
   - Restart application

2. **Database Resources**
   - Increase database storage
   - Adjust PostgreSQL configuration
   - Consider read replicas for heavy loads

### Performance Optimization

1. **Enable Caching**
   - Add Redis service in Coolify
   - Configure Next.js caching

2. **CDN Integration**
   - Use Cloudflare in front of Coolify
   - Cache static assets
   - Enable DDoS protection

## Security Best Practices

### Application Security

1. **Environment Variables**
   - Never commit `.env` files
   - Use Coolify's encrypted environment variables
   - Rotate secrets regularly

2. **Database Security**
   - Use strong passwords
   - Restrict database access to internal network only
   - Enable SSL for database connections

3. **Network Security**
   - Enable Coolify firewall
   - Restrict SSH access
   - Use VPN for administrative access

### SSL/TLS

- Coolify automatically renews Let's Encrypt certificates
- Force HTTPS enabled
- HSTS headers configured

### Backup Strategy

1. **Automated Backups**
   - Database: Daily automatic backups (7-day retention)
   - Application: Git repository serves as backup

2. **Disaster Recovery**
   - Document recovery procedures
   - Test restore process quarterly
   - Keep offsite backups

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check build logs in Coolify
# Common causes:
# - Missing environment variables
# - Node.js version mismatch
# - Dependency installation failures

# Solution: Review logs and fix configuration
```

**Database Connection Errors**
```bash
# Verify DATABASE_URL is correct
# Check database service is running
# Test connection:
psql $DATABASE_URL -c "SELECT 1"
```

**Application Not Starting**
```bash
# Check application logs
# Verify port 3000 is correct
# Ensure all environment variables are set
# Check memory limits
```

**SSL Certificate Issues**
```bash
# Verify DNS records are correct
# Wait 5-10 minutes for propagation
# Check Coolify SSL logs
# Manually trigger certificate renewal if needed
```

### Getting Help

1. **Coolify Documentation**: https://coolify.io/docs
2. **Coolify Discord**: Community support
3. **Application Logs**: Check Coolify dashboard
4. **Database Logs**: Access via Coolify terminal

## Maintenance Schedule

### Daily
- Monitor application health
- Review error logs
- Check disk space

### Weekly
- Review performance metrics
- Check backup success
- Update dependencies (if needed)

### Monthly
- Security updates
- Database optimization
- Review and rotate logs

### Quarterly
- Test disaster recovery
- Review and update documentation
- Performance audit

## Cost Optimization

1. **Resource Monitoring**
   - Right-size application resources
   - Monitor database usage
   - Remove unused services

2. **Storage Management**
   - Clean up old logs
   - Optimize image storage
   - Archive old tickets

3. **Backup Optimization**
   - Adjust retention periods
   - Compress backups
   - Use incremental backups

## Migration from Other Platforms

### From Vercel/Railway

1. Export environment variables
2. Create Coolify project
3. Configure database
4. Import environment variables
5. Deploy application
6. Run migrations
7. Update DNS records

### From Docker/Self-Hosted

1. Push code to Git repository
2. Follow standard Coolify setup
3. Migrate database data:
   ```bash
   pg_dump old_db > dump.sql
   psql new_db < dump.sql
   ```
4. Update environment variables
5. Deploy and verify

## Conclusion

Your PropFirmsTech Support Portal is now deployed on Coolify with:
- ✓ Automatic SSL certificates
- ✓ Continuous deployment from Git
- ✓ PostgreSQL database with backups
- ✓ Environment variable management
- ✓ Built-in monitoring and logs
- ✓ Zero-downtime deployments

For additional support, refer to Coolify documentation or contact your DevOps team.
