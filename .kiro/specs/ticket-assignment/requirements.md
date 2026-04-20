# Requirements Document

## Introduction

The Ticket Assignment System enables the admin company (PFT) to assign support tickets to specific admin users (agents/developers) for better workload management and accountability. This feature adds an "Assigned To" field to tickets, allowing admins to track which developer is handling each ticket, with optional visibility for clients to see who is working on their requests.

## Glossary

- **Admin_User**: A user with role ADMIN who can manage tickets across all companies
- **Agent**: An admin user who handles support tickets (also referred to as developer or client satisfaction manager)
- **Ticket_System**: The support ticket management system
- **Assignment_Field**: The "Assigned To" field on a ticket that references an admin user
- **Admin_Tenant**: The PFT company tenant where admin users operate
- **Client_Tenant**: A customer company tenant where client users submit tickets
- **Ticket_List**: The table or board view displaying multiple tickets
- **Ticket_Detail**: The individual ticket page showing full ticket information

## Requirements

### Requirement 1: Database Schema for Ticket Assignment

**User Story:** As a system administrator, I want tickets to store assignment information, so that the system can track which agent is responsible for each ticket.

#### Acceptance Criteria

1. THE Ticket_System SHALL add an optional assignedToId field to the Ticket model that references a User
2. THE Ticket_System SHALL add an optional assignedAt timestamp field to the Ticket model
3. THE Ticket_System SHALL allow the assignedToId field to be null (unassigned tickets)
4. WHEN a ticket is assigned, THE Ticket_System SHALL record the current timestamp in assignedAt
5. THE Ticket_System SHALL maintain referential integrity between assignedToId and the User model

### Requirement 2: Assign Tickets to Admin Users

**User Story:** As an admin, I want to assign tickets to specific agents, so that I can distribute workload and establish accountability.

#### Acceptance Criteria

1. WHEN viewing a ticket detail page, THE Admin_User SHALL see an assignment control
2. THE Ticket_System SHALL display a list of all active admin users as assignment options
3. WHEN an admin selects an agent, THE Ticket_System SHALL update the ticket's assignedToId field
4. WHEN an admin assigns a ticket, THE Ticket_System SHALL record the assignment timestamp
5. THE Ticket_System SHALL allow admins to change the assigned agent at any time
6. THE Ticket_System SHALL allow admins to unassign a ticket (set assignedToId to null)
7. THE Ticket_System SHALL persist assignment changes immediately

### Requirement 3: Display Assignment in Admin Ticket List

**User Story:** As an admin, I want to see who is assigned to each ticket in the ticket list, so that I can quickly understand workload distribution.

#### Acceptance Criteria

1. WHEN viewing the admin ticket list in table view, THE Ticket_System SHALL display an "Assigned To" column
2. WHEN a ticket is assigned, THE Ticket_System SHALL display the assigned agent's name in the list
3. WHEN a ticket is unassigned, THE Ticket_System SHALL display "Unassigned" or an empty indicator
4. WHEN viewing the admin ticket board, THE Ticket_System SHALL display the assigned agent's name on each ticket card
5. THE Ticket_System SHALL display assignment information without requiring additional user interaction

### Requirement 4: Display Assignment in Admin Ticket Detail

**User Story:** As an admin, I want to see assignment details on the ticket detail page, so that I have complete context about ticket ownership.

#### Acceptance Criteria

1. WHEN viewing a ticket detail page, THE Ticket_System SHALL display the currently assigned agent's name
2. WHEN a ticket is assigned, THE Ticket_System SHALL display when the assignment was made
3. WHEN a ticket is unassigned, THE Ticket_System SHALL indicate no agent is assigned
4. THE Ticket_System SHALL display assignment information in the ticket information sidebar
5. THE Ticket_System SHALL update the assignment display immediately after changes

### Requirement 5: Filter and Sort by Assignment

**User Story:** As an admin, I want to filter and sort tickets by assigned agent, so that I can view specific agents' workloads.

