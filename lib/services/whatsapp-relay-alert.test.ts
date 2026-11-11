import { describeDeliveryFailure } from './whatsapp-relay-alert'

describe('describeDeliveryFailure', () => {
  it('names a disconnected session instead of the raw error', () => {
    const reason = describeDeliveryFailure('SCAN_QR_CODE', 'WAHA sendText failed 422: no session')
    expect(reason).toContain('WhatsApp session is SCAN_QR_CODE (not connected)')
    expect(reason).toContain('Admin → WhatsApp')
  })

  it('treats every non-WORKING status as disconnected', () => {
    for (const status of ['STARTING', 'FAILED', 'STOPPED', 'UNKNOWN']) {
      expect(describeDeliveryFailure(status, 'boom')).toContain(`WhatsApp session is ${status} (not connected)`)
    }
  })

  it('says the service is unreachable when no status comes back', () => {
    const reason = describeDeliveryFailure(null, 'WAHA request to /api/sendText timed out after 8000ms')
    expect(reason).toContain('may be down or unreachable')
    expect(reason).toContain('timed out after 8000ms')
  })

  it('keeps the raw error when the session claims to be healthy', () => {
    const reason = describeDeliveryFailure('WORKING', 'WAHA sendText failed 500: internal')
    expect(reason).toContain('reports WORKING but the send still failed')
    expect(reason).toContain('WAHA sendText failed 500: internal')
  })
})
