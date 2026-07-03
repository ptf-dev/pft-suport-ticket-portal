import { prisma } from '@/lib/prisma'
import { isWahaConfigured, sendGroupText } from '@/lib/integrations/waha'
import type { TicketStatus } from '@prisma/client'

function humanStatus(s: TicketStatus): string {
  return s.replace(/_/g, ' ').toLowerCase()
}

export async function notifyTicketStatusChanged(
  ticketId: string,
  oldStatus: TicketStatus,
  newStatus: TicketStatus,
): Promise<void> {
  if (!isWahaConfigured()) return
  if (oldStatus === newStatus) return

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { key: true, title: true, companyId: true },
  })
  if (!ticket) return

  const groups = await prisma.whatsappGroup.findMany({
    where: { companyId: ticket.companyId, enabled: true, notifyOnStatusChange: true },
    select: { groupJid: true },
  })
  if (!groups.length) return

  const text = `Ticket ${ticket.key} — "${ticket.title}"\nStatus: ${humanStatus(oldStatus)} → *${humanStatus(newStatus)}*`

  await Promise.allSettled(
    groups.map((g) => sendGroupText(g.groupJid, text).catch((err) => {
      console.error('[whatsapp-notify] status change send failed', g.groupJid, err)
    })),
  )
}

export async function notifyTicketCreated(ticketId: string): Promise<void> {
  if (!isWahaConfigured()) return
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { key: true, title: true, priority: true, companyId: true },
  })
  if (!ticket) return

  const groups = await prisma.whatsappGroup.findMany({
    where: { companyId: ticket.companyId, enabled: true, notifyOnStatusChange: true },
    select: { groupJid: true },
  })
  if (!groups.length) return

  const text = `New ticket opened: ${ticket.key} — "${ticket.title}" (${ticket.priority})`
  await Promise.allSettled(
    groups.map((g) => sendGroupText(g.groupJid, text).catch(() => {})),
  )
}
