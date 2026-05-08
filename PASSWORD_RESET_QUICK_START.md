# Password Reset Feature - Quick Start Guide

## 🚀 Quick Setup

### 1. Apply Database Migration

```bash
# If your database is running
npx prisma migrate dev

# Or apply manually
npx prisma db push
```

### 2. Configure SMTP (Required for sending emails)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/admin/settings/smtp`

3. Enter your SMTP settings:
   - **Host**: smtp.gmail.com (for Gmail)
   - **Port**: 587 (or 465 for SSL)
   - **Secure**: Enable for port 465
   - **Username**: your-email@gmail.com
   - **Password**: your-app-password
   - **Sender Email**: your-email@gmail.com
   - **Sender Name**: PropFirmsTech Support

4. Click "Test Connection" to verify

5. Click "Save & Activate"

### 3. Test the Feature

#### Option A: Using the UI

1. Go to: `http://localhost:3000/login`
2. Click "Forgot password?"
3. Enter your email address
4. Check your email for the reset link
5. Click the link and set a new password

#### Option B: Using API

```bash
# Request password reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Check your email for the token, then reset password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"YOUR_TOKEN_FROM_EMAIL","password":"newpassword123"}'
```

## 📧 SMTP Configuration Examples

### Gmail

```
Host: smtp.gmail.com
Port: 587
Secure: No (use TLS)
Username: your-email@gmail.com
Password: your-app-password (not your regular password!)
```

**Note**: You need to create an App Password in your Google Account settings.

### Outlook/Office 365

```
Host: smtp.office365.com
Port: 587
Secure: No (use TLS)
Username: your-email@outlook.com
Password: your-password
```

### SendGrid

```
Host: smtp.sendgrid.net
Port: 587
Secure: No (use TLS)
Username: apikey
Password: your-sendgrid-api-key
```

### Mailgun

```
Host: smtp.mailgun.org
Port: 587
Secure: No (use TLS)
Username: postmaster@your-domain.mailgun.org
Password: your-mailgun-password
```

## 🎨 UI Pages

### Forgot Password Page
- **URL**: `/forgot-password`
- **Features**: Email input, success/error messages, back to login link

### Reset Password Page
- **URL**: `/reset-password?token=xxx`
- **Features**: Token validation, password input with show/hide, confirmation, auto-redirect

### Login Page (Updated)
- **URL**: `/login`
- **New Feature**: "Forgot password?" link next to password field

## 🔒 Security Features

- ✅ Email enumeration protection
- ✅ Secure token generation (32-byte random)
- ✅ Token expiry (1 hour)
- ✅ One-time use tokens
- ✅ Password hashing with bcrypt
- ✅ HTTPS recommended for production

## 🧪 Testing Checklist

- [ ] Request reset for existing user → Email received
- [ ] Request reset for non-existing user → Same success message
- [ ] Click reset link → Shows password form
- [ ] Enter new password → Success message
- [ ] Login with new password → Works
- [ ] Try to reuse token → Fails (already used)
- [ ] Wait 1 hour → Token expires

## 🐛 Troubleshooting

### Email Not Received?

1. **Check SMTP configuration** in admin panel
2. **Check spam folder**
3. **Test SMTP connection** in admin panel
4. **Check server logs** for errors:
   ```bash
   # Look for email sending errors
   tail -f logs/app.log
   ```

### Token Invalid/Expired?

1. Tokens expire after **1 hour**
2. Request a **new reset link**
3. Check **system time** is correct

### Password Reset Not Working?

1. **Check database migration** was applied:
   ```bash
   npx prisma migrate status
   ```
2. **Check user is active** in database
3. **Check server logs** for errors

## 📝 Environment Variables

Make sure these are set in your `.env` file:

```env
# Required
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# SMTP is configured via admin panel, not env vars
```

## 🎯 User Flow

```
1. User clicks "Forgot password?" on login page
   ↓
2. User enters email address
   ↓
3. User receives email with reset link
   ↓
4. User clicks link (valid for 1 hour)
   ↓
5. User enters new password
   ↓
6. User is redirected to login
   ↓
7. User logs in with new password ✅
```

## 📚 API Endpoints

### Request Password Reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Validate Token
```http
GET /api/auth/reset-password?token=abc123...
```

### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "password": "newpassword123"
}
```

## 🔧 Maintenance

### Cleanup Expired Tokens

Create a script to run periodically:

```typescript
// scripts/cleanup-expired-tokens.ts
import { PasswordResetService } from '@/lib/password-reset'

async function cleanup() {
  const count = await PasswordResetService.clearExpiredTokens()
  console.log(`Cleared ${count} expired tokens`)
}

cleanup()
```

Run daily via cron:
```bash
0 2 * * * cd /path/to/app && node scripts/cleanup-expired-tokens.js
```

## 🚀 Production Deployment

Before deploying to production:

1. ✅ Set `NEXTAUTH_URL` to your production domain
2. ✅ Use HTTPS (required for security)
3. ✅ Configure production SMTP settings
4. ✅ Test email delivery in production
5. ✅ Set up token cleanup cron job
6. ✅ Consider implementing rate limiting
7. ✅ Monitor email sending logs

## 📞 Support

Need help? Check:
- Full documentation: `PASSWORD_RESET_FEATURE.md`
- Server logs for errors
- SMTP configuration in admin panel
- Database migration status

---

**Ready to go!** 🎉

Start your server and test the feature:
```bash
npm run dev
```

Then visit: `http://localhost:3000/login` and click "Forgot password?"
