/**
 * Property-Based Tests for SMTP Validation Functions
 * Feature: admin-smtp-config
 * 
 * These tests verify universal properties of SMTP validation functions
 * using property-based testing with fast-check.
 */

import fc from 'fast-check'
import { validateHost, validatePort, validateEmail } from './smtp'

describe('Feature: admin-smtp-config - SMTP Validation Property Tests', () => {
  
  /**
   * Property 2: Host Validation
   * Validates: Requirements 2.2
   * 
   * For any string input to the host field, the validation SHALL accept
   * non-empty strings and reject empty strings or strings containing only whitespace.
   */
  test('Property 2: Host Validation', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (host) => {
          const result = validateHost(host)
          
          // Determine if the string is empty or only whitespace
          const isEmptyOrWhitespace = host.trim().length === 0
          
          if (isEmptyOrWhitespace) {
            // Should reject empty or whitespace-only strings
            expect(result.valid).toBe(false)
            expect(result.error).toBeDefined()
            expect(result.error).toContain('required')
          } else {
            // Should accept non-empty strings with actual content
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Host validation accepts all non-whitespace strings
   * This test specifically generates strings with at least one non-whitespace character
   */
  test('Property: Host validation accepts strings with content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (host) => {
          const result = validateHost(host)
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Host validation rejects whitespace-only strings
   * This test specifically generates strings with only whitespace characters
   */
  test('Property: Host validation rejects whitespace-only strings', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^\s+$/),
        (host) => {
          const result = validateHost(host)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Host validation rejects empty string
   */
  test('Property: Host validation rejects empty string', () => {
    const result = validateHost('')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('required')
  })

  /**
   * Property 3: Port Range Validation
   * Validates: Requirements 2.3
   * 
   * For any integer input to the port field, the validation SHALL accept
   * values in the range [1, 65535] and reject all values outside this range
   * (including 0, negative numbers, and values > 65535).
   */
  test('Property 3: Port Range Validation', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        (port) => {
          const result = validatePort(port)
          
          // Determine if the port is in valid range [1, 65535]
          const isValidRange = port >= 1 && port <= 65535
          
          if (isValidRange) {
            // Should accept ports in valid range
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
          } else {
            // Should reject ports outside valid range
            expect(result.valid).toBe(false)
            expect(result.error).toBeDefined()
            expect(result.error).toContain('between 1 and 65535')
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Port validation accepts boundary values
   * Test the exact boundaries of the valid range
   */
  test('Property: Port validation accepts boundary values 1 and 65535', () => {
    const result1 = validatePort(1)
    expect(result1.valid).toBe(true)
    expect(result1.error).toBeUndefined()

    const result65535 = validatePort(65535)
    expect(result65535.valid).toBe(true)
    expect(result65535.error).toBeUndefined()
  })

  /**
   * Additional property: Port validation rejects boundary violations
   * Test values just outside the valid range
   */
  test('Property: Port validation rejects 0 and 65536', () => {
    const result0 = validatePort(0)
    expect(result0.valid).toBe(false)
    expect(result0.error).toBeDefined()

    const result65536 = validatePort(65536)
    expect(result65536.valid).toBe(false)
    expect(result65536.error).toBeDefined()
  })

  /**
   * Additional property: Port validation rejects negative numbers
   */
  test('Property: Port validation rejects negative numbers', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: -1 }),
        (port) => {
          const result = validatePort(port)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Port validation rejects values above 65535
   */
  test('Property: Port validation rejects values above 65535', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 65536 }),
        (port) => {
          const result = validatePort(port)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 4: Email Format Validation
   * Validates: Requirements 2.4
   * 
   * For any string input to the sender email field, the validation SHALL accept
   * strings matching valid email format (RFC 5322) and reject strings that do not
   * match valid email format.
   */
  test('Property 4: Email Format Validation', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (email) => {
          const result = validateEmail(email)
          
          // Define what makes a valid email based on our implementation
          const hasAtSymbol = email.includes('@')
          const parts = email.split('@')
          const hasValidStructure = parts.length === 2 && parts[0].length > 0 && parts[1].length > 0
          const hasDotInDomain = hasValidStructure && parts[1].includes('.')
          const notTooLong = email.length <= 254
          const localPartNotTooLong = hasValidStructure && parts[0].length <= 64
          const noConsecutiveDots = !email.includes('..')
          const notEmpty = email.trim().length > 0
          
          // RFC 5322 simplified regex pattern (same as in implementation)
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
          const matchesRegex = emailRegex.test(email)
          
          // An email is valid if it passes all checks
          const shouldBeValid = notEmpty && hasAtSymbol && hasValidStructure && 
                                hasDotInDomain && notTooLong && localPartNotTooLong && 
                                noConsecutiveDots && matchesRegex
          
          if (shouldBeValid) {
            expect(result.valid).toBe(true)
            expect(result.error).toBeUndefined()
          } else {
            expect(result.valid).toBe(false)
            expect(result.error).toBeDefined()
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Email validation accepts valid email formats
   * Test with known valid email patterns
   */
  test('Property: Email validation accepts valid email formats', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/),
          fc.stringMatching(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/),
          fc.stringMatching(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/)
        ).map(([local, domain1, domain2]) => `${local}@${domain1}.${domain2}`),
        (email) => {
          // Filter out emails with consecutive dots or other edge cases
          if (email.includes('..') || email.length > 254) {
            return true // Skip these cases
          }
          
          const result = validateEmail(email)
          expect(result.valid).toBe(true)
          expect(result.error).toBeUndefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Email validation rejects invalid formats
   * Test specific invalid patterns
   */
  test('Property: Email validation rejects emails without @ symbol', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.includes('@')),
        (email) => {
          const result = validateEmail(email)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Email validation rejects empty or whitespace-only strings
   */
  test('Property: Email validation rejects empty or whitespace-only strings', () => {
    const emptyResult = validateEmail('')
    expect(emptyResult.valid).toBe(false)
    expect(emptyResult.error).toContain('required')

    fc.assert(
      fc.property(
        fc.stringMatching(/^\s+$/),
        (email) => {
          const result = validateEmail(email)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Email validation rejects emails with consecutive dots
   */
  test('Property: Email validation rejects emails with consecutive dots', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (local, domain) => {
          const email = `${local}..${domain}@example.com`
          const result = validateEmail(email)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Email validation rejects emails that are too long
   */
  test('Property: Email validation rejects emails longer than 254 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 255 }),
        (longString) => {
          // Create an email that's definitely too long
          const email = `${longString}@example.com`
          const result = validateEmail(email)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Email validation rejects emails with local part > 64 chars
   */
  test('Property: Email validation rejects emails with local part longer than 64 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 65 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        (longLocal) => {
          const email = `${longLocal}@example.com`
          const result = validateEmail(email)
          expect(result.valid).toBe(false)
          expect(result.error).toBeDefined()
        }
      ),
      { numRuns: 20 }
    )
  })
})
