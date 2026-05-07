'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScheduleTicketModal } from '../schedule-ticket-modal'

interface ScheduleTicketButtonProps {
  ticketId: string
  ticketTitle: string
  currentScheduledDate: Date | null
}

export function ScheduleTicketButton({
  ticketId,
  ticketTitle,
  currentScheduledDate,
}: ScheduleTicketButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const formatScheduledDate = (date: Date | null) => {
    if (!date) return null
    
    const scheduled = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    scheduled.setHours(0, 0, 0, 0)
    
    if (scheduled.getTime() === today.getTime()) {
      return '📌 Today'
    } else if (scheduled.getTime() === tomorrow.getTime()) {
      return '⏭️ Tomorrow'
    } else {
      return `📅 ${new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    }
  }

  const scheduledLabel = formatScheduledDate(currentScheduledDate)

  return (
    <>
      <Button
        variant={currentScheduledDate ? 'default' : 'outline'}
        size="sm"
        onClick={() => setShowModal(true)}
        className="gap-2"
      >
        {scheduledLabel || '📅 Schedule'}
      </Button>

      {showModal && (
        <ScheduleTicketModal
          ticketId={ticketId}
          ticketTitle={ticketTitle}
          currentScheduledDate={currentScheduledDate}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
