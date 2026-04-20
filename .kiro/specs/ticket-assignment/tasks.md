# Implementation Plan: Ticket Assignment System

## Overview

This implementation plan breaks down the Ticket Assignment System into discrete coding tasks. The system enables admins to assign support tickets to specific admin users (agents), with visibility for both admins and clients. Implementation follows a bottom-up approach: database schema → API layer → UI components → integration.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Update Prisma schema with assignment fields
    - Add `assignedToId` (String?, nullable) to Ticket model
    - Add `assignedAt` (DateTime?, nullable) to Ticket model
    - Add `assignedTo` relation to User model
    - Add `assignedTickets` relation to User model
    - Add index on `assignedToId` for query performance
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 1.2 Generate and run database migration
    - Run `npx prisma migrate dev --name add_ticket_assignment`
    - Verify migration creates nullable columns
    - Test that existing tickets have null assignment values
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. API endpoint for ticket assignment
  - [x] 2.1 Create assignment API route
    - Create `/app/api/admin/tickets/[id]/assign/route.ts`
    - Implement PATCH handler with authentication check
    - Validate admin role requirement
    - Parse and validate `assignedToId` from request body
    - _Requirements: 7.1, 7.7_
  
  - [x] 2.2 Implement assignment validation logic
    - Check if `assignedToId` is null (unassignment case)
    - If not null, verify user exists in database
    - If not null, verify user has role = ADMIN
    - If not null, verify user is active (isActive = true)
    - Return 400 error with descriptive message for invalid cases
    - _Requirements: 7.4, 7.6, 9.3_
  
  - [x] 2.3 Implement assignment update logic
    - Update ticket with `assignedToId` and current timestamp for `assignedAt`
    - For unassignment (null), clear both `assignedToId` and `assignedAt`
    - Include `assignedTo` relation in response with user details
    - Return updated ticket data with 200 status
    - _Requirements: 7.2, 7.3, 7.5, 1.4_
  
  - [x] 2.4 Write unit tests for assignment API
    - Test successful assignment with valid admin user
    - Test unassignment (null assignedToId)
    - Test error: invalid user ID (400)
    - Test error: non-admin user (400)
    - Test error: inactive user (400)
    - Test error: unauthorized access (403)
    - Test error: ticket not found (404)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6_

- [x] 3. Enhance ticket query endpoints
  - [x] 3.1 Update admin ticket list endpoint
    - Modify `/app/api/admin/tickets/route.ts` GET handler
    - Add `assignedTo` to include clause with select for id, name, email
    - Ensure all ticket queries include assignment data
    - _Requirements: 3.5, 9.4_
  
  - [x] 3.2 Update portal ticket list endpoint
    - Modify `/app/api/portal/tickets/route.ts` GET handler
    - Add `assignedTo` to include clause with select for name only
    - Ensure clients only see agent name, not email
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 3.3 Update admin ticket detail endpoint
    - Modify `/app/api/admin/tickets/[id]/route.ts` GET handler
    - Add `assignedTo` to include clause with full user details
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 3.4 Update portal ticket detail endpoint
    - Modify `/app/api/portal/tickets/[id]/route.ts` GET handler
    - Add `assignedTo` to include clause with name only
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 4. Checkpoint - Verify API layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Admin assignment UI component
  - [x] 5.1 Create AssignmentDropdown component
    - Create `/app/admin/tickets/[id]/assignment-dropdown.tsx`
    - Mark as client component with 'use client'
    - Define props interface: ticketId, currentAssignedToId, currentAssignedTo
    - Fetch list of active admin users on component mount
    - _Requirements: 2.1, 2.2_
  
  - [x] 5.2 Implement dropdown UI and interaction
    - Use shadcn/ui Select component for consistency
    - Display current assignment or "Unassigned" as placeholder
    - Populate dropdown with all active admin users
    - Add "Unassign" option to clear assignment
    - _Requirements: 2.1, 2.2, 2.6_
  
  - [x] 5.3 Implement assignment change handler
    - Handle selection change event
    - Send PATCH request to `/api/admin/tickets/[id]/assign`
    - Implement optimistic UI update
    - Show loading state during API call
    - Revalidate page on success
    - Handle errors with toast notification and rollback
    - _Requirements: 2.3, 2.4, 2.5, 2.7_
  
  - [x] 5.4 Write component tests for AssignmentDropdown
    - Test component renders with current assignment
    - Test component renders "Unassigned" when no assignment
    - Test dropdown shows all admin users
    - Test selection triggers API call
    - Test error handling and rollback
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Admin ticket detail page integration
  - [x] 6.1 Add assignment display to ticket detail sidebar
    - Modify `/app/admin/tickets/[id]/page.tsx`
    - Add "Assigned To" section in ticket information sidebar
    - Display assigned agent name and assignment date
    - Show "Unassigned" when no assignment
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.2 Integrate AssignmentDropdown in ticket detail
    - Import and render AssignmentDropdown component
    - Pass ticketId and current assignment data as props
    - Position dropdown in ticket information sidebar
    - Ensure immediate UI update after assignment change
    - _Requirements: 2.1, 4.5_

