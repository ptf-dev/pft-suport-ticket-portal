/**
 * SMTP Settings Validation Functions
 * 
 * Requirements:
 * - 2.2: Validate that host is a non-empty string
 * - 2.3: Validate that port is a number between 1 and 65535
 * - 2.4: Validate that sender email follows valid email format
 */

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate SMTP host
 * Requirement 2.2: Validate that host is a non-empty string
 * 
 * @param host - SMTP host to validate
 * @returns Validation result with success status and optional error message
 */
export function validateHost(host: string): ValidationResult {
  // Check if host is empty or contains only whitespace
  if (!host || host.trim().length === 0) {
    return {
      valid: false,
      error: 'SMTP host is required and cannot be empty',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Validate SMTP port
 * Requirement 2.3: Validate that port is a number between 1 and 65535
 * 
 * @param port - SMTP port to validate
 * @returns Validation result with success status and optional error message
 */
export function validatePort(port: number): ValidationResult {
  // Check if port is a valid number
  if (typeof port !== 'number' || isNaN(port)) {
    return {
      valid: false,
      error: 'Port must be a valid number',
    }
  }

  // Check if port is an integer
  if (!Number.isInteger(port)) {
    return {
      valid: false,
      error: 'Port must be an integer',
    }
  }

  // Check if port is in valid range (1-65535)
  if (port < 1 || port > 65535) {
    return {
      valid: false,
      error: 'Port must be between 1 and 65535',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Validate email format
 * Requirement 2.4: Validate that sender email follows valid email format (RFC 5322)
 * 
 * This is a simplified RFC 5322 validation that covers most common email formats.
 * For production use, consider using a library like validator.js for full RFC 5322 compliance.
 * 
 * @param email - Email address to validate
 * @returns Validation result with success status and optional error message
 */
export function validateEmail(email: string): ValidationResult {
  // Check if email is empty
  if (!email || email.trim().length === 0) {
    return {
      valid: false,
      error: 'Email address is required',
    }
  }

  // RFC 5322 simplified email regex
  // This pattern matches most valid email addresses while being reasonably strict
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address',
    }
  }

  // Additional checks for common issues
  if (email.length > 254) {
    return {
      valid: false,
      error: 'Email address is too long (maximum 254 characters)',
    }
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return {
      valid: false,
      error: 'Email address cannot contain consecutive dots',
    }
  }

  // Check if local part (before @) is too long
  const localPart = email.split('@')[0]
  if (localPart.length > 64) {
    return {
      valid: false,
      error: 'Email local part is too long (maximum 64 characters)',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Validate sender name
 * 
 * @param name - Sender name to validate
 * @returns Validation result with success status and optional error message
 */
export function validateSenderName(name: string): ValidationResult {
  // Check if name is empty or contains only whitespace
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Sender name is required and cannot be empty',
    }
  }

  // Check maximum length (reasonable limit for display names)
  if (name.length > 255) {
    return {
      valid: false,
      error: 'Sender name is too long (maximum 255 characters)',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Validate username
 * 
 * @param username - SMTP username to validate
 * @returns Validation result with success status and optional error message
 */
export function validateUsername(username: string): ValidationResult {
  // Check if username is empty or contains only whitespace
  if (!username || username.trim().length === 0) {
    return {
      valid: false,
      error: 'Username is required and cannot be empty',
    }
  }

  // Check maximum length
  if (username.length > 255) {
    return {
      valid: false,
      error: 'Username is too long (maximum 255 characters)',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Validate password
 * 
 * @param password - SMTP password to validate
 * @returns Validation result with success status and optional error message
 */
export function validatePassword(password: string): ValidationResult {
  // Check if password is empty
  if (!password || password.length === 0) {
    return {
      valid: false,
      error: 'Password is required and cannot be empty',
    }
  }

  return {
    valid: true,
  }
}

/**
 * Validate all SMTP settings
 * 
 * @param settings - SMTP settings to validate
 * @returns Object with validation results for each field
 */
export function validateSMTPSettings(settings: {
  host: string
  port: number
  username: string
  password: string
  senderEmail: string
  senderName: string
}): {
  valid: boolean
  errors: {
    host?: string
    port?: string
    username?: string
    password?: string
    senderEmail?: string
    senderName?: string
  }
} {
  const errors: Record<string, string> = {}

  const hostResult = validateHost(settings.host)
  if (!hostResult.valid) {
    errors.host = hostResult.error!
  }

  const portResult = validatePort(settings.port)
  if (!portResult.valid) {
    errors.port = portResult.error!
  }

  const usernameResult = validateUsername(settings.username)
  if (!usernameResult.valid) {
    errors.username = usernameResult.error!
  }

  const passwordResult = validatePassword(settings.password)
  if (!passwordResult.valid) {
    errors.password = passwordResult.error!
  }

  const emailResult = validateEmail(settings.senderEmail)
  if (!emailResult.valid) {
    errors.senderEmail = emailResult.error!
  }

  const nameResult = validateSenderName(settings.senderName)
  if (!nameResult.valid) {
    errors.senderName = nameResult.error!
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
