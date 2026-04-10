/**
 * Unit tests for SMTP validation functions
 * 
 * Tests specific examples and edge cases for:
 * - Host validation (Requirement 2.2)
 * - Port validation (Requirement 2.3)
 * - Email validation (Requirement 2.4)
 * - Sender name validation
 */

import {
  validateHost,
  validatePort,
  validateEmail,
  validateSenderName,
  validateUsername,
  validatePassword,
  validateSMTPSettings,
} from './smtp'

describe('SMTP Validation Functions - Unit Tests', () => {
  describe('validateHost', () => {
    it('should accept non-empty strings', () => {
      expect(validateHost('smtp.gmail.com').valid).toBe(true)
      expect(validateHost('mail.example.com').valid).toBe(true)
      expect(validateHost('localhost').valid).toBe(true)
      expect(validateHost('192.168.1.1').valid).toBe(true)
    })

    it('should reject empty strings', () => {
      const result = validateHost('')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject whitespace-only strings', () => {
      const result = validateHost('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject strings with only tabs and newlines', () => {
      const result = validateHost('\t\n')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('validatePort', () => {
    it('should accept valid port numbers', () => {
      expect(validatePort(1).valid).toBe(true)
      expect(validatePort(25).valid).toBe(true)
      expect(validatePort(465).valid).toBe(true)
      expect(validatePort(587).valid).toBe(true)
      expect(validatePort(65535).valid).toBe(true)
    })

    it('should reject port 0', () => {
      const result = validatePort(0)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('between 1 and 65535')
    })

    it('should reject negative ports', () => {
      const result = validatePort(-1)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('between 1 and 65535')
    })

    it('should reject ports greater than 65535', () => {
      const result = validatePort(65536)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('between 1 and 65535')
    })

    it('should reject non-integer ports', () => {
      const result = validatePort(587.5)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('integer')
    })

    it('should reject NaN', () => {
      const result = validatePort(NaN)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject Infinity', () => {
      const result = validatePort(Infinity)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com').valid).toBe(true)
      expect(validateEmail('test.user@example.com').valid).toBe(true)
      expect(validateEmail('user+tag@example.co.uk').valid).toBe(true)
      expect(validateEmail('user_name@example-domain.com').valid).toBe(true)
      expect(validateEmail('123@example.com').valid).toBe(true)
    })

    it('should reject empty email', () => {
      const result = validateEmail('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject email without @', () => {
      const result = validateEmail('userexample.com')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject email without domain', () => {
      const result = validateEmail('user@')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject email with spaces', () => {
      const result = validateEmail('user name@example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject email with consecutive dots', () => {
      const result = validateEmail('user..name@example.com')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('consecutive dots')
    })

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(255) + '@example.com'
      const result = validateEmail(longEmail)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too long')
    })

    it('should reject email with local part too long', () => {
      const longLocalPart = 'a'.repeat(65) + '@example.com'
      const result = validateEmail(longLocalPart)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('local part')
    })

    it('should accept email with special characters', () => {
      expect(validateEmail('user+tag@example.com').valid).toBe(true)
      expect(validateEmail('user.name@example.com').valid).toBe(true)
      expect(validateEmail('user_name@example.com').valid).toBe(true)
      expect(validateEmail('user-name@example.com').valid).toBe(true)
    })
  })

  describe('validateSenderName', () => {
    it('should accept non-empty names', () => {
      expect(validateSenderName('Support Team').valid).toBe(true)
      expect(validateSenderName('John Doe').valid).toBe(true)
      expect(validateSenderName('PropFirmsTech').valid).toBe(true)
    })

    it('should reject empty name', () => {
      const result = validateSenderName('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject whitespace-only name', () => {
      const result = validateSenderName('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject name that is too long', () => {
      const longName = 'a'.repeat(256)
      const result = validateSenderName(longName)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too long')
    })

    it('should accept name with special characters', () => {
      expect(validateSenderName('Support Team - PropFirmsTech').valid).toBe(true)
      expect(validateSenderName('John O\'Brien').valid).toBe(true)
    })
  })

  describe('validateUsername', () => {
    it('should accept non-empty usernames', () => {
      expect(validateUsername('user@example.com').valid).toBe(true)
      expect(validateUsername('apikey').valid).toBe(true)
      expect(validateUsername('admin').valid).toBe(true)
    })

    it('should reject empty username', () => {
      const result = validateUsername('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject whitespace-only username', () => {
      const result = validateUsername('   ')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject username that is too long', () => {
      const longUsername = 'a'.repeat(256)
      const result = validateUsername(longUsername)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('too long')
    })
  })

  describe('validatePassword', () => {
    it('should accept non-empty passwords', () => {
      expect(validatePassword('password123').valid).toBe(true)
      expect(validatePassword('P@ssw0rd!').valid).toBe(true)
      expect(validatePassword('a').valid).toBe(true)
    })

    it('should reject empty password', () => {
      const result = validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should accept password with spaces', () => {
      // Passwords can contain spaces
      expect(validatePassword('my password').valid).toBe(true)
    })
  })

  describe('validateSMTPSettings', () => {
    const validSettings = {
      host: 'smtp.gmail.com',
      port: 587,
      username: 'user@example.com',
      password: 'password123',
      senderEmail: 'noreply@example.com',
      senderName: 'Support Team',
    }

    it('should accept valid settings', () => {
      const result = validateSMTPSettings(validSettings)
      expect(result.valid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should reject settings with invalid host', () => {
      const result = validateSMTPSettings({
        ...validSettings,
        host: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.host).toBeDefined()
    })

    it('should reject settings with invalid port', () => {
      const result = validateSMTPSettings({
        ...validSettings,
        port: 0,
      })
      expect(result.valid).toBe(false)
      expect(result.errors.port).toBeDefined()
    })

    it('should reject settings with invalid username', () => {
      const result = validateSMTPSettings({
        ...validSettings,
        username: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.username).toBeDefined()
    })

    it('should reject settings with invalid password', () => {
      const result = validateSMTPSettings({
        ...validSettings,
        password: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.password).toBeDefined()
    })

    it('should reject settings with invalid sender email', () => {
      const result = validateSMTPSettings({
        ...validSettings,
        senderEmail: 'invalid-email',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.senderEmail).toBeDefined()
    })

    it('should reject settings with invalid sender name', () => {
      const result = validateSMTPSettings({
        ...validSettings,
        senderName: '',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.senderName).toBeDefined()
    })

    it('should collect multiple validation errors', () => {
      const result = validateSMTPSettings({
        host: '',
        port: 0,
        username: '',
        password: '',
        senderEmail: 'invalid',
        senderName: '',
      })
      expect(result.valid).toBe(false)
      expect(Object.keys(result.errors).length).toBeGreaterThan(1)
      expect(result.errors.host).toBeDefined()
      expect(result.errors.port).toBeDefined()
      expect(result.errors.username).toBeDefined()
      expect(result.errors.password).toBeDefined()
      expect(result.errors.senderEmail).toBeDefined()
      expect(result.errors.senderName).toBeDefined()
    })
  })
})
