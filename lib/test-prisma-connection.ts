/**
 * Simple script to test Prisma client connection
 * Run with: npx tsx lib/test-prisma-connection.ts
 */

import { prisma } from './prisma'

async function testConnection() {
  try {
    console.log('Testing Prisma client connection...')
    
    // Test connection by running a simple query
    await prisma.$connect()
    console.log('✓ Successfully connected to database')
    
    // Test that we can query (this will fail if DB doesn't exist yet, which is expected)
    try {
      const companyCount = await prisma.company.count()
      console.log(`✓ Database query successful. Found ${companyCount} companies.`)
    } catch (error) {
      console.log('⚠ Database exists but tables not created yet. Run migrations first.')
      console.log('  Run: npm run db:migrate')
    }
    
    await prisma.$disconnect()
    console.log('✓ Disconnected from database')
    
  } catch (error) {
    console.error('✗ Connection failed:', error)
    process.exit(1)
  }
}

testConnection()
