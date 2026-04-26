/**
 * Script to update a user's email address
 * Usage: npx ts-node scripts/update-user-email.ts <old-email> <new-email>
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateUserEmail(oldEmail: string, newEmail: string) {
  try {
    // Check if old email exists
    const existingUser = await prisma.user.findFirst({
      where: { email: oldEmail },
      include: { company: true },
    })

    if (!existingUser) {
      console.error(`❌ User with email "${oldEmail}" not found`)
      process.exit(1)
    }

    // Check if new email already exists
    const conflictUser = await prisma.user.findFirst({
      where: { 
        email: newEmail,
        companyId: existingUser.companyId,
      },
    })

    if (conflictUser) {
      console.error(`❌ User with email "${newEmail}" already exists for this company`)
      process.exit(1)
    }

    // Update the email
    const updatedUser = await prisma.user.update({
      where: { 
        email_companyId: {
          email: oldEmail,
          companyId: existingUser.companyId,
        },
      },
      data: { email: newEmail },
    })

    console.log('✅ User email updated successfully!')
    console.log(`   Name: ${updatedUser.name}`)
    console.log(`   Old Email: ${oldEmail}`)
    console.log(`   New Email: ${newEmail}`)
    console.log(`   Company: ${existingUser.company?.name || 'N/A'}`)
    console.log(`   Role: ${updatedUser.role}`)
  } catch (error) {
    console.error('❌ Error updating user email:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Get command line arguments
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.error('Usage: npx ts-node scripts/update-user-email.ts <old-email> <new-email>')
  console.error('Example: npx ts-node scripts/update-user-email.ts support@elitemindfunding.com info@elitemindfunding.com')
  process.exit(1)
}

const [oldEmail, newEmail] = args

updateUserEmail(oldEmail, newEmail)
