import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendGroupText } from '@/lib/integrations/waha'
import { formatEventMessage, type RevenueStats } from '@/lib/webhook-relay-message'

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
  try {
    await sendGroupText(relay.groupJid, message)
  } catch (err) {
    console.error('[webhook-relay] send failed', relay.id, err)
    return NextResponse.json({ error: 'Delivery failed' }, { status: 502 })
  }

  const updateData: any = { lastEventAt: new Date() }
  if (revenueIncrement !== null) {
    updateData.totalRevenue = { increment: revenueIncrement }
    updateData.eventCount = { increment: 1 }
  }
  prisma.webhookRelay.update({ where: { id: relay.id }, data: updateData }).catch(() => {})

  return NextResponse.json({ ok: true })
}
