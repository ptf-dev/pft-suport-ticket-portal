# Password Reset Feature - Testing Checklist

## 🧪 Complete Testing Guide

Use this checklist to thoroughly test the password reset feature before deploying to production.

---

## ✅ Pre-Testing Setup

- [ ] Database migration applied successfully
- [ ] SMTP configured in admin panel (`/admin/settings/smtp`)
- [ ] SMTP connection tested and working
- [ ] Development server running (`npm run dev`)
- [ ] Test user account exists in database
- [ ] Test email address accessible

---

## 📧 Email Configuration Tests

### SMTP Connection
- [ ] Navigate to `/admin/settings/smtp`
- [ ] Enter SMTP credentials
- [ ] Click "Test Connection"
- [ ] Verify success message appears
- [ ] Click "Save & Activate"
- [ ] Verify settings saved successfully

### Test Email Delivery
- [ ] Send test email from SMTP settings page
- [ ] Check inbox for test email
- [ ] Verify email received within 30 seconds
- [ ] Check spam/junk folder if not in inbox
- [ ] Verify email formatting looks correct

---

## 🔐 Forgot Password Flow Tests

### Happy Path - Existing User
- [ ] Navigate to `/login`
- [ ] Click "Forgot password?" link
- [ ] Verify redirected to `/forgot-password`
- [ ] Enter valid user email address
- [ ] Click "Send Reset Link"
- [ ] Verify success message appears
- [ ] Check email inbox
- [ ] Verify reset email received
- [ ] Verify email contains reset link
- [ ] Verify email formatting is professional

### Email Enumeration Protection
- [ ] Navigate to `/forgot-password`
- [ ] Enter non-existent email address
- [ ] Click "Send Reset Link"
- [ ] Verify same success message appears
- [ ] Verify no email sent (check inbox)
- [ ] Verify no error revealing email doesn't exist

### Form Validation
- [ ] Try submitting empty email field
- [ ] Verify browser validation prevents submission
- [ ] Enter invalid email format (e.g., "notanemail")
- [ ] Verify error message appears
- [ ] Enter valid email format
- [ ] Verify form submits successfully

### UI/UX Tests
- [ ] Verify page loads quickly (< 2 seconds)
- [ ] Verify gradient background displays correctly
- [ ] Verify icon displays correctly
- [ ] Verify "Back to Login" link works
- [ ] Verify "Contact Support" link works
- [ ] Test on mobile device (responsive design)
- [ ] Test on tablet device
- [ ] Test on desktop browser

---

## 🔑 Reset Password Flow Tests

### Happy Path - Valid Token
- [ ] Click reset link from email
- [ ] Verify redirected to `/reset-password?token=xxx`
- [ ] Verify token validation occurs (loading state)
- [ ] Verify password form appears
- [ ] Enter new password (8+ characters)
- [ ] Enter same password in confirm field
- [ ] Click "Reset Password"
- [ ] Verify success message appears
- [ ] Verify auto-redirect to login (2 seconds)
- [ ] Login with new password
- [ ] Verify login successful

### Token Validation
- [ ] Navigate to `/reset-password` without token
- [ ] Verify error message appears
- [ ] Verify "Request New Reset Link" button shown
- [ ] Navigate to `/reset-password?token=invalid`
- [ ] Verify error message appears
- [ ] Navigate to `/reset-password?token=expired`
- [ ] Verify error message appears

### Password Validation
- [ ] Enter password less than 8 characters
- [ ] Verify error message appears
- [ ] Enter valid password in first field
- [ ] Enter different password in confirm field
- [ ] Click "Reset Password"
- [ ] Verify "Passwords do not match" error
- [ ] Enter matching passwords
- [ ] Verify form submits successfully

### Show/Hide Password
- [ ] Verify password fields show dots by default
- [ ] Click eye icon on password field
- [ ] Verify password becomes visible
- [ ] Click eye icon again
- [ ] Verify password hidden again
- [ ] Repeat for confirm password field