#### Acceptance Criteria

1. WHEN viewing the admin ticket list, THE Ticket_System SHALL provide a filter for assigned agent
2. THE Ticket_System SHALL include "Unassigned" as a filter option
3. THE Ticket_System SHALL allow sorting tickets by assigned agent name
4. WHEN a filter is applied, THE Ticket_System SHALL display only tickets matching the filter criteria
5. THE Ticket_System SHALL maintain filter state across page navigation

### Requirement 6: Display Assignment in Client Portal

**User Story:** As a client, I want to see who is assigned to my ticket, so that I know which agent is handling my request.

#### Acceptance Criteria

1. WHEN viewing a ticket detail page in the client portal, THE Ticket_System SHALL display the assigned agent's name
2. WHEN a ticket is assigned, THE Ticket_System SHALL show the agent's name in the ticket information section
3. WHEN a ticket is unassigned, THE Ticket_System SHALL display "Not yet assigned" or similar message
4. THE Ticket_System SHALL display assignment information in a read-only format for clients
5. WHEN viewing the client ticket list in table view, THE Ticket_System SHALL display the assigned agent in a column
6. WHEN viewing the client ticket board, THE Ticket_System SHALL display the assigned agent on each ticket card

### Requirement 7: API Endpoints for Assignment

**User Story:** As a developer, I want API endpoints for ticket assignment, so that the frontend can manage assignments.

#### Acceptance Criteria

1. THE Ticket_System SHALL provide a PATCH endpoint at /api/admin/tickets/[id]/assign
2. WHEN receiving a valid assignment request, THE Ticket_System SHALL update the ticket's assignedToId
3. WHEN receiving a null assignedToId, THE Ticket_System SHALL unassign the ticket
4. THE Ticket_System SHALL validate that the assignedToId references an active admin user
5. THE Ticket_System SHALL return the updated ticket data after assignment
6. IF the assignedToId is invalid, THEN THE Ticket_System SHALL return a 400 error with a descriptive message
7. THE Ticket_System SHALL require admin authentication for the assignment endpoint

### Requirement 8: Assignment Notification Support

**User Story:** As an admin, I want the system to support notifications when tickets are assigned, so that agents are informed of new assignments.

#### Acceptance Criteria

1. THE Ticket_System SHALL include TICKET_ASSIGNED in the NotificationTemplateType enum (already exists in schema)
2. THE Ticket_System SHALL respect the notifyOnTicketAssignment setting in NotificationSettings
3. WHEN a ticket is assigned and notifications are enabled, THE Ticket_System SHALL create a notification log entry
4. THE Ticket_System SHALL include the assigned agent's email as the recipient
5. THE Ticket_System SHALL include ticket details in the notification payload

### Requirement 9: Assignment Data Integrity

**User Story:** As a system administrator, I want assignment data to remain consistent, so that the system maintains accurate records.

#### Acceptance Criteria

1. WHEN a user is deactivated, THE Ticket_System SHALL preserve existing ticket assignments to that user
2. THE Ticket_System SHALL allow querying tickets assigned to inactive users
3. THE Ticket_System SHALL only allow assignment to active admin users
4. WHEN loading ticket data, THE Ticket_System SHALL include assigned user information in the query results
5. THE Ticket_System SHALL handle null assignedToId values without errors

### Requirement 10: Assignment in Ticket Creation

**User Story:** As an admin, I want to optionally assign a ticket during creation, so that I can immediately designate responsibility for new tickets.

#### Acceptance Criteria

1. WHEN creating a new ticket from the admin panel, THE Ticket_System SHALL provide an optional assignment field
2. THE Ticket_System SHALL display all active admin users as assignment options
3. WHEN an admin selects an agent during creation, THE Ticket_System SHALL set the assignedToId on the new ticket
4. THE Ticket_System SHALL allow creating tickets without assignment (assignedToId remains null)
5. WHEN a ticket is created with an assignment, THE Ticket_System SHALL record the assignment timestamp
