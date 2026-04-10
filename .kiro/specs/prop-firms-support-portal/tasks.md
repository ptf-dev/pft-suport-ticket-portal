# Implementation Plan: PropFirmsTech Support Portal

## Overview

This implementation plan breaks down the multi-tenant support portal into discrete, incremental coding tasks. The portal uses Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL, and NextAuth for authentication. The implementation follows a logical progression: project setup → database schema → multi-tenant architecture → authentication → core features → testing.

## Tasks

- [x] 1. Project setup and configuration
  - [x] 1.1 Initialize Next.js 14 project with TypeScript and Tailwind CSS
    - Create Next.js project with App Router
    - Configure TypeScript with strict mode
    - Set up Tailwind CSS with custom configuration
    - _Requirements: 12.1, 12.3_
  
  - [x] 1.2 Install and configure core dependencies
    - Install Prisma, NextAuth, bcrypt, and other required packages
    - Configure package.json scripts for development and build
    - Set up environment variable structure
    - _Requirements: 12.1_
  
  - [x] 1.3 Create project directory structure
    - Set up app router directory structure (/admin, /portal, /api)
    - Create lib/ directory for utilities and services
    - Create components/ directory for shared UI components
    - _Requirements: 12.3_
  
  - [x] 1.4 Configure environment variables and README
    - Create .env.example with all required variables
    - Document environment variables in README.md
    - Add installation and setup instructions
    - _Requirements: 12.1_

- [x] 2. Database schema and Prisma setup
  - [x] 2.1 Define Prisma schema with all models
    - Create Company model with subdomain field for tenant resolution
    - Create User model with role enum and company relation
    - Create Ticket model with status, priority enums and relations
    - Create TicketComment model with internal flag
    - Create TicketImage model for file attachments
    - Create NotificationSettings model for email configuration
    - Create EmailTemplate model for custom templates
    - Create NotificationLog model for audit trail
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 2.2 Configure Prisma client and database connection
    - Set up Prisma client singleton
    - Configure PostgreSQL connection string
    - Add migration scripts to package.json
    - _Requirements: 11.1_
  
  - [x] 2.3 Create initial database migration
    - Generate and apply initial migration
    - Verify schema creation in PostgreSQL
    - _Requirements: 11.1_
  
  - [x] 2.4 Create database seed script
    - Create seed data for testing (admin user, sample companies, users)
    - Add seed script to package.json
    - _Requirements: 12.3_

- [x] 3. Multi-tenant architecture implementation
  - [x] 3.1 Implement tenant resolution middleware
    - Create middleware to extract subdomain from request
    - Validate tenant exists and is active
    - Set tenant context in request headers
    - Handle invalid tenant scenarios (404 response)
    - _Requirements: 2.3, 6.2, 6.4_
  
  - [x] 3.2 Create tenant-scoped database access layer
    - Implement TenantScopedPrisma wrapper class
    - Auto-filter queries by companyId for tenant context
    - Provide admin override for cross-tenant access
    - _Requirements: 2.3, 6.2_
  
  - [x] 3.3 Create tenant context utilities
    - Implement getTenantFromRequest helper
    - Create validateTenantAccess helper
    - Build requireTenantAccess middleware
    - _Requirements: 2.3, 2.4_
  
  - [ ]* 3.4 Write property test for tenant isolation
    - **Property 5: Tenant Isolation Guarantee**
    - **Validates: Requirements 2.3, 2.4, 6.2, 6.4, 8.5**

- [x] 4. Authentication system with NextAuth
  - [x] 4.1 Configure NextAuth with credentials provider
    - Set up NextAuth configuration with tenant-aware provider
    - Configure session strategy and callbacks
    - Add tenant context to session object
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.2 Implement authentication service
    - Create authenticateWithTenant function with bcrypt verification
    - Implement createTenantSession function
    - Build validateTenantAccess function
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 4.3 Write property test for authentication
    - **Property 1: Authentication Credential Validation**
    - **Validates: Requirements 1.1, 1.3**
  
  - [ ]* 4.4 Write property test for session structure
    - **Property 2: Session Structure Completeness**
    - **Validates: Requirements 1.2**
  
  - [x] 4.5 Create login page with tenant-specific branding
    - Build /login page with email/password form
    - Extract tenant from subdomain for scoped login
    - Display validation errors for invalid credentials
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 4.6 Implement role-based redirect logic
    - Redirect admins to /admin after login
    - Redirect clients to /portal after login
    - _Requirements: 1.4, 1.5_
  
  - [ ]* 4.7 Write property test for role-based routing
    - **Property 3: Role-Based Routing Consistency**
    - **Validates: Requirements 1.4, 1.5, 1.8**
  
  - [x] 4.8 Implement logout functionality
    - Create logout action to invalidate session
    - Redirect to login page after logout
    - _Requirements: 1.9, 10.4_
  
  - [ ]* 4.9 Write property test for session lifecycle
    - **Property 6: Session Lifecycle Management**
    - **Validates: Requirements 1.9, 10.4**