### Token Expiry
- [ ] Request password reset
- [ ] Wait 1 hour (or modify expiry time for testing)
- [ ] Click reset link
- [ ] Verify "expired token" error appears
- [ ] Verify cannot reset password with expired token

### Token Reuse Prevention
- [ ] Request password reset
- [ ] Click reset link
- [ ] Reset password successfully
- [ ] Try to use same reset link again
- [ ] Verify error message appears
- [ ] Verify token no longer valid

### UI/UX Tests
- [ ] Verify loading state during token validation
- [ ] Verify smooth transitions between states
- [ ] Verify error states display clearly
- [ ] Verify success state displays clearly
- [ ] Test on mobile device
- [ ] Test on tablet device
- [ ] Test on desktop browser

---

## 🔒 Security Tests

### Email Enumeration
- [ ] Request reset for existing email
- [ ] Note the response message
- [ ] Request reset for non-existing email
- [ ] Verify response message is identical
- [ ] Verify response time is similar (no timing attack)

### Token Security
- [ ] Inspect token in URL
- [ ] Verify token is long (64 characters)
- [ ] Verify token appears random
- [ ] Try to guess token format
- [ ] Verify cannot predict tokens

### Password Security
- [ ] Reset password successfully
- [ ] Check database
- [ ] Verify password is hashed (not plain text)
- [ ] Verify hash is bcrypt format
- [ ] Verify old password hash is different

### Token Cleanup
- [ ] Request multiple password resets
- [ ] Check database for tokens
- [ ] Wait for tokens to expire
- [ ] Run cleanup script: `npm run cleanup:tokens`
- [ ] Verify expired tokens removed from database

---

## 🌐 API Endpoint Tests

### POST /api/auth/forgot-password

#### Valid Request
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```
- [ ] Returns 200 status
- [ ] Returns success message
- [ ] Email sent to user

#### Invalid Email Format
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail"}'
```
- [ ] Returns 400 status
- [ ] Returns error message

#### Missing Email
```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{}'
```
- [ ] Returns 400 status
- [ ] Returns error message

### GET /api/auth/reset-password?token=xxx

#### Valid Token
```bash
curl http://localhost:3000/api/auth/reset-password?token=VALID_TOKEN
```
- [ ] Returns 200 status
- [ ] Returns `{"valid": true, "email": "..."}`

#### Invalid Token
```bash
curl http://localhost:3000/api/auth/reset-password?token=invalid
```
- [ ] Returns 400 status
- [ ] Returns error message

#### Missing Token
```bash
curl http://localhost:3000/api/auth/reset-password
```
- [ ] Returns 400 status
- [ ] Returns error message

### POST /api/auth/reset-password

#### Valid Request
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"VALID_TOKEN","password":"newpassword123"}'
```
- [ ] Returns 200 status
- [ ] Returns success message
- [ ] Password updated in database

#### Invalid Token
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid","password":"newpassword123"}'
```
- [ ] Returns 400 status
- [ ] Returns error message

#### Weak Password
```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"VALID_TOKEN","password":"short"}'
```
- [ ] Returns 400 status
- [ ] Returns error message about password length

---

## 📱 Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile Firefox

### Test on Each Browser
- [ ] Forgot password page loads correctly
- [ ] Reset password page loads correctly
- [ ] Forms submit successfully
- [ ] Animations work smoothly
- [ ] Responsive design works
- [ ] No console errors

---

## ♿ Accessibility Tests

### Keyboard Navigation
- [ ] Tab through all form fields
- [ ] Submit form using Enter key
- [ ] Navigate using only keyboard
- [ ] Verify focus indicators visible

### Screen Reader
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify form labels read correctly
- [ ] Verify error messages announced
- [ ] Verify success messages announced

### Visual
- [ ] Test with high contrast mode
- [ ] Test with zoom at 200%
- [ ] Verify text is readable
- [ ] Verify buttons are clickable

---

## 🚀 Performance Tests

