/**
 * Property-Based Tests for Encryption Service
 * Feature: admin-smtp-config
 * 
 * These tests verify universal properties of the encryption service
 * using property-based testing with fast-check.
 */

import fc from 'fast-check'
import { EncryptionService } from './encryption'

describe('Feature: admin-smtp-config - Encryption Service Property Tests', () => {
  
  /**
   * Property 5: Password Encryption Round-Trip
   * Validates: Requirements 3.4, 5.1
   * 
   * For any password string, encrypting and then decrypting SHALL produce
   * the original password string, ensuring data integrity through the
   * encryption/decryption cycle.
   */
  test('Property 5: Password Encryption Round-Trip', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (password) => {
          // Encrypt the password
          const encrypted = EncryptionService.encrypt(password)
          
          // Verify encrypted format is correct (iv:authTag:ciphertext)
          expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
          
          // Decrypt the password
          const decrypted = EncryptionService.decrypt(encrypted)
          
          // Verify round-trip produces original value
          expect(decrypted).toBe(password)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Additional property: Each encryption produces unique ciphertext
   * Even encrypting the same plaintext twice should produce different
   * ciphertexts due to random IV generation.
   */
  test('Property: Encryption produces unique ciphertexts for same input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (password) => {
          const encrypted1 = EncryptionService.encrypt(password)
          const encrypted2 = EncryptionService.encrypt(password)
          
          // Different ciphertexts (due to different IVs)
          expect(encrypted1).not.toBe(encrypted2)
          
          // But both decrypt to the same value
          expect(EncryptionService.decrypt(encrypted1)).toBe(password)
          expect(EncryptionService.decrypt(encrypted2)).toBe(password)
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Encryption rejects empty strings
   */
  test('Property: Encryption rejects empty strings', () => {
    expect(() => EncryptionService.encrypt('')).toThrow('Cannot encrypt empty string')
  })

  /**
   * Property: Decryption rejects invalid format
   */
  test('Property: Decryption rejects invalid format', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.match(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)),
        (invalidCiphertext) => {
          expect(() => EncryptionService.decrypt(invalidCiphertext)).toThrow()
        }
      ),
      { numRuns: 20 }
    )
  })
})
