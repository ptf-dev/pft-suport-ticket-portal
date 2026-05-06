# Email Change Feature - Testing Guide

## 🧪 Manual Testing Checklist

### Prerequisites
- [ ] Admin account credentials
- [ ] Access to https://portal.propfirmstech.com/admin/users
- [ ] At least one test user in the system
- [ ] Database access (optional, for verification)

---

## Test Cases

### ✅ Test Case 1: Successful Email Change
**Objective:** Verify that an admin can successfully change a user's email

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Locate a test user in the table
4. Click the "✉️ Change Email" button
5. Enter a new, unique email address (e.g., `newuser@example.com`)
6. Click "Update Email"

**Expected Results:**
- ✅ Success message appears: "✓ Email updated successfully!"
- ✅ Modal closes automatically after 1.5 seconds
- ✅ Page refreshes and shows the new email in the table
- ✅ User can log in with the new email

---

### ❌ Test Case 2: Duplicate Email Validation
**Objective:** Verify that the system prevents duplicate emails within the same company

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Note an existing user's email (e.g., `existing@example.com`)
4. Click "✉️ Change Email" on a different user
5. Enter the existing user's email
6. Click "Update Email"

**Expected Results:**
- ❌ Error message appears: "This email address is already in use"
- ❌ Email is NOT updated in the database
- ❌ Modal remains open for correction

---

### ❌ Test Case 3: Same Email Validation
**Objective:** Verify that the system prevents changing to the same email

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Click "✉️ Change Email" on any user
4. Enter the exact same email that's currently shown
5. Click "Update Email"

**Expected Results:**
- ❌ Error message appears: "New email must be different from current email"
- ❌ Email is NOT updated
- ❌ Modal remains open

---

### ❌ Test Case 4: Invalid Email Format
**Objective:** Verify email format validation

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Click "✉️ Change Email" on any user
4. Enter an invalid email (e.g., `notanemail`, `test@`, `@example.com`)
5. Try to submit the form

**Expected Results:**
- ❌ Browser validation prevents submission (HTML5 email validation)
- ❌ If bypassed, API returns validation error
- ❌ Email is NOT updated

---

### 🔒 Test Case 5: Authorization Check
**Objective:** Verify that only admins can change emails

**Steps:**
1. Log out from admin account
2. Log in as a CLIENT user
3. Try to access `/admin/users` directly
4. Try to call the API endpoint directly: `PATCH /api/admin/users/[id]/email`

**Expected Results:**
- 🔒 CLIENT users are redirected or see "Unauthorized"
- 🔒 API returns 403 Forbidden
- 🔒 Email is NOT updated

---

### ✅ Test Case 6: Cross-Company Email (CLIENT Users)
**Objective:** Verify that CLIENT users in different companies can have the same email

**Setup:** You need two companies and two CLIENT users

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Find a CLIENT user from Company A
4. Change their email to `shared@example.com`
5. Find a CLIENT user from Company B
6. Change their email to `shared@example.com`

**Expected Results:**
- ✅ Both updates succeed
- ✅ Both users have the same email but different companies
- ✅ Database respects the composite unique constraint `[email, companyId]`

---

### ❌ Test Case 7: ADMIN Email Uniqueness
**Objective:** Verify that ADMIN users must have globally unique emails

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Find an ADMIN user
4. Note their email
5. Try to change another ADMIN user's email to the same address

**Expected Results:**
- ❌ Error message appears: "This email address is already in use"
- ❌ Email is NOT updated
- ❌ ADMIN emails remain globally unique

---

### ✅ Test Case 8: Modal Cancel Functionality
**Objective:** Verify that canceling doesn't change the email

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Click "✉️ Change Email" on any user
4. Enter a new email address
5. Click "Cancel"

**Expected Results:**
- ✅ Modal closes immediately
- ✅ Email is NOT updated
- ✅ Original email remains in the table

---

### ✅ Test Case 9: Loading State
**Objective:** Verify proper loading states during the update

**Steps:**
1. Log in as an admin
2. Navigate to `/admin/users`
3. Click "✉️ Change Email" on any user
4. Enter a new email
5. Click "Update Email"
6. Observe the button state during the API call

**Expected Results:**
- ✅ Button text changes to "Updating..."
- ✅ Button is disabled during the request
- ✅ Input field is disabled during the request
- ✅ Cancel button is disabled during the request

---

### ✅ Test Case 10: User Login After Email Change
**Objective:** Verify that users must use the new email to log in

**Steps:**
1. Log in as an admin
2. Change a test user's email from `old@example.com` to `new@example.com`
3. Log out
4. Try to log in with `old@example.com`
5. Try to log in with `new@example.com`

**Expected Results:**
- ❌ Login with old email fails
- ✅ Login with new email succeeds
- ✅ User can access their account with the new email

---

## 🔍 Database Verification

### Check Email Update in Database
```sql
-- Find user by ID
SELECT id, name, email, "updatedAt" 
FROM users 
WHERE id = 'user-id-here';

-- Verify no duplicate emails within same company
SELECT email, "companyId", COUNT(*) 
FROM users 
GROUP BY email, "companyId" 
HAVING COUNT(*) > 1;

-- Check ADMIN email uniqueness
SELECT email, COUNT(*) 
FROM users 
WHERE "companyId" IS NULL 
GROUP BY email 
HAVING COUNT(*) > 1;
```

---

## 🐛 Common Issues & Troubleshooting

### Issue: Modal doesn't open
**Solution:** Check browser console for JavaScript errors

### Issue: API returns 403 Forbidden
**Solution:** Verify you're logged in as an ADMIN user

### Issue: Email not updating
**Solution:** 
- Check for duplicate emails in the same company
- Verify email format is valid
- Check database connection

### Issue: Page doesn't refresh after update
**Solution:** 
- Check that `router.refresh()` is being called
- Verify Next.js cache is working properly

---

## 📊 Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: Production / Staging / Local

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Successful Email Change | ☐ Pass ☐ Fail | |
| 2. Duplicate Email Validation | ☐ Pass ☐ Fail | |
| 3. Same Email Validation | ☐ Pass ☐ Fail | |
| 4. Invalid Email Format | ☐ Pass ☐ Fail | |
| 5. Authorization Check | ☐ Pass ☐ Fail | |
| 6. Cross-Company Email | ☐ Pass ☐ Fail | |
| 7. ADMIN Email Uniqueness | ☐ Pass ☐ Fail | |
| 8. Modal Cancel | ☐ Pass ☐ Fail | |
| 9. Loading State | ☐ Pass ☐ Fail | |
| 10. User Login After Change | ☐ Pass ☐ Fail | |

Overall Status: ☐ All Pass ☐ Some Failures

Notes:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 🚀 Automated Testing

Run the unit tests:
```bash
npm test app/api/admin/users/[id]/email/route.test.ts
```

Expected output:
```
PASS app/api/admin/users/[id]/email/route.test.ts
  PATCH /api/admin/users/[id]/email
    ✓ should update user email successfully
    ✓ should return 404 if user not found
    ✓ should return 400 if email is the same as current
    ✓ should return 400 if email is already in use
    ✓ should return 400 for invalid email format
    ✓ should return 403 if not admin

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

---

## 📝 Sign-off

After completing all tests:

- [ ] All test cases passed
- [ ] No console errors
- [ ] Database integrity maintained
- [ ] User experience is smooth
- [ ] Documentation is accurate

**Tested by:** _______________
**Date:** _______________
**Approved by:** _______________
**Date:** _______________
