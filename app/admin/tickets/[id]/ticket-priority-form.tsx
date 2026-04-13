'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TicketPriority } from '@prisma/client'

/**
 * Ticket Priority Update Form
 * Requirements: 7.6
 * 
 * Allows admins to change ticket priority
 */
interface TicketPriorityFormProps {
  ticketId: string
  currentPriority: TicketPriority
}

const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function TicketPriorityForm({ ticketId, currentPriority }: TicketPriorityFormProps) {
  const router = useRouter()
  const [priority, setPriority] = useState<TicketPriority>(currentPriority)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update priority')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanged = priority !== currentPriority

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Change Priority
        </Label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
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
        {isSubmitting ? 'Updating...' : 'Update Priority'}
      </Button>
    </form>
  )
}
