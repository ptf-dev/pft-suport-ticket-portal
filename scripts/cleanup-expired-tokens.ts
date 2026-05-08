#!/usr/bin/env ts-node

/**
 * Cleanup Expired Password Reset Tokens
 * 
 * This script removes expired password reset tokens from the database.
 * Should be run periodically (e.g., daily via cron job).
 * 
 * Usage:
 *   ts-node scripts/cleanup-expired-tokens.ts
 *   or
 *   npm run cleanup:tokens
 */

import { PasswordResetService } from '../lib/password-reset'

async function main() {
  console.log('🧹 Starting cleanup of expired password reset tokens...')
  console.log(`⏰ Current time: ${new Date().toISOString()}`)

  try {
    const count = await PasswordResetService.clearExpiredTokens()
    
    if (count > 0) {
      console.log(`✅ Successfully cleared ${count} expired token${count === 1 ? '' : 's'}`)
    } else {
      console.log('✨ No expired tokens found')
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }

  console.log('🎉 Cleanup completed successfully')
  process.exit(0)
}

main()
