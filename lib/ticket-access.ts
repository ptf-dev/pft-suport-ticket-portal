import { prisma } from '@/lib/prisma'

export type TicketCapability = {
  view: boolean
  comment: boolean
  manage: boolean
}

const NO_ACCESS: TicketCapability = { view: false, comment: false, manage: false }
const FULL_ACCESS: TicketCapability = { view: true, comment: true, manage: true }
const WATCHER_ACCESS: TicketCapability = { view: true, comment: true, manage: false }

export async function ticketAccess(
  userId: string,
  userRole: string,
  userCompanyId: string | null,
  ticketId: string,
): Promise<TicketCapability> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { companyId: true, isDeleted: true },
  })

  if (!ticket || ticket.isDeleted) return NO_ACCESS

  if (userRole === 'ADMIN') return FULL_ACCESS

  if (userCompanyId && ticket.companyId === userCompanyId) return FULL_ACCESS

  const watcher = await prisma.ticketWatcher.findUnique({
    where: { ticketId_userId: { ticketId, userId } },
  })

  return watcher ? WATCHER_ACCESS : NO_ACCESS
}
