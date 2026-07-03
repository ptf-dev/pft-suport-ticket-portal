import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { getSessionQr, getSessionStatus, isWahaConfigured } from '@/lib/integrations/waha'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireAdmin()
  if (!isWahaConfigured()) {
    return NextResponse.json({ configured: false, status: 'NOT_CONFIGURED' })
  }
  const status = await getSessionStatus()
  const qr = status?.status === 'SCAN_QR_CODE' ? await getSessionQr() : null
  return NextResponse.json({ configured: true, status: status?.status ?? 'UNKNOWN', qr })
}
