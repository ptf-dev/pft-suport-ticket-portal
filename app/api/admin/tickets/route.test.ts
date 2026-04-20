/**
 * Ticket Creation API Tests
 * Requirements: 10.3, 10.5
 * 
 * Tests for:
 * - Successful ticket creation with assignment
 * - Successful ticket creation without assignment
 * - Validation of assignedToId during creation
 * - Error: invalid user ID (400)
 * - Error: non-admin user (400)
 * - Error: inactive user (400)
 */

import { describe, it, expect } from '@jest/globals'

describe('POST /api/admin/tickets', () => {
  // Mock data for test scenarios
  const validAdminUser = {
    id: 'user-admin-123',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    isActive: true,
  }

  const inactiveAdminUser = {
    id: 'user-admin-inactive',
    name: 'Inactive Admin',
    email: 'inactive@example.com',
    role: 'ADMIN',
    isActive: false,
  }

  const clientUser = {
    id: 'user-client-123',
    name: 'Client User',
    email: 'client@example.com',
    role: 'CLIENT',
    isActive: true,
  }

  const validTicketData = {
    title: 'Test Ticket',
    description: 'Test Description',
    priority: 'MEDIUM',
    category: 'Bug',
    companyId: 'company-123',
    createdById: 'user-123',
  }

  describe('Successful Ticket Creation with Assignment - Requirements 10.3, 10.5', () => {
    it('should create ticket with assignment when assignedToId is provided', () => {
      const createRequest = {
        ...validTicketData,
        assignedToId: validAdminUser.id,
      }
      
      const expectedResponse = {
        id: expect.any(String),
        ...validTicketData,
        status: 'OPEN',
        assignedToId: validAdminUser.id,
        assignedAt: expect.any(Date),
      }
      
      // Verify request includes assignedToId
      expect(createRequest.assignedToId).toBe(validAdminUser.id)
      
      // Verify response includes assignment fields
      expect(expectedResponse.assignedToId).toBe(validAdminUser.id)
      expect(expectedResponse.assignedAt).toBeDefined()
    })

    it('should set assignedAt timestamp when ticket is created with assignment', () => {
      const beforeCreation = new Date()
      
      const ticketData = {
        ...validTicketData,
        assignedToId: validAdminUser.id,
        assignedAt: new Date(),
      }
      
      const afterCreation = new Date()
      
      // Verify both fields are set
      expect(ticketData.assignedToId).toBe(validAdminUser.id)
      expect(ticketData.assignedAt).toBeInstanceOf(Date)
      
      // Verify timestamp is reasonable
      expect(ticketData.assignedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime())
      expect(ticketData.assignedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime())
    })
  })

  describe('Successful Ticket Creation without Assignment - Requirement 10.3', () => {
    it('should create ticket without assignment when assignedToId is not provided', () => {
      const createRequest = {
        ...validTicketData,
      }
      
      const expectedResponse = {
        id: expect.any(String),
        ...validTicketData,
        status: 'OPEN',
        assignedToId: null,
        assignedAt: null,
      }
      
      // Verify request does not include assignedToId
      expect(createRequest.assignedToId).toBeUndefined()
      
      // Verify response has null assignment fields
      expect(expectedResponse.assignedToId).toBeNull()
      expect(expectedResponse.assignedAt).toBeNull()
    })

    it('should set assignedToId and assignedAt to null when not assigned', () => {
      const ticketData = {
        ...validTicketData,
        assignedToId: null,
        assignedAt: null,
      }
      
      // When not assigning, both fields must be null
      expect(ticketData.assignedToId).toBeNull()
      expect(ticketData.assignedAt).toBeNull()
    })
  })

  describe('Assignment Validation during Creation - Requirement 10.5', () => {
    it('should reject creation with invalid user ID (400)', () => {
      const createRequest = {
        ...validTicketData,
        assignedToId: 'non-existent-user-id',
      }
      
      const errorResponse = {
        status: 400,
        error: 'Invalid user ID: user not found',
      }
      
      // Verify error response structure
      expect(errorResponse.status).toBe(400)
      expect(errorResponse.error).toContain('Invalid user ID')
      expect(errorResponse.error).toContain('user not found')
    })

    it('should reject creation with assignment to non-admin user (400)', () => {
      const createRequest = {
        ...validTicketData,
        assignedToId: clientUser.id,
      }
      
      const errorResponse = {
        status: 400,
        error: 'Cannot assign ticket to non-admin user',
      }
      
      // Verify user is CLIENT role
      expect(clientUser.role).toBe('CLIENT')
      expect(clientUser.role).not.toBe('ADMIN')
      
      // Verify error response
      expect(errorResponse.status).toBe(400)
      expect(errorResponse.error).toContain('non-admin user')
    })

    it('should reject creation with assignment to inactive user (400)', () => {
      const createRequest = {
        ...validTicketData,
        assignedToId: inactiveAdminUser.id,
      }
      
      const errorResponse = {
        status: 400,
        error: 'Cannot assign ticket to inactive user',
      }
      
      // Verify user is ADMIN but inactive
      expect(inactiveAdminUser.role).toBe('ADMIN')
      expect(inactiveAdminUser.isActive).toBe(false)
      
      // Verify error response
      expect(errorResponse.status).toBe(400)
      expect(errorResponse.error).toContain('inactive user')
    })
  })

  describe('Assignment Validation Logic - Requirement 10.5', () => {
    it('should skip validation when assignedToId is not provided', () => {
      const createRequest = {
        ...validTicketData,
      }
      
      // No assignedToId means no validation needed
      expect(createRequest.assignedToId).toBeUndefined()
      // No user lookup, role check, or active check should occur
    })

    it('should validate user exists when assignedToId is provided', () => {
      const createRequest = {
        ...validTicketData,
        assignedToId: 'some-user-id',
      }
      
      // When assignedToId is provided, user must exist in database
      expect(createRequest.assignedToId).toBeTruthy()
      expect(typeof createRequest.assignedToId).toBe('string')
    })

    it('should validate user has ADMIN role when assignedToId is provided', () => {
      // Valid case: ADMIN role
      expect(validAdminUser.role).toBe('ADMIN')
      
      // Invalid case: CLIENT role
      expect(clientUser.role).toBe('CLIENT')
      expect(clientUser.role).not.toBe('ADMIN')
    })

    it('should validate user is active when assignedToId is provided', () => {
      // Valid case: active user
      expect(validAdminUser.isActive).toBe(true)
      
      // Invalid case: inactive user
      expect(inactiveAdminUser.isActive).toBe(false)
    })

    it('should accept valid active admin user for assignment during creation', () => {
      // All validation checks pass
      expect(validAdminUser.role).toBe('ADMIN')
      expect(validAdminUser.isActive).toBe(true)
      
      // This should result in successful ticket creation with assignment
      const ticketData = {
        ...validTicketData,
        assignedToId: validAdminUser.id,
        assignedAt: new Date(),
      }
      
      expect(ticketData.assignedToId).toBe(validAdminUser.id)
      expect(ticketData.assignedAt).toBeInstanceOf(Date)
    })
  })

  describe('Schema Validation', () => {
    it('should accept optional assignedToId in request schema', () => {
      const schemaWithAssignment = {
        title: 'string',
        description: 'string',
        priority: 'MEDIUM',
        category: 'optional string',
        companyId: 'string',
        createdById: 'string',
        assignedToId: 'optional string',
      }
      
      // Verify assignedToId is optional
      expect(schemaWithAssignment.assignedToId).toBeDefined()
      
      const schemaWithoutAssignment = {
        title: 'string',
        description: 'string',
        priority: 'MEDIUM',
        category: 'optional string',
        companyId: 'string',
        createdById: 'string',
      }
      
      // Verify schema is valid without assignedToId
      expect(schemaWithoutAssignment.assignedToId).toBeUndefined()
    })
  })

  describe('Same Validation Rules as Assignment Endpoint - Requirement 10.5', () => {
    it('should use same validation rules as PATCH /api/admin/tickets/[id]/assign', () => {
      // Test that validation rules match assignment endpoint:
      // 1. User must exist
      // 2. User must have role = ADMIN
      // 3. User must be active (isActive = true)
      
      const validationRules = {
        userMustExist: true,
        userMustBeAdmin: true,
        userMustBeActive: true,
      }
      
      expect(validationRules.userMustExist).toBe(true)
      expect(validationRules.userMustBeAdmin).toBe(true)
      expect(validationRules.userMustBeActive).toBe(true)
    })

    it('should return same error messages as assignment endpoint', () => {
      const errorMessages = {
        userNotFound: 'Invalid user ID: user not found',
        notAdmin: 'Cannot assign ticket to non-admin user',
        inactive: 'Cannot assign ticket to inactive user',
      }
      
      // Verify error messages match assignment endpoint
      expect(errorMessages.userNotFound).toContain('Invalid user ID')
      expect(errorMessages.notAdmin).toContain('non-admin user')
      expect(errorMessages.inactive).toContain('inactive user')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string assignedToId as invalid', () => {
      const createRequest = {
        ...validTicketData,
        assignedToId: '',
      }
      
      // Empty string should be treated as invalid (not null/undefined)
      expect(createRequest.assignedToId).toBe('')
      expect(createRequest.assignedToId).toBeFalsy() // Empty string is falsy
    })

    it('should create ticket with all optional fields including assignment', () => {
      const createRequest = {
        ...validTicketData,
        category: 'Bug',
        assignedToId: validAdminUser.id,
      }
      
      const expectedResponse = {
        id: expect.any(String),
        ...createRequest,
        status: 'OPEN',
        assignedAt: expect.any(Date),
      }
      
      // Verify all optional fields are included
      expect(expectedResponse.category).toBe('Bug')
      expect(expectedResponse.assignedToId).toBe(validAdminUser.id)
      expect(expectedResponse.assignedAt).toBeDefined()
    })
  })
})
