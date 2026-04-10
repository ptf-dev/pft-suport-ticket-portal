# Requirements Document

## Introduction

PropFirmsTech is a SaaS company providing technology solutions to proprietary trading firms (prop firms). Currently, support is managed via WhatsApp and Excel spreadsheets. This feature replaces that workflow with a production-ready web-based support ticketing portal built on Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL, and NextAuth for authentication.

The portal serves two distinct roles: internal PropFirmsTech Admins who manage all companies, users, and tickets; and Client Support Users who belong to a specific prop firm and manage only their company's tickets.

---

## Glossary

- **System**: The PropFirmsTech Support Portal web application
- **Admin**: A PropFirmsTech internal staff member with full access to all companies, users, and tickets
- **Client_User**: A support representative belonging to exactly one prop firm (Company), with access restricted to that company's tickets
- **Company**: A prop firm that is a client of PropFirmsTech
- **Ticket**: A support request created by a Client_User on behalf of their Company
- **TicketComment**: A message attached to a Ticket, either public (visible to all parties) or internal (visible to Admins only)
- **Session**: The authenticated user session containing role, user ID, and companyId
- **Portal**: The client-facing area of the application, accessible at `/portal`
- **Admin_Area**: The internal staff area of the application, accessible at `/admin`
- **Auth_Service**: The NextAuth-based authentication and session management service
- **API**: The Next.js API routes or server actions handling CRUD operations
- **Image_Upload_Service**: The service responsible for handling multiple image attachments per ticket
- **Role**: An enum value of either `ADMIN` or `CLIENT` assigned to each User
- **TicketStatus**: An enum with values `OPEN`, `IN_PROGRESS`, `WAITING_CLIENT`, `RESOLVED`, `CLOSED`
- **TicketPriority**: An enum with values `LOW`, `MEDIUM`, `HIGH`, `URGENT`

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user (Admin or Client_User), I want to log in with my email and password, so that I can securely access the portal appropriate to my role.

#### Acceptance Criteria

1. THE Auth_Service SHALL authenticate users using email and password credentials stored as bcrypt-hashed passwords in the database.
2. WHEN a user submits valid credentials on the `/login` page, THE Auth_Service SHALL create a session containing the user's id, name, email, role, and companyId.
3. WHEN a user submits invalid credentials, THE System SHALL display an error message on the `/login` page without revealing whether the email or password was incorrect.
4. WHEN authentication succeeds and the user's role is `ADMIN`, THE System SHALL redirect the user to `/admin`.
5. WHEN authentication succeeds and the user's role is `CLIENT`, THE System SHALL redirect the user to `/portal`.
6. WHEN an unauthenticated user attempts to access any route under `/admin` or `/portal`, THE System SHALL redirect the user to `/login`.
7. WHEN an authenticated Client_User attempts to access any route under `/admin`, THE System SHALL return a 403 Forbidden response.
8. WHEN an authenticated Admin attempts to access any route under `/portal`, THE System SHALL redirect the Admin to `/admin`.
9. WHEN a user clicks the logout action, THE Auth_Service SHALL invalidate the session and redirect the user to `/login`.

---

### Requirement 2: Role-Based Access Control

**User Story:** As a system operator, I want role-based access enforced server-side, so that Client_Users cannot access admin functionality or other companies' data.

#### Acceptance Criteria

1. THE API SHALL expose a `requireAdmin()` server-side helper that returns a 403 response when the caller's session role is not `ADMIN`.
2. THE API SHALL expose a `requireClient()` server-side helper that returns a 403 response when the caller's session role is not `CLIENT`.
3. WHEN a Client_User makes any API request involving a Ticket or TicketComment, THE API SHALL verify that the resource's `companyId` matches the `companyId` stored in the Client_User's Session.
4. IF a Client_User's Session does not contain a valid `companyId`, THEN THE API SHALL return a 403 response.
5. THE API SHALL enforce role checks on every protected route without relying solely on client-side navigation guards.

---

### Requirement 3: Company Management (Admin)

**User Story:** As an Admin, I want to create and manage Company records, so that I can onboard new prop firm clients and keep their information up to date.

#### Acceptance Criteria

1. THE System SHALL provide an `/admin/companies` page listing all Companies with their name, contactEmail, and creation date.
2. WHEN an Admin submits a valid create-company form, THE API SHALL persist a new Company record with the provided name, contactEmail, whatsappLink, and notes fields.
3. WHEN an Admin submits a create-company form with a missing or empty `name` field, THE System SHALL display a validation error and SHALL NOT persist the record.
4. WHEN an Admin submits a valid edit-company form, THE API SHALL update the existing Company record and return the updated record.
5. THE System SHALL display each Company's associated user count and ticket count on the `/admin/companies` page.

