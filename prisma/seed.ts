import { PrismaClient, Role, TicketStatus, TicketPriority } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10)

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
    where: { subdomain: 'apex-trading' },
    update: {},
    create: {
      name: 'Apex Trading Firm',
      subdomain: 'apex-trading',
      contactEmail: 'support@apextrading.com',
      whatsappLink: 'https://wa.me/1234567890',
      notes: 'Premium tier client, 24/7 support required',
      isActive: true,
    },
  })
  console.log(`✓ Company: ${company1.name}`)

  const company2 = await prisma.company.upsert({
    where: { subdomain: 'quantum-capital' },
    update: {},
    create: {
      name: 'Quantum Capital Partners',
      subdomain: 'quantum-capital',
      contactEmail: 'help@quantumcapital.com',
      whatsappLink: 'https://wa.me/0987654321',
      notes: 'Standard tier client',
      isActive: true,
    },
  })
  console.log(`✓ Company: ${company2.name}`)

  const company3 = await prisma.company.upsert({
    where: { subdomain: 'elite-prop' },
    update: {},
    create: {
      name: 'Elite Prop Trading',
      subdomain: 'elite-prop',
      contactEmail: 'contact@eliteprop.com',
      whatsappLink: null,
      notes: 'New client, onboarding in progress',
      isActive: true,
    },
  })
  console.log(`✓ Company: ${company3.name}`)

  // Create Client Users
  console.log('\nCreating client users...')
  
  const client1 = await prisma.user.upsert({
    where: {
      email_companyId: {
        email: 'john.doe@apextrading.com',
        companyId: company1.id
      }
    },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john.doe@apextrading.com',
      password: hashedPassword,
      role: Role.CLIENT,
      companyId: company1.id,
      isActive: true,
    },
  })
  console.log(`✓ Client user: ${client1.email}`)

  const client2 = await prisma.user.upsert({
    where: {
      email_companyId: {
        email: 'sarah.smith@apextrading.com',
        companyId: company1.id
      }
    },
    update: {},
    create: {
      name: 'Sarah Smith',
      email: 'sarah.smith@apextrading.com',
      password: hashedPassword,
      role: Role.CLIENT,
      companyId: company1.id,
      isActive: true,
    },
  })
  console.log(`✓ Client user: ${client2.email}`)

  const client3 = await prisma.user.upsert({
    where: {
      email_companyId: {
        email: 'mike.johnson@quantumcapital.com',
        companyId: company2.id
      }
    },
    update: {},
    create: {
      name: 'Mike Johnson',
      email: 'mike.johnson@quantumcapital.com',
      password: hashedPassword,
      role: Role.CLIENT,
      companyId: company2.id,
      isActive: true,
    },
  })
  console.log(`✓ Client user: ${client3.email}`)

  const client4 = await prisma.user.upsert({
    where: {
      email_companyId: {
        email: 'emma.wilson@eliteprop.com',
        companyId: company3.id
      }
    },
    update: {},
    create: {
      name: 'Emma Wilson',
      email: 'emma.wilson@eliteprop.com',
      password: hashedPassword,
      role: Role.CLIENT,
      companyId: company3.id,
      isActive: true,
    },
  })
  console.log(`✓ Client user: ${client4.email}`)

  // Check if tickets already exist
  const existingTicketsCount = await prisma.ticket.count()
  
  if (existingTicketsCount === 0) {
    // Create Sample Tickets
    console.log('\nCreating sample tickets...')
    
    const ticket1 = await prisma.ticket.create({
      data: {
        title: 'Login issues with trading platform',
        description: 'Several traders are unable to log in to the platform. They receive a "Connection timeout" error. This is affecting our daily operations.',
        status: TicketStatus.OPEN,
        priority: TicketPriority.URGENT,
        category: 'Technical',
        companyId: company1.id,
        createdById: client1.id,
      },
    })
    console.log(`✓ Ticket: ${ticket1.title}`)

    const ticket2 = await prisma.ticket.create({
      data: {
        title: 'Request for additional API rate limits',
        description: 'We need to increase our API rate limits from 1000 to 5000 requests per minute to support our growing trading volume.',
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        category: 'Feature Request',
        companyId: company1.id,
        createdById: client2.id,
      },
    })
    console.log(`✓ Ticket: ${ticket2.title}`)

    const ticket3 = await prisma.ticket.create({
      data: {
        title: 'Dashboard not displaying real-time data',
        description: 'The analytics dashboard is showing data from 2 hours ago instead of real-time updates. This is impacting our decision-making process.',
        status: TicketStatus.WAITING_CLIENT,
        priority: TicketPriority.MEDIUM,
        category: 'Bug',
        companyId: company2.id,
        createdById: client3.id,
      },
    })
    console.log(`✓ Ticket: ${ticket3.title}`)

    const ticket4 = await prisma.ticket.create({
      data: {
        title: 'Documentation for new risk management features',
        description: 'Could you provide detailed documentation on the new risk management features released last week?',
        status: TicketStatus.RESOLVED,
        priority: TicketPriority.LOW,
        category: 'Documentation',
        companyId: company2.id,
        createdById: client3.id,
      },
    })
    console.log(`✓ Ticket: ${ticket4.title}`)

    const ticket5 = await prisma.ticket.create({
      data: {
        title: 'Onboarding assistance needed',
        description: 'We are new to the platform and need help setting up our first trading accounts and configuring the system.',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        category: 'Support',
        companyId: company3.id,
        createdById: client4.id,
      },
    })
    console.log(`✓ Ticket: ${ticket5.title}`)

    const ticket6 = await prisma.ticket.create({
      data: {
        title: 'Billing inquiry for last month',
        description: 'We noticed a discrepancy in last month\'s invoice. Can you please review and clarify the charges?',
        status: TicketStatus.CLOSED,
        priority: TicketPriority.LOW,
        category: 'Billing',
        companyId: company3.id,
        createdById: client4.id,
      },
    })
    console.log(`✓ Ticket: ${ticket6.title}`)

    // Create Sample Comments
    console.log('\nCreating sample comments...')
    
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket1.id,
        authorId: admin.id,
        message: 'Thank you for reporting this issue. Our team is investigating the connection timeout errors. We will update you within the next hour.',
        internal: false,
      },
    })

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket1.id,
        authorId: admin.id,
        message: 'Internal note: This appears to be related to the database connection pool issue we saw last week. Escalating to DevOps.',
        internal: true,
      },
    })

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket2.id,
        authorId: admin.id,
        message: 'We have reviewed your request. Your account has been upgraded to support 5000 requests per minute. Please test and confirm.',
        internal: false,
      },
    })

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket2.id,
        authorId: client2.id,
        message: 'Confirmed! The new rate limits are working perfectly. Thank you for the quick turnaround.',
        internal: false,
      },
    })

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket3.id,
        authorId: admin.id,
        message: 'We have identified the issue with the data refresh mechanism. Could you please clear your browser cache and try again?',
        internal: false,
      },
    })

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket4.id,
        authorId: admin.id,
        message: 'Documentation has been sent to your email. Please review and let us know if you need any clarification.',
        internal: false,
      },
    })

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket4.id,
        authorId: client3.id,
        message: 'Received and reviewed. Everything is clear. Thank you!',
        internal: false,
      },
    })

    console.log('✓ Sample comments created')
  } else {
    console.log('\n✓ Tickets and comments already exist, skipping...')
  }

  console.log('\n✅ Database seed completed successfully!')
  console.log('\n📝 Test Credentials:')
  console.log('   Admin: admin@propfirmstech.com / password123')
  console.log('   Client (Apex): john.doe@apextrading.com / password123')
  console.log('   Client (Quantum): mike.johnson@quantumcapital.com / password123')
  console.log('   Client (Elite): emma.wilson@eliteprop.com / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
