/**
 * Message formatting for the inbound webhook relay (app/api/webhooks/relay/[id]).
 *
 * External dashboards POST signed event payloads; these helpers turn one into
 * the compact WhatsApp summary the relay forwards to its group. Pure functions,
 * no I/O — the route owns delivery and persistence.
 */

export interface RevenueStats {
  totalRevenue: number
  eventCount: number
}

export interface FormatResult {
  message: string
  revenueIncrement: number | null
}

export function getEventData(payload: any): Record<string, unknown> {
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) return { ...payload, ...payload.data }
  return payload
}

export function formatCurrency(amount: number, currency: string): string {
  const sym: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
  const s = sym[currency.toUpperCase()] ?? ''
  return s ? `${s}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency.toUpperCase()}` : `${amount} ${currency.toUpperCase()}`
}

function humanize(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatPurchase(relayName: string, d: Record<string, unknown>, baseUrl: string | null, stats: RevenueStats | null): string {
  const amount = typeof d.amount === 'number' ? d.amount : typeof d.usdAmount === 'number' ? d.usdAmount : null
  const currency = typeof d.currency === 'string' ? d.currency : 'USD'
  const email = typeof d.email === 'string' ? d.email : null
  const customerName = typeof d.customerName === 'string' && d.customerName.trim() ? d.customerName.trim() : null
  const method = typeof d.paymentMethod === 'string' ? humanize(d.paymentMethod) : null
  const challenge = typeof d.challengeType === 'string' ? humanize(d.challengeType) : null
  const challengePhase = typeof d.challengePhase === 'string' && d.challengePhase.trim() ? d.challengePhase.trim() : null
  const programName = typeof d.programName === 'string' && d.programName.trim() ? d.programName.trim() : null
  const accountSizeLabel = typeof d.accountSizeLabel === 'string' && d.accountSizeLabel.trim() ? d.accountSizeLabel.trim() : null
  const country = typeof d.country === 'string' && d.country.trim() ? d.country.trim() : null
  const city = typeof d.city === 'string' && d.city.trim() ? d.city.trim() : null
  const couponCode = typeof d.couponCode === 'string' && d.couponCode.trim() ? d.couponCode.trim() : null
  const discountAmount = typeof d.discountAmount === 'number' ? d.discountAmount : null
  const isFree = d.isFree === true
  const isPapRemaining = d.isPapRemainingPayment === true
  const paymentId = typeof d.paymentId === 'string' ? d.paymentId : null

  let header = `💰 *${relayName}* — New Sale!`
  if (isFree) header = `🎁 *${relayName}* — Free Trial`
  else if (isPapRemaining) header = `💰 *${relayName}* — Remaining Payment`

  const lines = [header, '']
  if (amount !== null) {
    const price = formatCurrency(amount, currency)
    lines.push(method ? `${price} via ${method}` : price)
  }
  if (customerName && email) lines.push(`👤 ${customerName} (${email})`)
  else if (email) lines.push(`📧 ${email}`)
  else if (customerName) lines.push(`👤 ${customerName}`)
  if (city && country) lines.push(`🌍 ${city}, ${country}`)
  else if (country) lines.push(`🌍 ${country}`)
  const challengeParts: string[] = []
  if (programName) challengeParts.push(programName)
  else if (challenge) challengeParts.push(`${challenge} Challenge`)
  if (challengePhase) challengeParts.push(challengePhase)
  if (challengeParts.length) lines.push(`🏆 ${challengeParts.join(' — ')}`)
  if (accountSizeLabel) lines.push(`📦 ${accountSizeLabel} Account`)
  if (couponCode && discountAmount) lines.push(`🏷️ -${formatCurrency(discountAmount, currency)} (${couponCode})`)
  else if (couponCode) lines.push(`🏷️ Coupon: ${couponCode}`)
  const firmRevenue = typeof d.firmTotalRevenueUsd === 'number' ? d.firmTotalRevenueUsd : null
  const firmUsers = typeof d.firmTotalUsers === 'number' ? d.firmTotalUsers : null
  // Current-month figure is the sender's UTC calendar month (matches the admin
  // dashboard's UTC buckets) — never re-derive it from the local clock. 0 is a
  // real value (first sale of the month); absent means omit the line entirely.
  const monthRevenue = typeof d.firmRevenueThisMonthUsd === 'number' ? d.firmRevenueThisMonthUsd : null
  if (firmRevenue !== null) {
    const parts = [formatCurrency(firmRevenue, 'USD')]
    if (firmUsers !== null) parts.push(`${firmUsers} users`)
    lines.push(`\n📊 Firm total: ${parts.join(' · ')}`)
    if (monthRevenue !== null) lines.push(`📅 This month: ${formatCurrency(monthRevenue, 'USD')}`)
  } else if (monthRevenue !== null) {
    lines.push(`\n📅 This month: ${formatCurrency(monthRevenue, 'USD')}`)
  } else if (stats) {
    const newTotal = stats.totalRevenue + (amount ?? 0)
    const newCount = stats.eventCount + 1
    lines.push(`\n📊 Total revenue: ${formatCurrency(newTotal, 'USD')} (${newCount} sales)`)
  }
  if (baseUrl && paymentId) lines.push(`🔗 ${baseUrl.replace(/\/$/, '')}/admin/payments/${paymentId}`)

  return lines.join('\n')
}

export function formatGeneric(relayName: string, event: string | null, d: Record<string, unknown>, baseUrl: string | null): string {
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

export function formatEventMessage(relayName: string, rawBody: string, baseUrl: string | null, stats: RevenueStats | null): FormatResult {
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
