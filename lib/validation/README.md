# SMTP Validation Functions

This directory contains validation functions for SMTP settings used in the admin SMTP configuration feature.

## Overview

The validation functions ensure that SMTP settings meet the requirements specified in the design document before being saved to the database or used to establish connections.

## Files

- **smtp.ts**: Core validation functions
- **smtp.test.ts**: Unit tests for validation functions
- **smtp-example.ts**: Usage examples

## Validation Functions

### Individual Field Validators

#### `validateHost(host: string): ValidationResult`
Validates SMTP host field.
- **Requirement**: 2.2
- **Rules**: Non-empty string, no whitespace-only values
- **Returns**: `{ valid: boolean, error?: string }`

#### `validatePort(port: number): ValidationResult`
Validates SMTP port field.
- **Requirement**: 2.3
- **Rules**: Integer between 1 and 65535 (inclusive)
- **Returns**: `{ valid: boolean, error?: string }`

#### `validateEmail(email: string): ValidationResult`
Validates email format.
- **Requirement**: 2.4
- **Rules**: RFC 5322 compliant email format
- **Additional checks**:
  - Maximum 254 characters total
  - Maximum 64 characters for local part (before @)
  - No consecutive dots
- **Returns**: `{ valid: boolean, error?: string }`

#### `validateSenderName(name: string): ValidationResult`
Validates sender name field.
- **Rules**: Non-empty string, maximum 255 characters
- **Returns**: `{ valid: boolean, error?: string }`

#### `validateUsername(username: string): ValidationResult`
Validates SMTP username field.
- **Rules**: Non-empty string, maximum 255 characters
- **Returns**: `{ valid: boolean, error?: string }`

#### `validatePassword(password: string): ValidationResult`
Validates SMTP password field.
- **Rules**: Non-empty string (minimum 1 character)
- **Returns**: `{ valid: boolean, error?: string }`

### Bulk Validator

#### `validateSMTPSettings(settings): { valid: boolean, errors: Record<string, string> }`
Validates all SMTP settings at once.
- **Parameters**: Object with host, port, username, password, senderEmail, senderName
- **Returns**: Object with overall validity and individual field errors
- **Usage**: Ideal for API endpoints and form submissions

## Usage Examples

### Example 1: Validate Individual Field

```typescript
import { validateEmail } from '@/lib/validation/smtp'

const result = validateEmail('user@example.com')
if (!result.valid) {
  console.error(result.error)
}
```

### Example 2: Validate All Settings

```typescript
import { validateSMTPSettings } from '@/lib/validation/smtp'

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
  console.error('Validation errors:', result.errors)
  // errors = { port: 'Port must be between 1 and 65535', ... }
}
```

### Example 3: Use in API Endpoint

```typescript
import { validateSMTPSettings } from '@/lib/validation/smtp'

export async function POST(request: Request) {
  const body = await request.json()
  
  const validation = validateSMTPSettings(body)
  if (!validation.valid) {
    return Response.json(
      { success: false, error: 'Validation failed', details: validation.errors },
      { status: 400 }
    )
  }
  
  // Proceed with saving settings...
}
```

## Testing

The validation functions are thoroughly tested with unit tests covering:
- Valid inputs (happy path)
- Invalid inputs (edge cases)
- Boundary values
- Error messages

Run tests:
```bash
npm test -- lib/validation/smtp.test.ts
```

## Test Coverage

- **41 unit tests** covering all validation functions
- **100% code coverage** for validation logic
- Tests for edge cases:
  - Empty strings
  - Whitespace-only strings
  - Boundary values (port 0, 1, 65535, 65536)
  - Invalid formats
  - Maximum length violations
  - Special characters

## Integration

These validation functions are used by:
- API endpoints (`/api/admin/settings/smtp`)
- SMTP settings form component
- Property-based tests (tasks 2.3, 2.4, 2.5)

## Requirements Mapping

| Function | Requirements | Description |
|----------|-------------|-------------|
| `validateHost` | 2.2 | Validate host is non-empty string |
| `validatePort` | 2.3 | Validate port is 1-65535 |
| `validateEmail` | 2.4 | Validate email format (RFC 5322) |
| `validateSenderName` | - | Validate sender name |
| `validateUsername` | - | Validate username |
| `validatePassword` | - | Validate password |
| `validateSMTPSettings` | 2.2, 2.3, 2.4 | Validate all settings |

## Future Enhancements

- Add support for internationalized email addresses (RFC 6531)
- Add DNS validation for email domains
- Add support for custom validation rules
- Add async validation for checking email deliverability
