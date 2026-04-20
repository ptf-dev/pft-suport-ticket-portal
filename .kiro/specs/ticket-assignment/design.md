# Design Document: Ticket Assignment System

## Overview

The Ticket Assignment System extends the existing support ticket infrastructure to enable assignment of tickets to specific admin users (agents/developers). This feature adds accountability and workload visibility by tracking which agent is responsible for each ticket.

### Key Design Decisions

1. **Optional Assignment**: Tickets can remain unassigned (assignedToId = null), allowing flexibility in workflow
2. **Admin-Only Assignment**: Only users with ADMIN role can be assigned to tickets, enforcing the business model where PFT agents handle client tickets
3. **Timestamp Tracking**: The assignedAt field captures when assignment occurs, enabling workload analytics
4. **Referential Integrity**: Foreign key relationship ensures assigned users exist, but allows null for unassigned state
5. **Client Visibility**: Clients can see who is assigned to their tickets, promoting transparency
6. **Notification Support**: Leverages existing notification infrastructure with TICKET_ASSIGNED template type

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Admin Portal    │         │  Client Portal   │         │
│  │  - Ticket List   │         │  - Ticket List   │         │
│  │  - Ticket Detail │         │  - Ticket Detail │         │
│  │  - Assignment UI │         │  - Read-only     │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            │ HTTP/JSON                    │ HTTP/JSON
            │                              │
┌───────────┼──────────────────────────────┼──────────────────┐
│           ▼                              ▼                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │           Next.js API Routes                    │        │
│  │  /api/admin/tickets/[id]/assign (PATCH)         │        │
│  │  /api/admin/tickets (GET with assignment data)  │        │
│  │  /api/portal/tickets (GET with assignment data) │        │
│  └──────────────────┬──────────────────────────────┘        │
│                     │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────────────────────┐        │
│  │         Business Logic Layer                    │        │
│  │  - Assignment validation                        │        │
│  │  - Active admin user check                      │        │
│  │  - Timestamp management                         │        │
│  │  - Notification triggering                      │        │
│  └──────────────────┬──────────────────────────────┘        │
│                     │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────────────────────┐        │
│  │           Prisma ORM                            │        │
│  │  - Ticket model with assignedToId               │        │
│  │  - User model relationship                      │        │
│  │  - Query optimization with includes             │        │
│  └──────────────────┬──────────────────────────────┘        │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │   PostgreSQL     │
            │   - tickets      │
            │   - users        │
            └──────────────────┘
```

### Data Flow

**Assignment Flow:**
1. Admin selects agent from dropdown in ticket detail page
2. Frontend sends PATCH request to `/api/admin/tickets/[id]/assign`
3. API validates admin authentication and agent exists
4. Prisma updates ticket with assignedToId and assignedAt
5. Notification service creates TICKET_ASSIGNED notification (if enabled)
6. API returns updated ticket data
7. Frontend updates UI to show assigned agent

**Display Flow:**
1. User requests ticket list or detail page
2. API queries tickets with `include: { assignedTo: { select: { name, email } } }`
3. Prisma joins User table to fetch assigned agent data
4. API returns tickets with nested assignedTo object
5. Frontend renders assignment information based on user role

## Components and Interfaces

### Database Schema Changes

**Ticket Model Extensions:**
```prisma
model Ticket {
  // ... existing fields ...
  assignedToId String?   // References User.id, nullable
  assignedAt   DateTime? // Timestamp of assignment
  
  // Relations
  assignedTo   User?     @relation("TicketAssignment", fields: [assignedToId], references: [id])
}

