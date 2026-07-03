import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { WhatsappGroupsClient } from './whatsapp-groups-client'

export const dynamic = 'force-dynamic'

export default async function WhatsappAdminPage() {
  await requireAdmin()

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
          WhatsApp integration
        </h1>
        <p className="text-sm text-ink-mute mt-2">
          Map WhatsApp group chats to companies. The bot monitors mapped groups, creates tickets, and posts status updates.
        </p>
      </header>

      <WhatsappGroupsClient companies={companies} />
    </div>
  )
}