- [x] 5. Access control and authorization
  - [x] 5.1 Create server-side authorization helpers
    - Implement requireAdmin() helper
    - Implement requireClient() helper
    - Create requireTenantAccess() helper for data isolation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 5.2 Implement route protection middleware
    - Protect /admin/* routes (admin only)
    - Protect /portal/* routes (authenticated users)
    - Redirect unauthenticated users to login
    - Return 403 for unauthorized access attempts
    - _Requirements: 1.6, 1.7, 1.8_
  
  - [ ]* 5.3 Write property test for access control
    - **Property 4: Access Control Enforcement**
    - **Validates: Requirements 1.6, 1.7, 2.1, 2.2, 2.5**

- [x] 6. Checkpoint - Ensure authentication and access control work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Company management (Admin)
  - [x] 7.1 Create company list page
    - Build /admin/companies page with table view
    - Display company name, contactEmail, creation date
    - Show user count and ticket count per company
    - Add "Create Company" button
    - _Requirements: 3.1, 3.5_
  
  - [x] 7.2 Create company creation form and API
    - Build company creation form with validation
    - Create POST /api/admin/companies endpoint
    - Validate required fields (name, contactEmail)
    - Hash and store company data
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 7.3 Write property test for company creation
    - **Property 7: Data Creation with Tenant Scoping**
    - **Validates: Requirements 3.2**
  
  - [ ]* 7.4 Write property test for validation rules
    - **Property 8: Validation Rule Enforcement**
    - **Validates: Requirements 3.3**
  
  - [x] 7.5 Create company edit functionality
    - Build company edit form
    - Create PUT /api/admin/companies/[id] endpoint
    - Update company record and return updated data
    - _Requirements: 3.4_
  
  - [ ]* 7.6 Write property test for company updates
    - **Property 9: Data Update Consistency**
    - **Validates: Requirements 3.4**

- [x] 8. User management (Admin)
  - [x] 8.1 Create user list page
    - Build /admin/users page with table view
    - Display user name, email, role, company name
    - Add "Create User" button
    - _Requirements: 4.1_
  
  - [x] 8.2 Create user creation form and API
    - Build user creation form with role selection
    - Create POST /api/admin/users endpoint
    - Hash passwords with bcrypt
    - Associate CLIENT users with company
    - Set companyId to null for ADMIN users
    - _Requirements: 4.2, 4.3_
  
  - [ ]* 8.3 Write property test for user creation
    - **Property 7: Data Creation with Tenant Scoping**
    - **Validates: Requirements 4.2, 4.3**
  
  - [x] 8.4 Implement user validation rules
    - Validate unique email addresses
    - Validate required fields (name, email, password, role)
    - Validate CLIENT users have companyId
    - Display field-level validation errors
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [ ]* 8.5 Write property test for user validation
    - **Property 8: Validation Rule Enforcement**
    - **Validates: Requirements 4.4, 4.5, 4.6**

- [x] 9. Admin dashboard and ticket management
  - [x] 9.1 Create admin dashboard page
    - Build /admin page with overview cards
    - Display ticket counts grouped by status
    - Show table of 10 most recent tickets across all companies
    - _Requirements: 7.1_
  
  - [ ]* 9.2 Write property test for data aggregation
    - **Property 12: Data Aggregation Accuracy**
    - **Validates: Requirements 3.5, 6.1, 7.1**
  
  - [x] 9.3 Create admin ticket list page
    - Build /admin/tickets page with filterable table
    - Add filters for Company, TicketStatus, TicketPriority
    - Display all tickets across all companies
    - _Requirements: 7.2_
  
  - [x] 9.4 Implement ticket filtering logic
    - Apply filters to ticket query
    - Update results to match all selected criteria
    - _Requirements: 7.3_
  
  - [ ]* 9.5 Write property test for filtering logic
    - **Property 14: Filtering Logic Correctness**
    - **Validates: Requirements 7.3**
  
  - [x] 9.6 Create admin ticket detail page
    - Build /admin/tickets/[id] page
    - Display full ticket details and all comments (public and internal)
    - Add controls to change status and priority
    - Show all attached images
    - _Requirements: 7.4_
  
  - [x] 9.7 Implement ticket status and priority updates
    - Create API endpoints for status/priority changes
    - Update ticket record on form submission
    - _Requirements: 7.5, 7.6_
  
  - [ ]* 9.8 Write property test for ticket updates
    - **Property 9: Data Update Consistency**
    - **Validates: Requirements 7.5, 7.6**

- [ ] 10. Admin Kanban Board View
  - [ ] 10.1 Create AdminInteractiveTicketBoard component
    - Build client-side interactive kanban board component
    - Implement five status columns (OPEN, IN_PROGRESS, WAITING_CLIENT, RESOLVED, CLOSED)
    - Display tickets grouped by status with company identification
    - Add visual indicators for priority, company, category, comments, and images
    - _Requirements: 7.2, 7.4_
  
  - [ ] 10.2 Implement drag-and-drop functionality
    - Add HTML5 drag-and-drop handlers (dragStart, dragOver, drop)
    - Implement optimistic UI updates for immediate feedback
    - Call existing PATCH /api/admin/tickets/[id]/status endpoint
    - Add error handling with revert on failure
    - Show loading state during API calls
    - _Requirements: 7.5_
  
  - [ ]* 10.3 Write property test for drag-and-drop status updates
    - **Property 9: Data Update Consistency**
    - **Validates: Requirements 7.5**
  
  - [ ] 10.4 Create view toggle component
    - Build ViewToggle component with table/board options
    - Persist view selection in URL search parameters
    - Preserve all filters when switching views
    - _Requirements: 7.2_
  
  - [ ] 10.5 Integrate board view into admin tickets page
    - Add view toggle to /admin/tickets page header
    - Conditionally render AdminInteractiveTicketBoard or AdminTicketsTable
    - Share filter component between both views
    - Default to table view if no view parameter specified
    - _Requirements: 7.2_
  
  - [ ] 10.6 Enhance admin ticket filters for board view
    - Ensure existing TicketFilters component works with board view
    - Apply server-side filtering to board data
    - Maintain filter state across view changes
    - _Requirements: 7.3_
  
  - [ ]* 10.7 Write property test for filter consistency
    - **Property 14: Filtering Logic Correctness**
    - **Validates: Requirements 7.3**
  
  - [ ] 10.8 Add accessibility features to kanban board
    - Add ARIA labels for drag handles and drop zones
    - Implement keyboard navigation (tab, enter)
    - Add screen reader support for status changes
    - Ensure ticket cards are keyboard accessible
    - _Requirements: General accessibility_
  
  - [ ]* 10.9 Write integration tests for board view
    - Test drag-and-drop status updates
    - Test filter application in board view
    - Test view toggle persistence
    - Test error handling and revert behavior
    - _Requirements: Testing strategy_

- [x] 11. Checkpoint - Ensure admin functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Client portal dashboard
  - [ ] 12.1 Create client portal dashboard
    - Build /portal page with summary statistics
    - Display total tickets, open tickets, in-progress tickets
    - Scope all data to client's company
    - _Requirements: 6.1_
  
  - [ ] 12.2 Create client ticket list view
    - Build ticket list component for /portal
    - Filter tickets by client's companyId
    - Display ticket title, status, priority, creation date
    - _Requirements: 6.2_
  
  - [ ]* 12.3 Write property test for tenant data filtering
    - **Property 5: Tenant Isolation Guarantee**
    - **Validates: Requirements 6.2**

- [ ] 13. Ticket creation (Client)
  - [ ] 13.1 Create ticket creation page
    - Build /portal/tickets/new page with form
    - Add fields for title, description, priority, category
    - Include image upload component
    - _Requirements: 5.1_
  
  - [ ] 13.2 Implement ticket creation API
    - Create POST /api/portal/tickets endpoint
    - Set status to OPEN by default
    - Set companyId from session
    - Associate ticket with creator
    - _Requirements: 5.2_
  
  - [ ]* 13.3 Write property test for ticket creation
    - **Property 7: Data Creation with Tenant Scoping**
    - **Validates: Requirements 5.2**
  
  - [ ] 13.4 Implement ticket validation
    - Validate required fields (title, description)
    - Display validation errors
    - _Requirements: 5.3_
  
  - [ ]* 13.5 Write property test for ticket validation
    - **Property 8: Validation Rule Enforcement**
    - **Validates: Requirements 5.3**
  
  - [ ] 13.6 Implement post-creation redirect
    - Redirect to /portal/tickets/[id] after successful creation
    - _Requirements: 5.7_
  
  - [ ]* 13.7 Write property test for post-action navigation
    - **Property 13: Post-Action Navigation**
    - **Validates: Requirements 5.7**

- [ ] 14. Ticket detail view (Client)
  - [ ] 14.1 Create client ticket detail page
    - Build /portal/tickets/[id] page
    - Display full ticket details
    - Show all public comments (internal=false)
    - Display attached images
    - _Requirements: 6.3, 6.5_
  
  - [ ] 14.2 Implement tenant access validation
    - Return 404 if ticket belongs to different company
    - Verify companyId matches session
    - _Requirements: 6.4_
  
  - [ ]* 14.3 Write property test for tenant access validation
    - **Property 5: Tenant Isolation Guarantee**
    - **Validates: Requirements 6.4**

- [ ] 15. Image upload functionality
  - [ ] 15.1 Create image upload service
    - Implement file upload handler
    - Validate file types (JPEG, PNG, GIF, WebP)
    - Validate file size (max 10MB)
    - Store images in persistent location
    - _Requirements: 5.4, 9.1, 9.2, 9.3, 9.5_
  
  - [ ] 15.2 Create TicketImage records
    - Associate uploaded images with tickets
    - Store filename, URL, size, mimeType
    - _Requirements: 5.5, 9.5_
  
  - [ ]* 15.3 Write property test for file upload validation
    - **Property 10: File Upload Validation and Storage**
    - **Validates: Requirements 5.4, 5.5, 5.6, 7.7, 9.1, 9.2, 9.3, 9.5**
  
  - [ ] 15.4 Implement image display component
    - Create thumbnail preview component
    - Display images on ticket detail pages
    - _Requirements: 9.4_
  
  - [ ]* 15.5 Write property test for image display
    - **Property 15: Image Display Consistency**
    - **Validates: Requirements 9.4**
  
  - [ ] 15.6 Add image upload to ticket creation form
    - Integrate upload component in /portal/tickets/new
    - Handle multiple file uploads
    - _Requirements: 5.4, 5.5_
  
  - [ ] 15.7 Add image upload to ticket detail pages
    - Integrate upload component in ticket detail views
    - Allow admins to upload images on /admin/tickets/[id]
    - _Requirements: 7.7_

- [ ] 16. Ticket comments system
  - [ ] 16.1 Create comment form component
    - Build comment input form
    - Add "internal note" toggle for admins
    - Display validation errors for empty comments
    - _Requirements: 8.1, 8.3, 8.4, 8.6_
  
  - [ ] 16.2 Implement comment creation API
    - Create POST /api/tickets/[id]/comments endpoint
    - Set internal flag based on user role and toggle
    - Associate comment with ticket and author
    - Validate tenant access for client users
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 16.3 Write property test for comment visibility
    - **Property 11: Comment Visibility and Association**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.7, 6.5**
  
  - [ ] 16.4 Implement comment display component
    - Display comments in chronological order
    - Show author name and timestamp
    - Hide internal comments from client users
    - _Requirements: 8.7, 6.5_
  
  - [ ] 16.5 Integrate comments into ticket detail pages
    - Add comment list to /portal/tickets/[id]
    - Add comment list to /admin/tickets/[id]
    - Include comment form at bottom of page
    - _Requirements: 6.3, 7.4_

- [ ] 17. Checkpoint - Ensure core ticket functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Email notification system
  - [ ] 18.1 Create notification settings model and API
    - Implement GET/PUT /api/portal/settings/notifications endpoints
    - Create default notification settings for new companies
    - Allow companies to configure notification preferences
    - _Requirements: Email notification system_
  
  - [ ] 18.2 Create email template management
    - Implement email template CRUD endpoints
    - Create default email templates
    - Allow custom template creation
    - _Requirements: Email notification system_
  
  - [ ] 18.3 Implement SMTP email service
    - Configure SMTP client with environment variables
    - Create sendNotification function
    - Implement email template rendering
    - _Requirements: Email notification system_
  
  - [ ] 18.4 Create notification trigger system
    - Implement event listeners for ticket events
    - Trigger notifications on status changes
    - Trigger notifications on new comments
    - Trigger notifications on ticket resolution
    - _Requirements: Email notification system_
  
  - [ ] 18.5 Implement notification logging
    - Create NotificationLog records for all sent emails
    - Track delivery status and errors
    - _Requirements: Email notification system_
  
  - [ ]* 18.6 Write property test for notification delivery
    - **Property 16: Notification Delivery Guarantee**
    - **Validates: Email notification system**
  
  - [ ]* 18.7 Write property test for template data consistency
    - **Property 17: Template Data Consistency**
    - **Validates: Email notification system**
  
  - [ ]* 18.8 Write property test for tenant notification isolation
    - **Property 18: Tenant Notification Isolation**
    - **Validates: Email notification system**
  
  - [ ] 18.9 Create notification settings UI
    - Build /portal/settings/notifications page
    - Allow companies to toggle notification types
    - Add test email functionality
    - _Requirements: Email notification system_

- [ ] 19. Shared layouts and navigation
  - [ ] 19.1 Create admin layout component
    - Build layout with top navigation bar
    - Display admin name and logout button
    - Apply to all /admin routes
    - _Requirements: 10.2, 10.3_
  
  - [ ] 19.2 Create portal layout component
    - Build layout with top navigation bar
    - Display client name, company name, and logout button
    - Apply to all /portal routes
    - _Requirements: 10.1, 10.3_
  
  - [ ] 19.3 Integrate logout functionality in navigation
    - Add logout button click handler
    - Invalidate session and redirect to login
    - _Requirements: 10.4_

- [ ] 20. UI polish and styling
  - [ ] 20.1 Apply consistent Tailwind styling
    - Style all forms with consistent input styles
    - Style all tables with consistent table styles
    - Add loading states and error states
    - _Requirements: General UI/UX_
  
  - [ ] 20.2 Add responsive design
    - Ensure mobile-friendly layouts
    - Test on various screen sizes
    - _Requirements: General UI/UX_
  
  - [ ] 20.3 Implement status and priority badges
    - Create badge components for ticket status
    - Create badge components for ticket priority
    - Apply consistent color coding
    - _Requirements: General UI/UX_

- [ ] 21. Testing and quality assurance
  - [ ] 21.1 Set up testing framework
    - Configure Jest or Vitest for unit tests
    - Set up fast-check for property-based tests
    - Add test scripts to package.json
    - _Requirements: 12.2_
  
  - [ ] 21.2 Create authentication test suite
    - Test login with valid credentials
    - Test login with invalid credentials
    - Test role-based redirects
    - Test session creation
    - _Requirements: 12.2_
  
  - [ ] 21.3 Create access control test suite
    - Test requireAdmin helper
    - Test requireClient helper
    - Test tenant access validation
    - Test route protection
    - _Requirements: 12.2_
  
  - [ ]* 21.4 Run all property-based tests
    - Execute all property tests with 100+ iterations
    - Verify all correctness properties hold
    - _Requirements: Testing strategy_
  
  - [ ]* 21.5 Create integration test suite
    - Test end-to-end ticket creation flow
    - Test end-to-end comment creation flow
    - Test multi-tenant isolation
    - _Requirements: Testing strategy_

- [ ] 22. Documentation and deployment preparation
  - [ ] 22.1 Complete README documentation
    - Document all environment variables
    - Add installation instructions
    - Add database migration commands
    - Add development server start command
    - _Requirements: 12.1_
  
  - [ ] 22.2 Create deployment guide
    - Document production environment setup
    - Add database backup and restore procedures
    - Document SMTP configuration
    - _Requirements: Deployment preparation_
  
  - [ ] 22.3 Create user guide documentation
    - Document admin workflows
    - Document client workflows
    - Add screenshots and examples
    - _Requirements: Documentation_

- [ ] 23. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Property tests validate universal correctness properties from the design document
- The implementation uses TypeScript throughout as specified in the design
- Multi-tenant architecture is implemented from the start to ensure proper data isolation
- Authentication and authorization are prioritized early to secure all subsequent features