model User {
  // ... existing fields ...
  
  // Relations
  assignedTickets Ticket[] @relation("TicketAssignment")
}
```

**Migration Strategy:**
- Add nullable fields to avoid breaking existing data
- No default values needed (null = unassigned)
- Index on assignedToId for query performance

### API Endpoints

#### PATCH /api/admin/tickets/[id]/assign

**Purpose:** Assign or unassign a ticket to an admin user

**Request Body:**
```typescript
{
  assignedToId: string | null  // User ID or null to unassign
}
```

**Response (200):**
```typescript
{
  id: string
  title: string
  assignedToId: string | null
  assignedAt: string | null
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
  // ... other ticket fields
}
```

**Error Responses:**
- 400: Invalid assignedToId (user doesn't exist or not an admin)
- 403: Not authenticated as admin
- 404: Ticket not found
- 500: Server error

**Validation Rules:**
1. If assignedToId is not null, user must exist
2. If assignedToId is not null, user must have role = ADMIN
3. If assignedToId is not null, user must be active (isActive = true)
4. If assignedToId is null, clear assignedAt timestamp

#### GET /api/admin/tickets (Enhanced)

**Changes:** Include assignedTo relationship in query

**Query Enhancement:**
```typescript
include: {
  assignedTo: {
    select: { id: true, name: true, email: true }
  }
}
```

#### GET /api/portal/tickets (Enhanced)

**Changes:** Include assignedTo relationship for client visibility

**Query Enhancement:**
```typescript
include: {
  assignedTo: {
    select: { name: true }  // Clients only see name, not email
  }
}
```

### UI Components

#### AssignmentDropdown Component

**Location:** `app/admin/tickets/[id]/assignment-dropdown.tsx`

**Purpose:** Allow admins to assign/unassign tickets

**Props:**
```typescript
interface AssignmentDropdownProps {
  ticketId: string
  currentAssignedToId: string | null
  currentAssignedTo: { id: string; name: string; email: string } | null
}
```

**Behavior:**
- Fetches list of active admin users on mount
- Displays current assignment or "Unassigned"
- Dropdown with all admin users + "Unassign" option
- Optimistic UI update on selection
- Error handling with rollback on failure
- Shows loading state during API call

**Implementation Notes:**
- Use shadcn/ui Select component for consistency
- Client component ('use client')
- Revalidate page after successful assignment

#### Assignment Display (Read-only)

**Admin Ticket List (Table View):**
- New column: "Assigned To"
- Display agent name or "Unassigned"
- Sortable column

**Admin Ticket List (Board View):**
- Show agent name on ticket card
- Small badge or text below title

**Admin Ticket Detail:**
- Display in "Ticket Information" sidebar
- Show agent name and assignment date
- Include assignment dropdown for editing

**Client Ticket List (Table View):**
- New column: "Assigned To"
- Display agent name or "Not yet assigned"

**Client Ticket List (Board View):**
- Show agent name on ticket card if assigned

**Client Ticket Detail:**
- Display in "Ticket Information" section
- Read-only text: "Assigned to: [Agent Name]" or "Not yet assigned"

### Filtering and Sorting

**Admin Ticket Filters Component Enhancement:**

**Location:** `app/admin/tickets/ticket-filters.tsx`

**New Filter:**
```typescript
<Select name="assignedTo">
  <option value="">All Agents</option>
  <option value="unassigned">Unassigned</option>
  {adminUsers.map(user => (
    <option key={user.id} value={user.id}>{user.name}</option>
  ))}
</Select>
```

**Query Logic:**
```typescript
if (searchParams.assignedTo === 'unassigned') {
  where.assignedToId = null
} else if (searchParams.assignedTo) {
  where.assignedToId = searchParams.assignedTo
}
```

**Sorting:**
- Add "assignedTo" to SORT_MAP
- Sort by assignedTo.name with null values last

## Data Models

### Ticket Model (Enhanced)

```typescript
interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string | null
  companyId: string
  createdById: string
  assignedToId: string | null      // NEW
  assignedAt: DateTime | null      // NEW
  isDeleted: boolean
  deletedAt: DateTime | null
  deletedBy: string | null
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relations
  company: Company
  createdBy: User
  assignedTo: User | null          // NEW
  comments: TicketComment[]
  images: TicketImage[]
  notificationLogs: NotificationLog[]
}
```

### Assignment State Machine

```
┌─────────────┐
│  Unassigned │ (assignedToId = null, assignedAt = null)
└──────┬──────┘
       │
       │ Admin assigns ticket
       │ (sets assignedToId, records assignedAt)
       ▼
┌─────────────┐
│   Assigned  │ (assignedToId = userId, assignedAt = timestamp)
└──────┬──────┘
       │
       ├─────► Admin reassigns to different agent
       │       (updates assignedToId, updates assignedAt)
       │
       └─────► Admin unassigns ticket
               (sets assignedToId = null, clears assignedAt)
