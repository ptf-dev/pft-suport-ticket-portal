import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { isWahaConfigured, restartSession, getSessionQr, requestPairingCode, getBotIdentity } from '@/lib/integrations/waha'

export const dynamic = 'force-dynamic'
// Restart + poll can take ~30s before WAHA reaches SCAN_QR_CODE.
export const maxDuration = 60

/**
 * Kick off WhatsApp pairing: restart the session, wait for the QR window to
 * open, and return the QR (plus a pairing code when a phone number is given).
 *
 * Does NOT touch group→company mappings — those live in our database keyed by
 * groupJid and are unaffected by re-pairing the same number.
 */
export async function POST() {
  await requireAdmin()
  if (!isWahaConfigured()) {
    return NextResponse.json({ error: 'WAHA not configured' }, { status: 400 })
  }

  // Read the linked number before restarting — WAHA still reports `me` while the
  // session is FAILED, and it's what the pairing code has to be requested for.
  const identity = await getBotIdentity().catch(() => null)
  const phoneNumber = identity?.phone ?? ''

  const status = await restartSession()
  if (!status) {
    return NextResponse.json({ error: 'Restart failed' }, { status: 502 })
  }
  if (status.status === 'WORKING') {
    return NextResponse.json({ status: status.status, qr: null, pairingCode: null })
  }
  if (status.status !== 'SCAN_QR_CODE') {
    return NextResponse.json({ status: status.status, qr: null, pairingCode: null })
  }

  const qr = await getSessionQr()
  const pairingCode = phoneNumber ? await requestPairingCode(phoneNumber).catch(() => null) : null

  return NextResponse.json({ status: status.status, qr, pairingCode })
}
