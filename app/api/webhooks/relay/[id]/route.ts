import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendGroupText } from '@/lib/integrations/waha'

export const dynamic = 'force-dynamic'

/**
 * Inbound webhook relay: external dashboards (firm dashboards, CRMs, payment
 * systems) POST their signed event payloads here; the portal forwards a compact
 * summary as a WhatsApp message to the group configured on the relay.
 *
 * Relays are created in Admin → WhatsApp. Signature (optional, when the relay
 * has a secret): HMAC-SHA256 hex of the raw body in the X-Webhook-Signature
 * header — matching what the sending dashboards emit.
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

function formatEventMessage(relayName: string, rawBody: string): string {
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    payload = null
  }

  if (payload === null || typeof payload !== 'object') {
    const text = rawBody.replace(/\s+/g, ' ').trim().slice(0, 400)
    return `🔔 *${relayName}*\n${text || '(empty payload)'}`
  }

  const event = payload.event ?? payload.type ?? payload.event_type ?? null
  const header = event ? `🔔 *${relayName}* — ${event}` : `🔔 *${relayName}*`

  // Collect readable fields: top-level primitives, plus primitives from a
  // nested `data` object (the common {event, data:{...}} webhook shape).
  const skip = new Set(['event', 'type', 'event_type', 'signature', 'timestamp'])
  const lines: string[] = []
  const collect = (obj: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(obj)) {
      if (lines.length >= 10) return
      if (skip.has(key)) continue
      if (value === null || value === undefined) continue
      const t = typeof value
      if (t !== 'string' && t !== 'number' && t !== 'boolean') continue
      const text = String(value).replace(/\s+/g, ' ').trim()
      if (!text) continue
      lines.push(`• ${key}: ${text.slice(0, 120)}`)
    }
  }
  collect(payload)
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    collect(payload.data)
  }

  return lines.length ? `${header}\n${lines.join('\n')}` : header
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

  const message = formatEventMessage(relay.name, rawBody)
  try {
    await sendGroupText(relay.groupJid, message)
  } catch (err) {
    console.error('[webhook-relay] send failed', relay.id, err)
    return NextResponse.json({ error: 'Delivery failed' }, { status: 502 })
  }

  prisma.webhookRelay.update({ where: { id: relay.id }, data: { lastEventAt: new Date() } }).catch(() => {})

  return NextResponse.json({ ok: true })
}