```

**State Transitions:**
- Unassigned → Assigned: Set assignedToId and assignedAt
- Assigned → Assigned (different agent): Update assignedToId and assignedAt
- Assigned → Unassigned: Clear assignedToId and assignedAt
- Unassigned → Unassigned: No-op

## Error Handling

### API Error Scenarios

1. **Invalid User ID**
   - Scenario: assignedToId doesn't exist in database
   - Response: 400 Bad Request
   - Message: "Invalid user ID: user not found"

2. **Non-Admin User**
   - Scenario: assignedToId references a CLIENT user
   - Response: 400 Bad Request
   - Message: "Cannot assign ticket to non-admin user"

3. **Inactive User**
   - Scenario: assignedToId references inactive admin
   - Response: 400 Bad Request
   - Message: "Cannot assign ticket to inactive user"

4. **Ticket Not Found**
   - Scenario: Ticket ID doesn't exist
   - Response: 404 Not Found
   - Message: "Ticket not found"

5. **Unauthorized Access**
   - Scenario: Non-admin tries to assign ticket
   - Response: 403 Forbidden
   - Message: "Admin access required"

6. **Database Error**
   - Scenario: Prisma query fails
   - Response: 500 Internal Server Error
   - Message: "Failed to update ticket assignment"
   - Log: Full error details to console

### UI Error Handling

1. **Assignment Dropdown:**
   - Show error toast on assignment failure
   - Rollback optimistic update
   - Retry button in error state

2. **Ticket List:**
   - Gracefully handle missing assignedTo data
   - Display "Unknown" if assigned user was deleted

3. **Filters:**
   - Handle empty admin user list
   - Show loading state while fetching users

### Data Integrity

1. **Orphaned Assignments:**
   - If assigned user is deleted, assignedToId remains but relation is null
   - UI displays "Unknown" or "User Deleted"
   - Admin can reassign to active user

2. **Concurrent Updates:**
   - Last write wins (Prisma default behavior)
   - No optimistic locking needed for this use case

3. **Null Handling:**
   - All queries must handle null assignedToId
   - All UI components must handle null assignedTo relation

## Testing Strategy

### Unit Tests

**API Route Tests:**
- Test assignment with valid admin user
- Test assignment with null (unassignment)
- Test assignment with invalid user ID
- Test assignment with non-admin user
- Test assignment with inactive user
- Test unauthorized access (non-admin)
- Test ticket not found scenario

**Component Tests:**
- AssignmentDropdown renders correctly
- AssignmentDropdown shows current assignment
- AssignmentDropdown handles selection
- AssignmentDropdown handles errors
- Assignment display in ticket list (admin)
- Assignment display in ticket list (client)
- Assignment display in ticket detail (admin)
- Assignment display in ticket detail (client)

**Filter Tests:**
- Filter by specific agent
- Filter by unassigned
- Filter state persists across navigation

### Integration Tests

**End-to-End Assignment Flow:**
1. Admin creates ticket without assignment
2. Admin assigns ticket to agent
3. Verify assignment appears in ticket list
4. Verify assignment appears in ticket detail
5. Client views ticket and sees assigned agent
6. Admin reassigns to different agent
7. Verify updated assignment everywhere
8. Admin unassigns ticket
9. Verify unassigned state everywhere

**Notification Integration:**
1. Assign ticket with notifications enabled
2. Verify TICKET_ASSIGNED notification created
3. Verify notification sent to assigned agent

**Database Integration:**
1. Verify foreign key constraint works
2. Verify null assignments work
3. Verify queries with includes work
4. Verify filtering by assignment works
5. Verify sorting by assignment works

### Manual Testing Checklist

- [ ] Create ticket without assignment
- [ ] Assign ticket to admin user
- [ ] Reassign ticket to different admin
- [ ] Unassign ticket
- [ ] Assign ticket during creation
- [ ] Filter tickets by assigned agent
- [ ] Filter tickets by unassigned
- [ ] Sort tickets by assigned agent
- [ ] View assignment as client
- [ ] Verify assignment timestamp updates
- [ ] Test with inactive admin user
- [ ] Test with deleted admin user
- [ ] Test notification delivery

### Performance Considerations

**Query Optimization:**
- Add index on assignedToId for faster filtering
- Use select to limit fields in assignedTo relation
- Batch queries when loading ticket lists

**Caching:**
- Cache admin user list for dropdown (revalidate on user changes)
- Use Next.js revalidation after assignment changes

**Expected Load:**
- Assignment changes are infrequent (< 1% of ticket views)
- No performance impact on existing ticket queries
- Minimal overhead from additional join

## Implementation Notes

### Migration Steps

1. **Database Migration:**
   ```bash
   npx prisma migrate dev --name add_ticket_assignment
   ```

2. **API Implementation:**
   - Create `/api/admin/tickets/[id]/assign/route.ts`
   - Update ticket queries to include assignedTo

3. **UI Implementation:**
   - Create AssignmentDropdown component
   - Update admin ticket list (table and board)
   - Update admin ticket detail
   - Update client ticket list (table and board)
   - Update client ticket detail
   - Update ticket filters

4. **Notification Implementation:**
   - Add notifyAgentTicketAssigned method to NotificationService
   - Integrate with assignment API

5. **Testing:**
   - Write unit tests for API
   - Write component tests
   - Run integration tests
   - Manual testing

### Rollback Plan

If issues arise:
1. Revert API changes
2. Revert UI changes
3. Keep database fields (nullable, no harm)
4. Can re-enable feature after fixes

### Future Enhancements

- Assignment history tracking
- Workload analytics dashboard
- Auto-assignment based on rules
- Assignment notifications via in-app alerts
- Bulk assignment operations
- Assignment comments/notes
