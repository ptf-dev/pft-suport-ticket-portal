# Password Reset Feature Documentation

## Overview

This document describes the forgot password/reset password feature implementation for the PropFirmsTech Support Portal.

## Features

### 1. Forgot Password Flow
- Users can request a password reset from the login page
- Secure token generation (32-byte random hex)
- Token expires after 1 hour
- Email with reset link sent to user
- Protection against email enumeration attacks

### 2. Reset Password Flow
- Token validation before showing reset form
- Password strength requirements (minimum 8 characters)
- Password confirmation validation
- Secure password hashing with bcrypt
- Automatic redirect to login after successful reset

### 3. Security Features
- **Email Enumeration Protection**: Always returns success message regardless of whether email exists
- **Token Expiry**: Reset tokens expire after 1 hour
- **Secure Token Generation**: Uses crypto.randomBytes for cryptographically secure tokens
- **Password Hashing**: Passwords are hashed with bcrypt (10 rounds)
- **Token Cleanup**: Expired tokens are cleared from database
- **One-Time Use**: Tokens are deleted after successful password reset

## Architecture

### Database Schema

Added to `User` model in `prisma/schema.prisma`:
```prisma
resetPasswordToken     String?   @unique
resetPasswordExpiresAt DateTime?
```

### API Routes

#### 1. Request Password Reset
**Endpoint**: `POST /api/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (always 200 to prevent enumeration):
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### 2. Validate Reset Token
**Endpoint**: `GET /api/auth/reset-password?token=xxx`

**Response** (200 if valid):
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

**Response** (400 if invalid):
```json
{
  "error": "Invalid or expired reset token"
}
```

#### 3. Reset Password
**Endpoint**: `POST /api/auth/reset-password`

**Request Body**:
```json
{
  "token": "abc123...",
  "password": "newpassword123"
}
```

**Response** (200 if successful):
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

### Services

#### PasswordResetService (`lib/password-reset.ts`)

**Methods**:
- `generateToken()`: Generate secure random token
- `requestPasswordReset(email)`: Create reset token and store in database
- `validateResetToken(token)`: Check if token is valid and not expired
- `resetPassword(token, newPassword)`: Update password and clear token
- `clearExpiredTokens()`: Cleanup job for expired tokens

#### Email Template (`lib/email-templates/password-reset.ts`)

**Function**: `generatePasswordResetEmail(data)`

**Parameters**:
- `userName`: User's display name
- `resetLink`: Full URL with token
- `expiryHours`: Token expiry time (default: 1)

**Returns**:
- `subject`: Email subject line
- `html`: HTML email template
- `text`: Plain text email template

### UI Pages

#### 1. Forgot Password Page (`/forgot-password`)
- Email input form
- Success/error message display
- Link back to login
- Modern gradient design with animations

#### 2. Reset Password Page (`/reset-password?token=xxx`)
- Token validation on page load
- New password input with show/hide toggle
- Confirm password input with show/hide toggle
- Password strength requirements display
- Success message with auto-redirect
- Invalid token error state with helpful actions

#### 3. Login Page Updates
- Added "Forgot password?" link next to password field
- Links to `/forgot-password` page

## User Flow

### Forgot Password Flow

1. User clicks "Forgot password?" on login page
2. User enters email address
3. System generates secure token and stores in database
4. System sends email with reset link (if user exists)
5. User receives email with reset link
6. User clicks link in email

### Reset Password Flow

1. User lands on reset password page with token in URL
2. System validates token (checks existence and expiry)
3. If valid, user sees password reset form
4. User enters new password and confirms
5. System validates password strength and match
6. System updates password and clears token
7. User sees success message
8. User is redirected to login page after 2 seconds

### Error Handling

**Invalid/Expired Token**:
- Shows error message
- Provides button to request new reset link
- Provides button to return to login

**Email Not Found**:
- Returns generic success message (security)
- No email is sent
- User doesn't know if email exists

**Password Validation Errors**:
- Too short (< 8 characters)
- Passwords don't match
- Shows inline error messages

## Email Template

The password reset email includes:
- Professional header with gradient background
- Clear call-to-action button
- Plain text link as fallback
- Warning about expiry time
- Security notice about ignoring if not requested
- Responsive design for mobile devices

## Security Considerations

### 1. Email Enumeration Prevention
Always return the same success message regardless of whether the email exists in the system. This prevents attackers from discovering valid email addresses.

### 2. Token Security
- Tokens are 32-byte random hex strings (64 characters)
- Stored as unique field in database
- Expire after 1 hour
- Deleted after use
- Cannot be reused

### 3. Rate Limiting (Recommended)
Consider implementing rate limiting on the forgot password endpoint to prevent abuse:
- Limit requests per IP address
- Limit requests per email address
- Use exponential backoff

### 4. HTTPS Required
Password reset links should only be sent over HTTPS in production to prevent token interception.

### 5. Password Requirements
- Minimum 8 characters
- Consider adding additional requirements:
  - At least one uppercase letter
  - At least one number
  - At least one special character

## Configuration

### Environment Variables

Required in `.env`:
```env
# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key