- [x] 7. Admin ticket list integration
  - [x] 7.1 Add assignment column to admin ticket table view
    - Modify `/app/admin/tickets/page.tsx` table rendering
    - Add "Assigned To" column header
    - Display assigned agent name or "Unassigned" for each ticket
    - Make column sortable by agent name
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 7.2 Add assignment display to admin ticket board view
    - Modify board view ticket card rendering
    - Display assigned agent name on each ticket card
    - Use small badge or text below ticket title
    - Show nothing or "Unassigned" when no assignment
    - _Requirements: 3.4_

- [x] 8. Admin ticket filters and sorting
  - [x] 8.1 Add assignment filter to ticket filters
    - Modify `/app/admin/tickets/ticket-filters.tsx`
    - Add "Assigned To" select dropdown
    - Include "All Agents" and "Unassigned" options
    - Populate with all active admin users
    - _Requirements: 5.1, 5.2_
  
  - [x] 8.2 Implement assignment filter logic
    - Update ticket query in `/app/admin/tickets/page.tsx`
    - Handle "unassigned" filter (assignedToId = null)
    - Handle specific agent filter (assignedToId = userId)
    - Maintain filter state in URL search params
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 8.3 Implement assignment sorting
    - Add "assignedTo" to sort options
    - Sort by assignedTo.name with null values last
    - Update SORT_MAP in ticket list page
    - _Requirements: 5.3_

- [x] 9. Client portal ticket list integration
  - [x] 9.1 Add assignment column to client ticket table view
    - Modify `/app/portal/page.tsx` or ticket list component
    - Add "Assigned To" column header
    - Display assigned agent name or "Not yet assigned"
    - _Requirements: 6.5_
  
  - [x] 9.2 Add assignment display to client ticket board view
    - Modify board view ticket card rendering in portal
    - Display assigned agent name on each ticket card
    - Show "Not yet assigned" when no assignment
    - _Requirements: 6.6_

- [x] 10. Client portal ticket detail integration
  - [x] 10.1 Add assignment display to client ticket detail
    - Modify client ticket detail page
    - Add "Assigned To" section in ticket information area
    - Display assigned agent name in read-only format
    - Show "Not yet assigned" when no assignment
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 11. Checkpoint - Verify UI integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Assignment during ticket creation
  - [x] 12.1 Add assignment field to admin ticket creation form
    - Modify `/app/admin/tickets/new/ticket-form.tsx`
    - Add optional "Assign To" select field
    - Fetch and display all active admin users
    - Allow form submission without assignment (null)
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [x] 12.2 Update ticket creation API to handle assignment
    - Modify `/app/api/admin/tickets/route.ts` POST handler
    - Accept optional `assignedToId` in request body
    - Set `assignedToId` and `assignedAt` on new ticket if provided
    - Validate assignedToId if provided (same rules as assignment endpoint)
    - _Requirements: 10.3, 10.5_

- [x] 13. Notification integration
  - [x] 13.1 Implement ticket assignment notification
    - Create or update notification service method
    - Check `notifyOnTicketAssignment` setting in NotificationSettings
    - Create notification log entry with TICKET_ASSIGNED type
    - Include assigned agent email as recipient
    - Include ticket details in notification payload
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 13.2 Integrate notification with assignment API
    - Call notification service after successful assignment
    - Only trigger notification when assignment changes (not on unassignment)
    - Handle notification errors gracefully (don't block assignment)
    - _Requirements: 8.2, 8.3_

- [x] 14. Data integrity and error handling
  - [x] 14.1 Implement graceful handling of deleted users
    - Update UI components to handle null assignedTo relation
    - Display "Unknown" or "User Deleted" when assigned user is deleted
    - Ensure queries don't fail when assignedTo is null
    - _Requirements: 9.1, 9.2, 9.5_
  
  - [x] 14.2 Add error handling to all UI components
    - Add error toast notifications for assignment failures
    - Implement rollback for optimistic updates on error
    - Add loading states to all assignment interactions
    - Handle empty admin user lists gracefully
    - _Requirements: 2.7, 9.5_

- [x] 15. Final checkpoint and integration testing
  - [x] 15.1 Run end-to-end integration tests
    - Test complete assignment flow from creation to display
    - Test assignment visibility for both admin and client
    - Test filtering and sorting by assignment
    - Test notification delivery
    - Test error scenarios and edge cases
    - _Requirements: All_
  
  - [x] 15.2 Final verification
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Implementation uses TypeScript throughout (Next.js, React, Prisma)
- All database queries must handle null assignedToId values
- Client portal shows limited assignment data (name only, no email)
- Assignment is optional - tickets can remain unassigned indefinitely
