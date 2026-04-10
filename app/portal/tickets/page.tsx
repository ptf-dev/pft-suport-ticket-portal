import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { InteractiveTicketBoard } from './interactive-ticket-board'

/**
 * Client Portal Tickets Board View - Interactive Kanban
 * Requirements: 6.2
 * 
 * Displays tickets in an interactive Kanban board with drag-and-drop
 */
export default async function PortalTicketsPage() {
  // Protect route - client only
  const session = await requireClient()
  const companyId = session.user.companyId!

  // Get all tickets for this company
  const tickets = await prisma.ticket.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { name: true },
      },
      _count: {
        select: {
          comments: true,
          images: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop tickets to update their status
          </p>
        </div>
        <Link href="/portal/tickets/new">
          <Button className="shadow-md hover:shadow-lg transition-shadow">
            <span className="mr-2">➕</span>
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Interactive Kanban Board */}
      <InteractiveTicketBoard tickets={tickets} />
    </div>
  )
}