# Database
DATABASE_URL=postgresql://...

# SMTP (for sending emails)
# Configured via admin panel at /admin/settings/smtp
```

### SMTP Configuration

The password reset feature requires SMTP to be configured in the admin panel:
1. Navigate to `/admin/settings/smtp`
2. Enter SMTP server details
3. Test connection
4. Activate configuration

## Testing

### Manual Testing

1. **Request Password Reset**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Validate Token**:
   ```bash
   curl http://localhost:3000/api/auth/reset-password?token=YOUR_TOKEN
   ```

3. **Reset Password**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"YOUR_TOKEN","password":"newpassword123"}'
   ```

### Test Scenarios

- [ ] Request reset for existing user
- [ ] Request reset for non-existing user (should return same message)
- [ ] Validate valid token
- [ ] Validate expired token
- [ ] Validate non-existent token
- [ ] Reset password with valid token
- [ ] Reset password with expired token
- [ ] Reset password with mismatched passwords
- [ ] Reset password with weak password
- [ ] Verify old password no longer works
- [ ] Verify new password works for login
- [ ] Verify token is deleted after use
- [ ] Verify token cannot be reused

## Maintenance

### Cleanup Job

Run periodically to clear expired tokens:

```typescript
import { PasswordResetService } from '@/lib/password-reset'

// In a cron job or scheduled task
const clearedCount = await PasswordResetService.clearExpiredTokens()
console.log(`Cleared ${clearedCount} expired tokens`)
```

Consider setting up a cron job to run this daily:
```bash
# Add to crontab
0 2 * * * node scripts/cleanup-expired-tokens.js
```

## Future Enhancements

1. **Rate Limiting**: Implement rate limiting on forgot password endpoint
2. **Email Verification**: Require email verification for new accounts
3. **Password History**: Prevent reuse of recent passwords
4. **Two-Factor Authentication**: Add 2FA support
5. **Account Lockout**: Lock account after multiple failed reset attempts
6. **Audit Logging**: Log all password reset attempts
7. **Custom Email Templates**: Allow admins to customize reset email
8. **SMS Reset**: Alternative reset method via SMS
9. **Security Questions**: Additional verification method
10. **Password Strength Meter**: Visual indicator of password strength

## Troubleshooting

### Email Not Received

1. Check SMTP configuration in admin panel
2. Verify SMTP settings are active
3. Check spam/junk folder
4. Test SMTP connection in admin panel
5. Check server logs for email sending errors

### Token Invalid/Expired

1. Tokens expire after 1 hour
2. Request a new reset link
3. Check system time is correct
4. Verify database connection

### Password Reset Not Working

1. Check database migration was applied
2. Verify bcrypt is installed
3. Check server logs for errors
4. Verify user account is active

## Database Migration

To apply the password reset fields to your database:

```bash
# If database is running
npx prisma migrate dev

# Or apply manually
psql -d your_database -f prisma/migrations/20260508160228_add_password_reset_fields/migration.sql
```

## Files Created/Modified

### New Files
- `lib/password-reset.ts` - Password reset service
- `lib/email-templates/password-reset.ts` - Email template
- `app/api/auth/forgot-password/route.ts` - Forgot password API
- `app/api/auth/reset-password/route.ts` - Reset password API
- `app/forgot-password/page.tsx` - Forgot password UI
- `app/reset-password/page.tsx` - Reset password UI
- `prisma/migrations/20260508160228_add_password_reset_fields/migration.sql` - Database migration
- `PASSWORD_RESET_FEATURE.md` - This documentation

### Modified Files
- `prisma/schema.prisma` - Added reset token fields to User model
- `app/login/page.tsx` - Added forgot password link

## Support

For issues or questions about the password reset feature:
1. Check this documentation
2. Review server logs
3. Test SMTP configuration
4. Contact development team

---

**Version**: 1.0.0  
**Last Updated**: May 8, 2026  
**Author**: Development Team
