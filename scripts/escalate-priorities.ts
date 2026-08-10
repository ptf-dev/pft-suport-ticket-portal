#!/usr/bin/env ts-node

/**
 * Auto-escalate stale LOW priority tickets to HIGH.
 *
 * Clients are promised a 7–10 day turnaround on LOW tickets; anything still
 * open past 10 days has missed that, so it is escalated to pull it back into
 * view. Safe to run repeatedly — escalated tickets are no longer LOW, so they
 * cannot be picked up twice.
 *
 * Usage:
 *   npm run escalate:priorities
 *   ts-node -r tsconfig-paths/register scripts/escalate-priorities.ts
 */

import { escalateBreachedTickets } from '../lib/services/escalation'

async function main() {
  const startedAt = new Date()
  console.log(`[escalation] run started ${startedAt.toISOString()}`)

  const result = await escalateBreachedTickets(startedAt)

  if (result.escalated === 0) {
    console.log('[escalation] nothing to escalate')
  } else {
    console.log(`[escalation] escalated ${result.escalated} ticket(s):`)
    for (const t of result.tickets) {
      const age = t.hoursAtPriority < 48 ? `${t.hoursAtPriority}h` : `${Math.floor(t.hoursAtPriority / 24)}d`
      console.log(`  - ${t.key ?? t.id.slice(0, 8)}: ${t.from} -> ${t.to} (${age} at ${t.from}) ${t.title}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[escalation] run failed:', err)
    process.exit(1)
  })
