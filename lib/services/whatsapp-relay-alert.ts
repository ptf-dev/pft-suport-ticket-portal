import { prisma } from '@/lib/prisma'
import { getSessionStatus } from '@/lib/integrations/waha'
import { SMTPService } from '@/lib/services/smtp'

/**
 * Alerting for webhook relays whose event arrived but could not be forwarded
 * to WhatsApp.
 *
 * The relay answers 200 even when the send fails, so the sending dashboard no
 * longer tells us anything is wrong — this is the replacement signal. It fires
 * once per outage, on the healthy → failing transition, and the outage ends
 * when a delivery succeeds and clears lastFailureAt.
 */

const DISCONNECTED_HINT =
  'The WhatsApp session is not connected, so nothing can be sent until it is linked again. Reconnect it in Admin → WhatsApp.'

/** Turns a raw send error into something that names the actual cause. */
export function describeDeliveryFailure(sessionStatus: string | null, error: string): string {
  if (sessionStatus && sessionStatus !== 'WORKING') {
    return `WhatsApp session is ${sessionStatus} (not connected). ${DISCONNECTED_HINT}`
  }
  if (sessionStatus === null) {
    return `WAHA did not report a session status — the WhatsApp service may be down or unreachable. Underlying error: ${error}`
  }
  return `WhatsApp session reports WORKING but the send still failed. Underlying error: ${error}`
}

async function adminRecipients(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { email: true },
  })
  return Array.from(new Set(admins.map((a) => a.email).filter(Boolean)))
}

export async function alertRelayDeliveryFailure(
  relay: { id: string; name: string },
  error: string
): Promise<void> {
  // Runs after the webhook response has gone out, so a slow or dead WAHA here
  // costs the sender nothing.
  const session = await getSessionStatus().catch(() => null)
  const reason = describeDeliveryFailure(session?.status ?? null, error)

  const recipients = await adminRecipients()
  if (recipients.length === 0) {
    console.error('[webhook-relay] delivery failed and no admin to alert', relay.id, reason)
    return
  }

  const subject = `[Not sent to WhatsApp] ${relay.name}`
  const text = [
    `An event reached the ${relay.name} relay but was not forwarded to WhatsApp.`,
    '',
    reason,
    '',
    'The event itself was accepted, so the sending dashboard will keep delivering — but anything sent while this is broken will not appear in the group.',
    '',
    'One alert per outage. It resets after the next successful delivery.',
  ].join('\n')

  for (const to of recipients) {
    await SMTPService.sendEmail({ to, subject, text }).catch(() => false)
  }
}
