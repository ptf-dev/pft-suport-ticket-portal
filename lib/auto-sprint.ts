import { prisma } from '@/lib/prisma'
import type { TicketPriority } from '@prisma/client'

/** Priorities that should drop a newly-created ticket straight into the active sprint. */
const AUTO_SPRINT_PRIORITIES: TicketPriority[] = ['URGENT', 'ULTRA_URGENT']

/**
 * Returns the active sprint's id when a ticket of the given priority should
 * auto-join the current sprint, otherwise null. Safe to call for any priority.
 */
export async function autoSprintIdForPriority(priority: TicketPriority): Promise<string | null> {
  if (!AUTO_SPRINT_PRIORITIES.includes(priority)) return null
  const active = await prisma.sprint.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    select: { id: true },
  })
  return active?.id ?? null
}
