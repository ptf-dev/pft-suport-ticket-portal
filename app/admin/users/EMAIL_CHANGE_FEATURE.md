# User Email Change Feature

## Overview
This feature allows administrators to change user email addresses directly from the admin panel. When an email is changed, it triggers a database migration that updates the email in the database.

## Components

### 1. Edit Email Modal (`edit-email-modal.tsx`)
A client-side modal component that provides the UI for changing a user's email address.

**Features:**
- Displays current email address (read-only)
- Input field for new email address
- Email format validation
- Duplicate email detection
- Success/error feedback
- Loading states
- Auto-refresh after successful update

**Props:**
- `userId`: The ID of the user whose email is being changed
- `userName`: The name of the user (for display)
- `currentEmail`: The current email address
- `onClose`: Callback function to close the modal

### 2. API Endpoint (`app/api/admin/users/[id]/email/route.ts`)
A server-side API endpoint that handles the email update operation.

**Endpoint:** `PATCH /api/admin/users/[id]/email`

**Authentication:** Admin-only access (enforced by `requireAdmin()`)

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response (Success - 200):**
```json
{
  "message": "Email updated successfully",
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "newemail@example.com",
    "role": "CLIENT",
    "companyId": "company-123",
    "updatedAt": "2026-05-06T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation failed (invalid email, duplicate email, same as current)
- `403` - Unauthorized (not admin)
- `404` - User not found
- `500` - Internal server error

**Validations:**
1. User must exist
2. Email must be valid format
3. Email must be different from current email
4. Email must be unique within the same company context (respects the composite unique constraint `[email, companyId]`)

**Database Migration:**
The endpoint performs a direct database update using Prisma:
```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    email: email,
    updatedAt: new Date(),
  }
})
```

### 3. Users Table Integration (`users-table.tsx`)
The users table component has been updated to include the "Change Email" button.

**Changes:**
- Added `editingEmail` state to track which user's email is being edited
- Added `EditEmailModal` component rendering
- Added "Change Email" button in the actions column
- Buttons are displayed side-by-side with the existing "Reset Password" button

## Usage

### For Administrators:
1. Navigate to `/admin/users`
2. Find the user whose email you want to change
3. Click the "✉️ Change Email" button in the Actions column
4. Enter the new email address in the modal
5. Click "Update Email"
6. The page will automatically refresh to show the updated email

### Important Notes:
- ⚠️ The user will need to use the new email address to log in after the change
- The email must be unique within the same company (for CLIENT users) or globally (for ADMIN users)
- The change is immediate and updates the database directly
- The `updatedAt` timestamp is automatically updated

## Database Schema
The feature respects the existing database schema:

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String
  password  String
  role      Role
  companyId String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Composite unique constraint for tenant isolation
  @@unique([email, companyId])
  @@map("users")
}
```

The composite unique constraint `@@unique([email, companyId])` ensures:
- CLIENT users can have the same email across different companies
- ADMIN users (with `companyId = null`) must have globally unique emails
- Within the same company, emails must be unique

## Testing
Unit tests are provided in `route.test.ts` covering:
- ✅ Successful email update
- ✅ User not found (404)
- ✅ Same email validation (400)
- ✅ Duplicate email detection (400)
- ✅ Invalid email format (400)
- ✅ Unauthorized access (403)

## Security Considerations
1. **Admin-only access**: Only administrators can change user emails
2. **Email validation**: Ensures valid email format
3. **Uniqueness check**: Prevents duplicate emails within the same company context
4. **Audit trail**: Updates the `updatedAt` timestamp for tracking
5. **No password exposure**: The API never returns password fields

## Future Enhancements
Potential improvements for future versions:
- Email verification workflow (send confirmation to new email)
- Audit log entry for email changes
- Notification to user about email change
- Bulk email update functionality
- Email change history tracking
