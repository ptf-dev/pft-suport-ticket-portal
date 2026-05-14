import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const alt = 'PropFirmsTech Support Ticket'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  OPEN: { bg: '#fee2e2', fg: '#b91c1c' },
  IN_PROGRESS: { bg: '#dbeafe', fg: '#1d4ed8' },
  BLOCKED: { bg: '#fee2e2', fg: '#b91c1c' },
  WAITING_CLIENT: { bg: '#fef9c3', fg: '#a16207' },
  RESOLVED: { bg: '#dcfce7', fg: '#15803d' },
  CLOSED: { bg: '#e5e7eb', fg: '#374151' },
}

const PRIORITY_COLORS: Record<string, { bg: string; fg: string }> = {
  LOW: { bg: '#dcfce7', fg: '#15803d' },
  MEDIUM: { bg: '#dbeafe', fg: '#1d4ed8' },
  HIGH: { bg: '#fed7aa', fg: '#c2410c' },
  URGENT: { bg: '#fee2e2', fg: '#b91c1c' },
}

export default async function Image({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      company: { select: { name: true } },
    },
  })

  if (!ticket) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafaf9',
            fontSize: 48,
            color: '#57534e',
          }}
        >
          Ticket not found
        </div>
      ),
      size
    )
  }

  const status = STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN
  const priority = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.MEDIUM
  const shortId = ticket.id.slice(-8)
  const created = new Date(ticket.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          padding: '64px 72px',
          background:
            'linear-gradient(135deg, #fafaf9 0%, #f5f5f4 50%, #e7e5e4 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #dc2626 0%, #f59e0b 100%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 12,
              background: '#1c1917',
              color: '#fafaf9',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1c1917' }}>
              PropFirmsTech Support
            </div>
            <div style={{ fontSize: 16, color: '#78716c' }}>
              Ticket #{shortId}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#1c1917',
            lineHeight: 1.15,
            marginBottom: 32,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ticket.title}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 'auto', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: 999,
              background: status.bg,
              color: status.fg,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {ticket.status.replace(/_/g, ' ')}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: 999,
              background: priority.bg,
              color: priority.fg,
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {ticket.priority} PRIORITY
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              borderRadius: 999,
              background: '#e7e5e4',
              color: '#44403c',
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {(ticket.category || 'GENERAL').replace(/_/g, ' ')}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 32,
            borderTop: '1px solid #d6d3d1',
            fontSize: 20,
            color: '#57534e',
          }}
        >
          <div style={{ display: 'flex' }}>
            {ticket.company?.name || 'Internal'}
          </div>
          <div style={{ display: 'flex' }}>Opened {created}</div>
        </div>
      </div>
    ),
    size
  )
}
