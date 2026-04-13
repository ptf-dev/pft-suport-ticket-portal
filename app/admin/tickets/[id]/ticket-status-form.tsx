'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TicketStatus } from '@prisma/client'

/**
 * Ticket Status Update Form
 * Requirements: 7.5
 * 
 * Allows admins to change ticket status
 */
interface TicketStatusFormProps {
  ticketId: string
  currentStatus: TicketStatus
}

const STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CLIENT',
  'RESOLVED',
  'CLOSED',
]

export function TicketStatusForm({ ticketId, currentStatus }: TicketStatusFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanged = status !== currentStatus

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Change Status
        </Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={!hasChanged || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? 'Updating...' : 'Update Status'}
      </Button>
    </form>
  )
}
