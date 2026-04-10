/**
 * Example usage of SMTP validation functions
 * 
 * This file demonstrates how to use the validation functions
 * in your application code.
 */

import {
  validateHost,
  validatePort,
  validateEmail,
  validateSenderName,
  validateSMTPSettings,
} from './smtp'

// Example 1: Validate individual fields
export function exampleIndividualValidation() {
  // Validate host
  const hostResult = validateHost('smtp.gmail.com')
  if (!hostResult.valid) {
    console.error('Host validation failed:', hostResult.error)
    return
  }

  // Validate port
  const portResult = validatePort(587)
  if (!portResult.valid) {
    console.error('Port validation failed:', portResult.error)
    return
  }

  // Validate email
  const emailResult = validateEmail('noreply@example.com')
  if (!emailResult.valid) {
    console.error('Email validation failed:', emailResult.error)
    return
  }

  // Validate sender name
  const nameResult = validateSenderName('Support Team')
  if (!nameResult.valid) {
    console.error('Sender name validation failed:', nameResult.error)
    return
  }

  console.log('All validations passed!')
}

// Example 2: Validate all settings at once
export function exampleBulkValidation() {
  const settings = {
    host: 'smtp.gmail.com',
    port: 587,
    username: 'user@example.com',
    password: 'password123',
    senderEmail: 'noreply@example.com',
    senderName: 'Support Team',
  }

  const result = validateSMTPSettings(settings)

  if (!result.valid) {
    console.error('Validation failed with errors:', result.errors)
    // result.errors will contain all validation errors
    // Example: { port: 'Port must be between 1 and 65535', senderEmail: 'Please enter a valid email address' }
    return
  }

  console.log('All settings are valid!')
}

// Example 3: Use in API endpoint
export function exampleAPIEndpoint(requestBody: any) {
  // Validate the request body
  const result = validateSMTPSettings({
    host: requestBody.host,
    port: requestBody.port,
    username: requestBody.username,
    password: requestBody.password,
    senderEmail: requestBody.senderEmail,
    senderName: requestBody.senderName,
  })

  if (!result.valid) {
    // Return 400 Bad Request with validation errors
    return {
      status: 400,
      body: {
        success: false,
        error: 'Validation failed',
        details: result.errors,
      },
    }
  }

  // Proceed with saving the settings
  return {
    status: 200,
    body: {
      success: true,
      message: 'Settings saved successfully',
    },
  }
}

// Example 4: Use in form validation (client-side)
export function exampleFormValidation(formData: {
  host: string
  port: string
  username: string
  password: string
  senderEmail: string
  senderName: string
}) {
  const errors: Record<string, string> = {}

  // Validate host
  const hostResult = validateHost(formData.host)
  if (!hostResult.valid) {
    errors.host = hostResult.error!
  }

  // Validate port (convert string to number)
  const port = parseInt(formData.port, 10)
  const portResult = validatePort(port)
  if (!portResult.valid) {
    errors.port = portResult.error!
  }

  // Validate email
  const emailResult = validateEmail(formData.senderEmail)
  if (!emailResult.valid) {
    errors.senderEmail = emailResult.error!
  }

  // Validate sender name
  const nameResult = validateSenderName(formData.senderName)
  if (!nameResult.valid) {
    errors.senderName = nameResult.error!
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
