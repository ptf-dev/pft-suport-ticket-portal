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

function getEventData(payload: any): Record<string, unknown> {
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return { ...payload, ...payload.data }
  return payload
}

function formatCurrency(amount: number, currency: string): string {
  const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
  const s = sym[currency.toUpperCase()] ?? ''
  return s ? `${s}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency.toUpperCase()}` : `${amount} ${currency.toUpperCase()}`
}

function humanize(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface RevenueStats { totalRevenue: number; eventCount: number }

function formatPurchase(relayName: string, d: Record<string, unknown>, baseUrl: string | null, stats: RevenueStats | null): string {
  const amount = typeof d.amount === 'number' ? d.amount : typeof d.usdAmount === 'number' ? d.usdAmount : null
  const currency = typeof d.currency === 'string' ? d.currency : 'USD'
  const email = typeof d.email === 'string' ? d.email : null
  const method = typeof d.paymentMethod === 'string' ? humanize(d.paymentMethod) : null
  const challenge = typeof d.challengeType === 'string' ? humanize(d.challengeType) : null
  const programName = typeof d.programName === 'string' ? d.programName : null
  const paymentId = typeof d.paymentId === 'string' ? d.paymentId : null

  const lines = [`💰 *${relayName}* — New Sale!`, '']
  if (amount !== null) {
    const price = formatCurrency(amount, currency)
    lines.push(method ? `${price} via ${method}` : price)
  }
  if (email) lines.push(`📧 ${email}`)
  if (programName) lines.push(`📦 ${programName}`)
  if (challenge) lines.push(`🏆 ${challenge} Challenge`)
  if (stats) {
    const newTotal = stats.totalRevenue + (amount ?? 0)
    const newCount = stats.eventCount + 1
    lines.push(`\n📊 Total revenue: ${formatCurrency(newTotal, 'USD')} (${newCount} sales)`)
  }
  if (baseUrl && paymentId) lines.push(`🔗 ${baseUrl.replace(/\/$/, '')}/admin/payments/${paymentId}`)

  return lines.join('\n')
}

function formatGeneric(relayName: string, event: string | null, d: Record<string, unknown>, baseUrl: string | null): string {
  const header = event ? `🔔 *${relayName}* — ${humanize(event)}` : `🔔 *${relayName}*`
  const skip = new Set(['event', 'type', 'event_type', 'signature', 'timestamp', 'data'])
  const idFields = new Set(['eventId', 'userId', 'programId'])
  const lines: string[] = []
  for (const [key, value] of Object.entries(d)) {
    if (lines.length >= 8) break
    if (skip.has(key) || idFields.has(key)) continue
    if (value === null || value === undefined) continue
    const t = typeof value
    if (t !== 'string' && t !== 'number' && t !== 'boolean') continue
    const text = String(value).replace(/\s+/g, ' ').trim()
    if (!text) continue
    lines.push(`• ${key}: ${text.slice(0, 120)}`)
  }
  return lines.length ? `${header}\n${lines.join('\n')}` : header
}

interface FormatResult { message: string; revenueIncrement: number | null }

function formatEventMessage(relayName: string, rawBody: string, baseUrl: string | null, stats: RevenueStats | null): FormatResult {
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    payload = null
  }

  if (payload === null || typeof payload !== 'object') {
    const text = rawBody.replace(/\s+/g, ' ').trim().slice(0, 400)
    return { message: `🔔 *${relayName}*\n${text || '(empty payload)'}`, revenueIncrement: null }
  }

  const event: string | null = payload.event ?? payload.type ?? payload.event_type ?? null
  const d = getEventData(payload)

  if (event === 'purchase_completed') {
    const amount = typeof d.amount === 'number' ? d.amount : typeof d.usdAmount === 'number' ? d.usdAmount : null
    return { message: formatPurchase(relayName, d, baseUrl, stats), revenueIncrement: amount }
  }

  return { message: formatGeneric(relayName, event, d, baseUrl), revenueIncrement: null }
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
