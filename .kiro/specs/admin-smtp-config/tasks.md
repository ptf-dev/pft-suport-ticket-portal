# Implementation Plan: Admin SMTP Configuration

## Overview

This implementation adds SMTP configuration capabilities to the admin section, enabling administrators to configure email server settings for sending notifications. The feature includes a secure configuration interface, encrypted credential storage, connection testing, and integration with the existing notification system.

## Tasks

- [x] 1. Set up database schema and encryption service
  - Add SMTPSettings model to Prisma schema with encrypted password field
  - Create and run database migration
  - Implement encryption service using AES-256-GCM for password encryption
  - Add ENCRYPTION_KEY to environment variables
  - _Requirements: 3.1, 3.4, 5.1, 5.2_

- [x] 1.1 Write property test for password encryption round-trip
  - **Property 5: Password Encryption Round-Trip**
  - **Validates: Requirements 3.4, 5.1**
  - Test that encrypting and decrypting any password string produces the original value

- [ ] 2. Implement SMTP service and validation layer
  - [x] 2.1 Create SMTP service with nodemailer integration
    - Implement createTransporter, testConnection, and sendTestEmail methods
    - Add connection timeout handling (10 seconds)
    - Implement error handling for connection and authentication failures
    - _Requirements: 4.2, 4.3, 4.4, 4.6_
  
  - [x] 2.2 Create validation functions for SMTP settings
    - Implement host validation (non-empty string)
    - Implement port validation (1-65535 range)
    - Implement email format validation (RFC 5322)
    - Implement sender name validation
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 2.3 Write property tests for validation functions
    - **Property 2: Host Validation**
    - **Validates: Requirements 2.2**
    - Test that validation accepts non-empty strings and rejects empty/whitespace strings
  
  - [x] 2.4 Write property test for port validation
    - **Property 3: Port Range Validation**
    - **Validates: Requirements 2.3**
    - Test that validation accepts ports 1-65535 and rejects all other values
  
  - [-] 2.5 Write property test for email validation
    - **Property 4: Email Format Validation**
    - **Validates: Requirements 2.4**
    - Test that validation accepts valid email formats and rejects invalid formats

- [ ] 3. Create API endpoints for SMTP configuration
  - [ ] 3.1 Implement GET /api/admin/settings/smtp endpoint
    - Add admin authentication check
    - Fetch SMTP settings from database
    - Decrypt password and mask it in response
    - Return settings or null if none exist
    - _Requirements: 1.3, 3.1, 3.2, 5.2, 8.1, 8.4, 8.5_
  
  - [ ] 3.2 Implement POST /api/admin/settings/smtp endpoint
    - Add admin authentication check
    - Validate request body using Zod schema
    - Encrypt password before saving
    - Create or update SMTP settings in database
    - Add audit logging (createdBy, updatedBy fields)
    - _Requirements: 2.5, 2.6, 3.4, 5.1, 5.3, 5.5, 8.2, 8.4, 8.5_
  
  - [ ] 3.3 Implement POST /api/admin/settings/smtp/test endpoint
    - Add admin authentication check
    - Validate request body
    - Test SMTP connection using provided settings
    - Send test email to sender address on success
    - Return detailed error messages on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.3, 8.4, 8.5_
  
  - [ ] 3.4 Write property test for admin-only access control
    - **Property 1: Admin-Only Access Control**
    - **Validates: Requirements 1.3, 1.4, 5.4, 8.4**
    - Test that non-admin users are denied access to all SMTP endpoints
  
  - [ ] 3.5 Write property test for HTTP status code mapping
    - **Property 7: HTTP Status Code Mapping**
    - **Validates: Requirements 8.5**
    - Test that API returns correct status codes for different scenarios
  
  - [ ] 3.6 Write property test for API response schema consistency
    - **Property 8: API Response Schema Consistency**
    - **Validates: Requirements 8.6**
    - Test that all API responses conform to standard schema structure

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Build admin UI components
  - [ ] 5.1 Create SMTP configuration page (app/admin/settings/smtp/page.tsx)
    - Add server-side admin authentication check
    - Fetch existing SMTP settings
    - Render page with form component
    - Display connection status indicator
    - _Requirements: 1.2, 1.3, 3.2, 3.3, 7.3_
  
  - [ ] 5.2 Create SMTP settings form component (smtp-settings-form.tsx)
    - Implement client component with form state management
    - Add form fields: host, port, secure, username, password, senderEmail, senderName
    - Implement real-time validation with error messages
    - Add password field with show/hide toggle
    - Add "Test Connection" button with loading state
    - Add "Save Settings" button
    - Add "Reset to Defaults" functionality
    - Display success/error toast notifications
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 4.1, 5.2, 5.3, 7.1, 7.4, 7.5_
  
  - [ ] 5.3 Create provider examples component (smtp-provider-examples.tsx)
    - Display example configurations for Gmail, Outlook, SendGrid, AWS SES
    - Add "Use This Configuration" buttons to populate form
    - _Requirements: 7.2_
  
  - [ ] 5.4 Write unit tests for SMTP form component
    - Test that all required fields are rendered
    - Test that password field is masked
    - Test that validation errors are displayed
    - Test that reset button clears all fields
    - _Requirements: 2.1, 5.2, 7.5_

- [ ] 6. Integrate with admin navigation
  - Update app/admin/modern-admin-nav.tsx to include SMTP Settings link
  - Add appropriate icon and label
  - _Requirements: 1.1_

- [ ] 7. Integrate with notification system
  - [ ] 7.1 Update email service to use SMTP configuration
    - Modify email sending logic to fetch active SMTP settings
    - Use configured SMTP settings when sending emails
    - Implement retry logic with exponential backoff (3 retries)
    - _Requirements: 6.2_
  
  - [ ] 7.2 Add SMTP status check to notification settings page
    - Display warning if no valid SMTP settings exist
    - Add link to SMTP configuration page
    - Show email notification availability status
    - _Requirements: 6.1, 6.3, 6.4, 6.5_
  
  - [ ] 7.3 Write integration tests for email sending
    - Test that emails use configured SMTP settings
    - Test retry logic on failure
    - Test that missing SMTP config prevents email sending
    - _Requirements: 6.2, 6.5_

- [ ] 8. Final checkpoint and documentation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify SMTP configuration works end-to-end
  - Verify integration with notification system

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Integration tests verify external SMTP connections and database operations
- The encryption service uses AES-256-GCM with a secret key from ENCRYPTION_KEY environment variable
- All API endpoints require ADMIN role authentication
- Password fields are encrypted before storage and masked in API responses
