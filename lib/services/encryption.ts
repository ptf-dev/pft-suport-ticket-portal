import crypto from 'crypto'

/**
 * Encryption service using AES-256-GCM for secure password storage
 * 
 * Storage format: {iv}:{authTag}:{ciphertext} (all hex-encoded)
 * 
 * Requirements:
 * - 3.4: Encrypt SMTP password before storing in database
 * - 5.1: Use secure encryption for credential storage
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly IV_LENGTH = 16
  private static readonly KEY_LENGTH = 32

  /**
   * Get encryption key from environment variable
   * @throws Error if ENCRYPTION_KEY is not set or invalid
   */
  private static getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    // Convert hex string to buffer
    const keyBuffer = Buffer.from(key, 'hex')
    
    if (keyBuffer.length !== this.KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY must be ${this.KEY_LENGTH} bytes (${this.KEY_LENGTH * 2} hex characters)`)
    }

    return keyBuffer
  }

  /**
   * Validate that encryption key exists and is valid
   * @returns true if key is valid, false otherwise
   */
  static validateKey(): boolean {
    try {
      this.getKey()
      return true
    } catch {
      return false
    }
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format: {iv}:{authTag}:{ciphertext}
   * @throws Error if encryption fails or key is invalid
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty string')
    }

    const key = this.getKey()
    const iv = crypto.randomBytes(this.IV_LENGTH)
    
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag().toString('hex')
    
    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag}:${encrypted}`
  }

  /**
   * Decrypt sensitive data
   * @param ciphertext - The encrypted data in format: {iv}:{authTag}:{ciphertext}
   * @returns Decrypted plaintext
   * @throws Error if decryption fails, format is invalid, or key is invalid
   */
  static decrypt(ciphertext: string): string {
    if (!ciphertext) {
      throw new Error('Cannot decrypt empty string')
    }

    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format. Expected format: {iv}:{authTag}:{ciphertext}')
    }

    const [ivHex, authTagHex, encryptedHex] = parts
    
    const key = this.getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}