### Page Load Times
- [ ] Forgot password page loads < 2 seconds
- [ ] Reset password page loads < 2 seconds
- [ ] Token validation completes < 1 second

### API Response Times
- [ ] Forgot password API responds < 1 second
- [ ] Reset password API responds < 1 second
- [ ] Token validation API responds < 500ms

### Email Delivery
- [ ] Email sent within 5 seconds
- [ ] Email delivered within 30 seconds

---

## 🔄 Integration Tests

### With Existing Auth System
- [ ] Reset password doesn't break login
- [ ] Can login with new password
- [ ] Old password no longer works
- [ ] Session management still works
- [ ] Role-based access still works

### With Email System
- [ ] SMTP settings work correctly
- [ ] Email templates render correctly
- [ ] Email delivery is reliable
- [ ] Bounce handling works (if configured)

### With Database
- [ ] Tokens stored correctly
- [ ] Tokens retrieved correctly
- [ ] Tokens deleted after use
- [ ] Expired tokens cleaned up
- [ ] No database errors

---

## 🐛 Error Handling Tests

### Network Errors
- [ ] Disconnect internet during form submission
- [ ] Verify error message appears
- [ ] Reconnect and retry
- [ ] Verify works after reconnection

### Server Errors
- [ ] Stop database
- [ ] Try to reset password
- [ ] Verify graceful error message
- [ ] Restart database
- [ ] Verify works again

### Email Errors
- [ ] Configure invalid SMTP settings
- [ ] Request password reset
- [ ] Verify still returns success (security)
- [ ] Check server logs for error
- [ ] Fix SMTP settings
- [ ] Verify emails send again

---

## 📊 Database Tests

### Token Storage
- [ ] Request password reset
- [ ] Check database for token
- [ ] Verify token is 64 characters
- [ ] Verify expiry time is set (1 hour from now)
- [ ] Verify token is unique

### Token Cleanup
- [ ] Create expired tokens in database
- [ ] Run cleanup script
- [ ] Verify expired tokens removed
- [ ] Verify active tokens remain

### Password Update
- [ ] Reset password
- [ ] Check database
- [ ] Verify password hash changed
- [ ] Verify token removed
- [ ] Verify expiry time removed

---

## 🎯 User Acceptance Tests

### Real User Testing
- [ ] Have real user request password reset
- [ ] Observe their experience
- [ ] Note any confusion or issues
- [ ] Gather feedback on UI/UX
- [ ] Make improvements based on feedback

### Edge Cases
- [ ] User requests multiple resets
- [ ] User clicks old reset link after new one sent
- [ ] User tries to reset inactive account
- [ ] User tries to reset deleted account
- [ ] User tries to reset admin account

---

## 📝 Documentation Tests

### User Documentation
- [ ] Follow quick start guide
- [ ] Verify all steps work
- [ ] Note any missing information
- [ ] Update documentation as needed

### Developer Documentation
- [ ] Review technical documentation
- [ ] Verify code examples work
- [ ] Test API examples
- [ ] Verify architecture diagrams accurate

---

## ✅ Final Checklist

### Before Production Deployment
- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] SMTP configured for production
- [ ] Environment variables set
- [ ] Database migration applied
- [ ] Monitoring set up
- [ ] Backup plan in place

### Post-Deployment
- [ ] Test in production environment
- [ ] Monitor error logs
- [ ] Monitor email delivery
- [ ] Check user feedback
- [ ] Set up token cleanup cron job
- [ ] Document any issues
- [ ] Plan for improvements

---

## 🎉 Testing Complete!

Once all items are checked:
1. Document any issues found
2. Fix critical issues
3. Deploy to production
4. Monitor for 24-48 hours
5. Gather user feedback
6. Plan next iteration

---

## 📞 Support

If you encounter issues during testing:
1. Check server logs
2. Review documentation
3. Test SMTP configuration
4. Check database connection
5. Contact development team

---

**Testing Version**: 1.0.0  
**Last Updated**: May 8, 2026  
**Status**: Ready for Testing
