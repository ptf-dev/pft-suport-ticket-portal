#!/usr/bin/env ts-node

/**
 * Post the periodic activity digest to WhatsApp groups set to DIGEST mode.
 *
 * Instant per-event notifications turn a busy day into a wall of messages. A
 * group in DIGEST mode gets one summary per window instead, covering everything
 * that changed since its previous digest.
 *
 * Safe to run repeatedly: the window runs from each group's last digest to now,
 * and only advances after a successful send. Groups with nothing to report are
 * skipped rather than sent an empty update.
 *
 * Usage:
 *   npm run digest:whatsapp
 *   ts-node -r tsconfig-paths/register scripts/send-whatsapp-digest.ts
 */

import { sendPendingDigests } from '../lib/services/whatsapp-digest'

async function main() {
  const startedAt = new Date()
  console.log(`[digest] run started ${startedAt.toISOString()}`)

  const results = await sendPendingDigests(startedAt)

  if (results.length === 0) {
    console.log('[digest] no groups in DIGEST mode')
    return
  }

  for (const r of results) {
    if (r.sent) {
      console.log(`[digest] sent to ${r.groupJid}: ${r.ticketsTouched} ticket(s) since ${r.windowStart.toISOString()}`)
    } else {
      console.log(`[digest] skipped ${r.groupJid}: ${r.reason}`)
    }
  }
}

main()
  .catch((err) => {
    console.error('[digest] run failed', err)
    process.exit(1)
  })
  .finally(async () => {
    const { prisma } = await import('../lib/prisma')
    await prisma.$disconnect()
  })
