/**
 * Integration Tests for SMTP Settings with Encryption
 * Feature: admin-smtp-config
 * 
 * Tests database operations with encrypted password field
 */

import { PrismaClient } from '@prisma/client'
import { EncryptionService } from './encryption'

const prisma = new PrismaClient()

describe('SMTP Settings Database Integration Tests', () => {
  
  // Clean up test data after each test
  afterEach(async () => {
    await prisma.sMTPSettings.deleteMany({})
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('Requirement 3.1: Can create SMTP settings with encrypted password', async () => {
    const plainPassword = 'my-smtp-password-123'
    const encryptedPassword = EncryptionService.encrypt(plainPassword)
    
    const settings = await prisma.sMTPSettings.create({
      data: {
        host: 'smtp.example.com',
        port: 587,
        secure: true,
        username: 'test@example.com',
        password: encryptedPassword,
        senderEmail: 'noreply@example.com',
        senderName: 'Test Sender',
        isActive: false,
        createdBy: 'test-user-id',
        updatedBy: 'test-user-id',
      },
    })

    expect(settings.id).toBeDefined()
    expect(settings.host).toBe('smtp.example.com')
    expect(settings.password).toBe(encryptedPassword)
    
    // Verify we can decrypt the password
    const decrypted = EncryptionService.decrypt(settings.password)
    expect(decrypted).toBe(plainPassword)
  })

  test('Requirement 3.2: Can retrieve SMTP settings and decrypt password', async () => {
    const plainPassword = 'retrieve-test-password'
    const encryptedPassword = EncryptionService.encrypt(plainPassword)
    
    await prisma.sMTPSettings.create({
      data: {
        host: 'smtp.test.com',
        port: 465,
        secure: true,
        username: 'user@test.com',
        password: encryptedPassword,
        senderEmail: 'sender@test.com',
        senderName: 'Test',
        isActive: true,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    })

    const retrieved = await prisma.sMTPSettings.findFirst()
    
    expect(retrieved).not.toBeNull()
    expect(retrieved!.password).toBe(encryptedPassword)
    
    // Decrypt and verify
    const decrypted = EncryptionService.decrypt(retrieved!.password)
    expect(decrypted).toBe(plainPassword)
  })

  test('Requirement 3.4: Can update SMTP settings preserving encrypted password', async () => {
    const originalPassword = 'original-password'
    const encryptedPassword = EncryptionService.encrypt(originalPassword)
    
    const created = await prisma.sMTPSettings.create({
      data: {
        host: 'smtp.original.com',
        port: 587,
        secure: true,
        username: 'original@test.com',
        password: encryptedPassword,
        senderEmail: 'sender@test.com',
        senderName: 'Original',
        isActive: false,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    })

    // Update without changing password
    const updated = await prisma.sMTPSettings.update({
      where: { id: created.id },
      data: {
        host: 'smtp.updated.com',
        updatedBy: 'user-2',
      },
    })

    expect(updated.host).toBe('smtp.updated.com')
    expect(updated.password).toBe(encryptedPassword)
    
    // Password should still decrypt correctly
    const decrypted = EncryptionService.decrypt(updated.password)
    expect(decrypted).toBe(originalPassword)
  })

  test('Requirement 5.1: Password is stored encrypted, not in plaintext', async () => {
    const plainPassword = 'super-secret-password'
    const encryptedPassword = EncryptionService.encrypt(plainPassword)
    
    const settings = await prisma.sMTPSettings.create({
      data: {
        host: 'smtp.secure.com',
        port: 587,
        secure: true,
        username: 'secure@test.com',
        password: encryptedPassword,
        senderEmail: 'sender@test.com',
        senderName: 'Secure',
        isActive: false,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    })

    // Verify password in database is NOT the plaintext
    expect(settings.password).not.toBe(plainPassword)
    
    // Verify it's in the encrypted format
    expect(settings.password).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
  })

  test('Can store multiple SMTP configurations', async () => {
    const password1 = EncryptionService.encrypt('password1')
    const password2 = EncryptionService.encrypt('password2')
    
    await prisma.sMTPSettings.create({
      data: {
        host: 'smtp1.com',
        port: 587,
        secure: true,
        username: 'user1@test.com',
        password: password1,
        senderEmail: 'sender1@test.com',
        senderName: 'Sender 1',
        isActive: true,
        createdBy: 'user-1',
        updatedBy: 'user-1',
      },
    })

    await prisma.sMTPSettings.create({
      data: {
        host: 'smtp2.com',
        port: 465,
        secure: true,
        username: 'user2@test.com',
        password: password2,
        senderEmail: 'sender2@test.com',
        senderName: 'Sender 2',
        isActive: false,
        createdBy: 'user-2',
        updatedBy: 'user-2',
      },
    })

    const all = await prisma.sMTPSettings.findMany()
    expect(all).toHaveLength(2)
  })

  test('Audit fields are stored correctly', async () => {
    const encryptedPassword = EncryptionService.encrypt('test-password')
    
    const settings = await prisma.sMTPSettings.create({
      data: {
        host: 'smtp.audit.com',
        port: 587,
        secure: true,
        username: 'audit@test.com',
        password: encryptedPassword,
        senderEmail: 'sender@test.com',
        senderName: 'Audit Test',
        isActive: false,
        createdBy: 'admin-user-123',
        updatedBy: 'admin-user-123',
      },
    })

    expect(settings.createdBy).toBe('admin-user-123')
    expect(settings.updatedBy).toBe('admin-user-123')
    expect(settings.createdAt).toBeInstanceOf(Date)
    expect(settings.updatedAt).toBeInstanceOf(Date)
  })
})