---

### Requirement 4: User Management (Admin)

**User Story:** As an Admin, I want to create and manage user accounts, so that I can provision access for Client_Users and other Admins.

#### Acceptance Criteria

1. THE System SHALL provide an `/admin/users` page listing all users with their name, email, role, and associated Company name.
2. WHEN an Admin submits a valid create-user form with role `CLIENT`, THE API SHALL create a User record with a bcrypt-hashed password and associate the user with the specified Company.
3. WHEN an Admin submits a valid create-user form with role `ADMIN`, THE API SHALL create a User record with a bcrypt-hashed password and a null `companyId`.
4. WHEN an Admin submits a create-user form with an email address that already exists in the database, THE System SHALL display a validation error and SHALL NOT create a duplicate record.
5. WHEN an Admin submits a create-user form with a missing name, email, password, or role field, THE System SHALL display a field-level validation error and SHALL NOT persist the record.
6. WHEN an Admin submits a create-user form with role `CLIENT` and no `companyId` selected, THE System SHALL display a validation error and SHALL NOT persist the record.

---

### Requirement 5: Ticket Creation (Client_User)

**User Story:** As a Client_User, I want to create support tickets for my company, so that I can report issues and track their resolution.

#### Acceptance Criteria

1. THE System SHALL provide a `/portal/tickets/new` page containing a form with fields for title, description, priority, and category.
2. WHEN a Client_User submits a valid ticket creation form, THE API SHALL create a Ticket record with status `OPEN`, the provided title, description, priority, and category, and the `companyId` taken from the Client_User's Session.
3. WHEN a Client_User submits a ticket creation form with a missing title or description, THE System SHALL display a validation error and SHALL NOT persist the Ticket.
4. WHEN a Client_User submits a ticket creation form, THE System SHALL allow the user to attach zero or more image files to the Ticket via the Image_Upload_Service.
5. WHEN image files are attached during ticket creation, THE Image_Upload_Service SHALL store each image and associate its reference with the created Ticket record.
6. WHEN a Client_User submits a ticket creation form with an image file exceeding 10 MB, THE System SHALL display a validation error and SHALL NOT upload that file.
7. AFTER a Ticket is successfully created, THE System SHALL redirect the Client_User to the ticket detail page at `/portal/tickets/[id]`.

---

### Requirement 6: Ticket Visibility and Listing (Client_User)

**User Story:** As a Client_User, I want to see only my company's tickets, so that I can manage my firm's support requests without seeing other clients' data.

#### Acceptance Criteria

1. THE System SHALL provide a `/portal` dashboard page displaying summary statistics (total tickets, open tickets, in-progress tickets) scoped to the Client_User's Company.
2. WHEN a Client_User accesses the `/portal` page, THE API SHALL return only Tickets whose `companyId` matches the Client_User's Session `companyId`.
3. THE System SHALL provide a `/portal/tickets/[id]` page displaying the full Ticket details and all public TicketComments for that Ticket.
4. WHEN a Client_User attempts to access `/portal/tickets/[id]` for a Ticket belonging to a different Company, THE System SHALL return a 404 response.
5. WHILE viewing `/portal/tickets/[id]`, THE System SHALL NOT display TicketComments where `internal` is `true`.

---

### Requirement 7: Ticket Management (Admin)

**User Story:** As an Admin, I want to view and update all tickets across all companies, so that I can manage support operations efficiently.

#### Acceptance Criteria

1. THE System SHALL provide an `/admin` dashboard page displaying overview cards with counts of tickets grouped by TicketStatus, and a table of the most recent 10 Tickets across all Companies.
2. THE System SHALL provide an `/admin/tickets` page listing all Tickets with filterable columns for Company, TicketStatus, and TicketPriority.
3. WHEN an Admin applies a filter on the `/admin/tickets` page, THE System SHALL update the ticket list to show only Tickets matching all selected filter criteria.
4. THE System SHALL provide an `/admin/tickets/[id]` page displaying full Ticket details, all TicketComments (both public and internal), and controls to change TicketStatus and TicketPriority.
5. WHEN an Admin submits a status change on `/admin/tickets/[id]`, THE API SHALL update the Ticket's `status` field to the selected TicketStatus value.
6. WHEN an Admin submits a priority change on `/admin/tickets/[id]`, THE API SHALL update the Ticket's `priority` field to the selected TicketPriority value.
7. WHEN an Admin uploads images on `/admin/tickets/[id]`, THE Image_Upload_Service SHALL store each image and associate its reference with the Ticket record.

---

### Requirement 8: Ticket Comments

