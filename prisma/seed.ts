import { PrismaClient, Role, TicketStatus, TicketPriority } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('!!password.123!!', 10)

  // Create Admin User
  console.log('Creating admin user...')
  
  // Check if admin already exists
  let admin = await prisma.user.findFirst({
    where: {
      email: 'admin@propfirmstech.com',
      companyId: null
    }
  })

  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: 'PropFirmsTech Admin',
        email: 'admin@propfirmstech.com',
        password: hashedPassword,
        role: Role.ADMIN,
        companyId: null,
        isActive: true,
      },
    })
    console.log(`✓ Admin user created: ${admin.email}`)
  } else {
    console.log(`✓ Admin user already exists: ${admin.email}`)
  }

  // Create Sample Companies
  console.log('\nCreating sample companies...')
  
  const company1 = await prisma.company.upsert({
    where: { subdomain: 'trading-cult' },
    update: {},
    create: {
      name: 'Trading Cult',
      subdomain: 'trading-cult',
      contactEmail: 'support-pro@tradingcult.com',
      whatsappLink: 'https://wa.me/1234567890',
      notes: 'Premium tier client, 24/7 support required',
      isActive: true,
    },
  })
  console.log(`✓ Company: ${company1.name}`)

  // Create Client Users
  console.log('\nCreating client users...')
  
  const client1 = await prisma.user.upsert({
    where: {
      email_companyId: {
        email: 'support-pro@tradingcult.com',
        companyId: company1.id
      }
    },
    update: {},
    create: {
      name: 'Trading Cult',
      email: 'support-pro@tradingcult.com',
      password: hashedPassword,
      role: Role.CLIENT,
      companyId: company1.id,
      isActive: true,
    },
  })
  console.log(`✓ Client user: ${client1.email}`)


  console.log('\n✅ Database seed completed successfully!')
  console.log('\n📝 Test Credentials:')
  console.log('   Admin: admin@propfirmstech.com / password123')}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
