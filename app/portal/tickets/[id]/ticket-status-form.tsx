'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TicketStatusFormProps {
  ticketId: string
  currentStatus: string
}

const CLIENT_ALLOWED_STATUSES = [
  { value: 'OPEN', label: 'Open', variant: 'destructive' as const, description: 'Issue is open and needs attention' },
  { value: 'WAITING_CLIENT', label: 'Waiting on Me', variant: 'warning' as const, description: 'I need to provide more information' },
  { value: 'RESOLVED', label: 'Resolved', variant: 'success' as const, description: 'Issue has been resolved' },
]

export function TicketStatusForm({ ticketId, currentStatus }: TicketStatusFormProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setShowOptions(false)
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/portal/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      setShowOptions(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStatusInfo = CLIENT_ALLOWED_STATUSES.find(s => s.value === currentStatus)

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Ticket Status
        </label>
        
        {!showOptions ? (
          <div className="flex items-center gap-2">
            <Badge variant={currentStatusInfo?.variant || 'secondary'} className="text-sm py-1 px-3">
              {currentStatusInfo?.label || currentStatus.replace('_', ' ')}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(true)}
              className="text-xs"
            >
              Change Status
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {CLIENT_ALLOWED_STATUSES.map((status) => (
              <button
                key={status.value}
                onClick={() => handleStatusChange(status.value)}
                disabled={isUpdating}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  status.value === currentStatus
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {status.label}
                  </span>
                  {status.value === currentStatus && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {status.description}
                </p>
              </button>
            ))}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(false)}
              disabled={isUpdating}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        💡 Update the status to help our team track your ticket progress
      </p>
    </div>
  )
}
