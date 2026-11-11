import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendGroupText } from '@/lib/integrations/waha'
import { formatEventMessage, type RevenueStats } from '@/lib/webhook-relay-message'
import { alertRelayDeliveryFailure } from '@/lib/services/whatsapp-relay-alert'

export const dynamic = 'force-dynamic'

/**
 * Inbound webhook relay: external dashboards (firm dashboards, CRMs, payment
 * systems) POST their signed event payloads here; the portal forwards a compact
 * summary as a WhatsApp message to the group configured on the relay.
 *
 * Relays are created in Admin → WhatsApp. Signature (optional, when the relay
 * has a secret): HMAC-SHA256 hex of the raw body in the X-Webhook-Signature
 * header — matching what the sending dashboards emit. Message wording lives in
 * lib/webhook-relay-message.ts.
 */

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const provided = signature.replace(/^sha256=/, '').trim()
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(provided.toLowerCase())
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const rawBody = await request.text()

  const relay = await prisma.webhookRelay.findUnique({ where: { id: params.id } })
  // Same response for missing and disabled — don't leak which relay ids exist.
  if (!relay || !relay.enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (relay.secret) {
    const signature = request.headers.get('x-webhook-signature')
    if (!verifySignature(rawBody, signature, relay.secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const stats: RevenueStats = { totalRevenue: relay.totalRevenue, eventCount: relay.eventCount }
  const { message, revenueIncrement } = formatEventMessage(relay.name, rawBody, relay.baseUrl ?? null, stats)

  // Senders treat a non-2xx as "this endpoint is broken": they stop delivering
  // and never retry, so a WhatsApp outage would silently lose real sales
  // events. Acknowledge the event once it is accepted and authenticated, and
  // keep delivery problems on our side of the line — recorded on the relay and
  // surfaced in Admin → WhatsApp rather than pushed back to the sender.
  let failure: string | null = null
  try {
    await sendGroupText(relay.groupJid, message)
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err)
    console.error('[webhook-relay] send failed', relay.id, err)
  }

  const updateData: any = failure
    ? { lastFailureAt: new Date(), lastFailureError: failure.slice(0, 500) }
    : { lastEventAt: new Date(), lastFailureAt: null, lastFailureError: null }
  if (revenueIncrement !== null && !failure) {
    updateData.totalRevenue = { increment: revenueIncrement }
    updateData.eventCount = { increment: 1 }
  }
  prisma.webhookRelay.update({ where: { id: relay.id }, data: updateData }).catch(() => {})

  // Answering 200 means the sender stops telling us when delivery breaks, so
  // raise our own alert on the healthy → failing transition. Deliberately not
  // awaited: diagnosing the cause means another call to the WAHA that just
  // failed us, and the sender should not wait for it.
  if (failure && !relay.lastFailureAt) {
    void alertRelayDeliveryFailure(relay, failure).catch((err) =>
      console.error('[webhook-relay] alert failed', relay.id, err)
    )
  }

  return NextResponse.json({ ok: true, delivered: !failure })
}
