/**
 * Unit Tests for Encryption Service
 * Feature: admin-smtp-config
 */

import { EncryptionService } from './encryption'

describe('Encryption Service Unit Tests', () => {
  
  test('validateKey returns true when ENCRYPTION_KEY is set', () => {
    expect(EncryptionService.validateKey()).toBe(true)
  })

  test('encrypt produces valid format', () => {
    const plaintext = 'test-password-123'
    const encrypted = EncryptionService.encrypt(plaintext)
    
    // Should match format: iv:authTag:ciphertext (all hex)
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
    
    // Should have 3 parts
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(3)
  })

  test('decrypt reverses encryption', () => {
    const plaintext = 'my-secret-password'
    const encrypted = EncryptionService.encrypt(plaintext)
    const decrypted = EncryptionService.decrypt(encrypted)
    
    expect(decrypted).toBe(plaintext)
  })

  test('encrypt throws error for empty string', () => {
    expect(() => EncryptionService.encrypt('')).toThrow('Cannot encrypt empty string')
  })

  test('decrypt throws error for empty string', () => {
    expect(() => EncryptionService.decrypt('')).toThrow('Cannot decrypt empty string')
  })

  test('decrypt throws error for invalid format', () => {
    expect(() => EncryptionService.decrypt('invalid')).toThrow('Invalid ciphertext format')
    expect(() => EncryptionService.decrypt('only:two')).toThrow('Invalid ciphertext format')
  })

  test('encrypt produces different ciphertexts for same input', () => {
    const plaintext = 'same-password'
    const encrypted1 = EncryptionService.encrypt(plaintext)
    const encrypted2 = EncryptionService.encrypt(plaintext)
    
    // Different ciphertexts due to random IV
    expect(encrypted1).not.toBe(encrypted2)
    
    // But both decrypt to same value
    expect(EncryptionService.decrypt(encrypted1)).toBe(plaintext)
    expect(EncryptionService.decrypt(encrypted2)).toBe(plaintext)
  })

  test('handles special characters in password', () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
    const encrypted = EncryptionService.encrypt(specialChars)
    const decrypted = EncryptionService.decrypt(encrypted)
    
    expect(decrypted).toBe(specialChars)
  })

  test('handles unicode characters in password', () => {
    const unicode = '你好世界 🔐 مرحبا'
    const encrypted = EncryptionService.encrypt(unicode)
    const decrypted = EncryptionService.decrypt(encrypted)
    
    expect(decrypted).toBe(unicode)
  })

  test('handles long passwords', () => {
    const longPassword = 'a'.repeat(1000)
    const encrypted = EncryptionService.encrypt(longPassword)
    const decrypted = EncryptionService.decrypt(encrypted)
    
    expect(decrypted).toBe(longPassword)
  })
})
