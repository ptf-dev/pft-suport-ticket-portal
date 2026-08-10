import { prisma } from '@/lib/prisma'
import { isWahaConfigured, sendGroupText } from '@/lib/integrations/waha'
import type { ActivityType, TicketStatus } from '@prisma/client'

/** How far back a digest looks when a group has never had one. */
export const DIGEST_WINDOW_HOURS = 6

/** Most tickets to list before collapsing the rest into a "+N more" line. */
export const DIGEST_MAX_TICKETS = 12

/**
 * Activity the client actually cares about.
 *
 * Deliberately excludes internal mechanics — assignment, watchers, relations,
 * scheduling, category edits, image uploads, internal notes. A digest full of
 * housekeeping would recreate the noise problem it exists to solve.
 */
export const DIGEST_ACTIVITY_TYPES: ActivityType[] = [
  'CREATED',
  'STATUS_CHANGED',
  'PRIORITY_CHANGED',
  'COMMENTED',
]

function humanStatus(s: string): string {
  return s.replace(/_/g, ' ').toLowerCase()
}

interface TicketSummary {
  key: string | null
  id: string
  title: string
  created: boolean
  statusFrom: string | null
  statusTo: string | null
  priorityFrom: string | null
  priorityTo: string | null
  comments: number
  latestAt: Date
}

export interface DigestResult {
  groupJid: string
  windowStart: Date
  windowEnd: Date
  ticketsTouched: number
  sent: boolean
  reason?: string
}

/**
 * Collapse a window of activity into one summary line per ticket.
 *
 * Multiple changes to the same ticket fold together — the point is "here is
 * where each ticket landed", not a replay of every individual event. Status and
 * priority therefore report first-seen `from` and last-seen `to`.
 */
export function summariseActivities(
  activities: Array<{
    type: ActivityType
    fromValue: string | null
    toValue: string | null
    createdAt: Date
    ticket: { id: string; key: string | null; title: string }
  }>,
): TicketSummary[] {
  const byTicket = new Map<string, TicketSummary>()

  // Oldest first so `from` comes from the earliest change and `to` from the latest.
  const ordered = [...activities].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  for (const a of ordered) {
    let s = byTicket.get(a.ticket.id)
    if (!s) {
      s = {
        key: a.ticket.key,
        id: a.ticket.id,
        title: a.ticket.title,
        created: false,
        statusFrom: null,
        statusTo: null,
        priorityFrom: null,
        priorityTo: null,
        comments: 0,
        latestAt: a.createdAt,
      }
      byTicket.set(a.ticket.id, s)
    }
    if (a.createdAt > s.latestAt) s.latestAt = a.createdAt

    switch (a.type) {
      case 'CREATED':
        s.created = true
        break
      case 'STATUS_CHANGED':
        if (s.statusFrom === null) s.statusFrom = a.fromValue
        s.statusTo = a.toValue
        break
      case 'PRIORITY_CHANGED':
        if (s.priorityFrom === null) s.priorityFrom = a.fromValue
        s.priorityTo = a.toValue
        break
      case 'COMMENTED':
        s.comments += 1
        break
    }
  }

  // Most recently touched first.
  return Array.from(byTicket.values()).sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
}

export function formatDigest(companyName: string, summaries: TicketSummary[], hours: number): string {
  const header = `📋 *${companyName} — last ${hours}h*\n${summaries.length} ticket${summaries.length === 1 ? '' : 's'} updated`

  const shown = summaries.slice(0, DIGEST_MAX_TICKETS)
  const lines = shown.map((s) => {
    const parts: string[] = []
    if (s.created) parts.push('opened')
    // A status change that only repeats where the ticket already was is noise.
    if (s.statusTo && s.statusTo !== s.statusFrom) {
      parts.push(s.statusFrom ? `${humanStatus(s.statusFrom)} → *${humanStatus(s.statusTo)}*` : `*${humanStatus(s.statusTo)}*`)
    }
    if (s.priorityTo && s.priorityTo !== s.priorityFrom) {
      parts.push(`priority → *${humanStatus(s.priorityTo)}*`)
    }
    if (s.comments > 0) parts.push(`${s.comments} comment${s.comments === 1 ? '' : 's'}`)

    const label = s.key ?? s.id.slice(0, 8)
    const detail = parts.length ? parts.join(' · ') : 'updated'
    return `• ${label} ${s.title.slice(0, 60)}\n  ${detail}`
  })

  const more = summaries.length > shown.length ? `\n\n+${summaries.length - shown.length} more` : ''
  return `${header}\n\n${lines.join('\n')}${more}`
}

/**
 * Send the pending digest for every group in DIGEST mode.
 *
 * The window runs from the group's last digest to now, so a missed run widens
 * the next one instead of dropping the activity. Groups with nothing to report
 * are skipped entirely — a periodic "nothing happened" message would be exactly
 * the spam this replaces.
 */
export async function sendPendingDigests(now: Date = new Date()): Promise<DigestResult[]> {
  if (!isWahaConfigured()) return []

  const groups = await prisma.whatsappGroup.findMany({
    where: { enabled: true, notifyOnStatusChange: true, notifyMode: 'DIGEST' },
    select: {
      id: true,
      groupJid: true,
      companyId: true,
      lastDigestAt: true,
      company: { select: { name: true } },
    },
  })

  const results: DigestResult[] = []

  for (const group of groups) {
    const windowStart = group.lastDigestAt ?? new Date(now.getTime() - DIGEST_WINDOW_HOURS * 60 * 60 * 1000)

    try {
      const activities = await prisma.ticketActivity.findMany({
        where: {
          type: { in: DIGEST_ACTIVITY_TYPES },
          createdAt: { gt: windowStart, lte: now },
          ticket: { companyId: group.companyId, isDeleted: false },
        },
        select: {
          type: true,
          fromValue: true,
          toValue: true,
          createdAt: true,
          ticket: { select: { id: true, key: true, title: true } },
        },
      })

      const summaries = summariseActivities(activities)

      if (summaries.length === 0) {
        // Still advance the window so the next digest doesn't re-scan this period.
        await prisma.whatsappGroup.update({ where: { id: group.id }, data: { lastDigestAt: now } })
        results.push({ groupJid: group.groupJid, windowStart, windowEnd: now, ticketsTouched: 0, sent: false, reason: 'no activity' })
        continue
      }

      const hours = Math.max(1, Math.round((now.getTime() - windowStart.getTime()) / (60 * 60 * 1000)))
      await sendGroupText(group.groupJid, formatDigest(group.company.name, summaries, hours))

      // Only advance after a successful send, so a WhatsApp outage retries the
      // same window next run rather than silently swallowing it.
      await prisma.whatsappGroup.update({ where: { id: group.id }, data: { lastDigestAt: now } })
      results.push({ groupJid: group.groupJid, windowStart, windowEnd: now, ticketsTouched: summaries.length, sent: true })
    } catch (err) {
      console.error('[whatsapp-digest] failed for group', group.groupJid, err)
      results.push({ groupJid: group.groupJid, windowStart, windowEnd: now, ticketsTouched: 0, sent: false, reason: 'error' })
    }
  }

  return results
}
