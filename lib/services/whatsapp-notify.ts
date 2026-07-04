import { prisma } from '@/lib/prisma'
import { isWahaConfigured, sendGroupText } from '@/lib/integrations/waha'
import type { TicketStatus } from '@prisma/client'

const PORTAL_URL = (process.env.PORTAL_PUBLIC_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || '').replace(/\/$/, '')

function humanStatus(s: TicketStatus): string {
  return s.replace(/_/g, ' ').toLowerCase()
}

function ticketLink(ticketId: string): string {
  return PORTAL_URL ? `\n${PORTAL_URL}/portal/tickets/${ticketId}` : ''
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
    select: { id: true, key: true, title: true, companyId: true },
  })
  if (!ticket) return

  const groups = await prisma.whatsappGroup.findMany({
    where: { companyId: ticket.companyId, enabled: true, notifyOnStatusChange: true },
    select: { groupJid: true },
  })
  if (!groups.length) return

  const text = `Ticket ${ticket.key} — "${ticket.title}"\nStatus: ${humanStatus(oldStatus)} → *${humanStatus(newStatus)}*${ticketLink(ticket.id)}`

  await Promise.allSettled(
    groups.map((g) => sendGroupText(g.groupJid, text).catch((err) => {
      console.error('[whatsapp-notify] status change send failed', g.groupJid, err)
    })),
  )
}

const WA_BOT_EMAIL = 'whatsapp-bot@propfirmstech.com'

export async function notifyTicketNewComment(ticketId: string, commentId: string): Promise<void> {
  if (!isWahaConfigured()) return

  const comment = await prisma.ticketComment.findUnique({
    where: { id: commentId },
    select: {
      id: true, message: true, internal: true, createdAt: true,
      author: { select: { name: true, email: true, role: true } },
      ticket: { select: { id: true, key: true, title: true, companyId: true } },
    },
  })
  if (!comment) return
  if (comment.internal) return
  if (comment.author.email === WA_BOT_EMAIL) return

  const preview = comment.message.replace(/\s+/g, ' ').slice(0, 400)
  const text = `New comment on ${comment.ticket.key} — "${comment.ticket.title}"\n${comment.author.name}: ${preview}${ticketLink(comment.ticket.id)}`

  const [groups, dmUsers] = await Promise.all([
    prisma.whatsappGroup.findMany({
      where: { companyId: comment.ticket.companyId, enabled: true, notifyOnStatusChange: true },
      select: { groupJid: true },
    }),
    prisma.whatsappUser.findMany({
      where: { companyId: comment.ticket.companyId, enabled: true },
      select: { waJid: true },
    }),
  ])
  const targets = new Set<string>([
    ...groups.map((g) => g.groupJid),
    ...dmUsers.map((u) => u.waJid),
  ])
  if (targets.size === 0) return

  await Promise.allSettled(
    Array.from(targets).map((jid) => sendGroupText(jid, text).catch((err) => {
      console.error('[whatsapp-notify] comment send failed', jid, err)
    })),
  )
}

export async function notifyTicketCreated(ticketId: string): Promise<void> {
  if (!isWahaConfigured()) return
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, key: true, title: true, priority: true, companyId: true },
  })
  if (!ticket) return

  const groups = await prisma.whatsappGroup.findMany({
    where: { companyId: ticket.companyId, enabled: true, notifyOnStatusChange: true },
    select: { groupJid: true },
  })
  if (!groups.length) return

  const text = `New ticket opened: ${ticket.key} — "${ticket.title}" (${ticket.priority})${ticketLink(ticket.id)}`
  await Promise.allSettled(
    groups.map((g) => sendGroupText(g.groupJid, text).catch(() => {})),
  )
}