**User Story:** As a user (Admin or Client_User), I want to add comments to tickets, so that I can communicate about the issue and track progress.

#### Acceptance Criteria

1. WHEN an authenticated user submits a non-empty comment on a ticket detail page, THE API SHALL create a TicketComment record associated with the Ticket and the author's user id.
2. WHEN a Client_User submits a comment, THE API SHALL set the TicketComment's `internal` field to `false`.
3. WHEN an Admin submits a comment with the "internal note" toggle enabled, THE API SHALL set the TicketComment's `internal` field to `true`.
4. WHEN an Admin submits a comment with the "internal note" toggle disabled, THE API SHALL set the TicketComment's `internal` field to `false`.
5. WHEN a Client_User submits a comment on a Ticket whose `companyId` does not match the Client_User's Session `companyId`, THE API SHALL return a 403 response and SHALL NOT persist the comment.
6. WHEN a user submits an empty comment, THE System SHALL display a validation error and SHALL NOT persist the TicketComment.
7. THE System SHALL display TicketComments in ascending chronological order on ticket detail pages.

---

### Requirement 9: Image Uploads

**User Story:** As a user, I want to attach multiple images to a ticket, so that I can provide visual context for the support issue.

#### Acceptance Criteria

1. THE Image_Upload_Service SHALL accept multiple image file uploads per Ticket on both the ticket creation form and the ticket detail page.
2. WHEN an uploaded file is not an image type (JPEG, PNG, GIF, or WebP), THE Image_Upload_Service SHALL reject the file and return a validation error.
3. WHEN an uploaded image file exceeds 10 MB, THE Image_Upload_Service SHALL reject the file and return a validation error.
4. WHEN images are successfully uploaded, THE System SHALL display thumbnail previews of all attached images on the ticket detail page.
5. THE Image_Upload_Service SHALL store uploaded images in a persistent location and associate each image's URL or path with the corresponding Ticket record.

---

### Requirement 10: Navigation and Shared Layouts

**User Story:** As a user, I want consistent navigation and layout, so that I can move between pages efficiently and always know my current context.

#### Acceptance Criteria

1. THE System SHALL render a top navigation bar on all pages under `/portal` displaying the Client_User's name, their Company name, and a logout button.
2. THE System SHALL render a top navigation bar on all pages under `/admin` displaying the Admin's name and a logout button.
3. THE System SHALL apply a shared layout component to all `/portal` routes and a separate shared layout component to all `/admin` routes.
4. WHEN a user clicks the logout button in the navigation bar, THE Auth_Service SHALL invalidate the session and redirect the user to `/login`.

---

### Requirement 11: Data Integrity and Persistence

**User Story:** As a system operator, I want the data models to enforce referential integrity, so that the database remains consistent.

#### Acceptance Criteria

1. THE System SHALL define a `Company` model in the Prisma schema with fields: `id`, `name`, `contactEmail`, `whatsappLink`, `notes`, `createdAt`, `updatedAt`, and relations to `User` and `Ticket`.
2. THE System SHALL define a `User` model in the Prisma schema with fields: `id`, `name`, `email` (unique), `password`, `role` (Role enum), `companyId` (nullable), `createdAt`, `updatedAt`, and a relation to `Company`.
3. THE System SHALL define a `Ticket` model in the Prisma schema with fields: `id`, `title`, `description`, `status` (TicketStatus enum, default `OPEN`), `priority` (TicketPriority enum, default `MEDIUM`), `companyId`, `createdById`, `createdAt`, `updatedAt`, and relations to `Company`, `User`, `TicketComment`, and image references.
4. THE System SHALL define a `TicketComment` model in the Prisma schema with fields: `id`, `ticketId`, `authorId`, `message`, `internal` (boolean, default `false`), `createdAt`, and relations to `Ticket` and `User`.
5. THE System SHALL define `Role` enum with values `ADMIN` and `CLIENT`, `TicketStatus` enum with values `OPEN`, `IN_PROGRESS`, `WAITING_CLIENT`, `RESOLVED`, `CLOSED`, and `TicketPriority` enum with values `LOW`, `MEDIUM`, `HIGH`, `URGENT` in the Prisma schema.

---

### Requirement 12: Developer Experience

**User Story:** As a developer, I want clear setup documentation and a basic test structure, so that I can onboard quickly and maintain code quality.

#### Acceptance Criteria

1. THE System SHALL include a `README.md` file documenting all required environment variables, installation steps, database migration commands, and the command to start the development server.
2. THE System SHALL include a basic test structure with at least one test file covering authentication logic or API route access control.
3. WHEN a developer runs the documented setup steps, THE System SHALL reach a runnable state without requiring undocumented manual configuration.
