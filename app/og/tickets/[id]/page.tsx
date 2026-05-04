import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: { title: true, status: true },
  })

  if (!ticket) {
    return { title: 'Ticket Not Found' }
  }

  const statusLabel = ticket.status.replace(/_/g, ' ')

  return {
    title: `${ticket.title} — PropFirmsTech Support`,
    description: `Support ticket — Status: ${statusLabel}`,
    openGraph: {
      title: ticket.title,
      description: `Support ticket — Status: ${statusLabel}`,
      siteName: 'PropFirmsTech Support Portal',
      type: 'website',
    },
  }
}

export default async function OgTicketPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    select: { title: true },
  })

  if (!ticket) {
    notFound()
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>{ticket.title}</h1>
      <p>PropFirmsTech Support Portal</p>
    </div>
  )
}
