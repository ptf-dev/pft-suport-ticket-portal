'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TicketStatus } from '@prisma/client'

interface TicketStatusFormProps {
  ticketId: string
  currentStatus: TicketStatus
  isAdmin?: boolean
}

const STATUS_CONFIG = {
  OPEN: { 
    label: 'Open', 
    variant: 'destructive' as const, 
    description: 'Issue is open and needs attention',
    adminOnly: false 
  },
  IN_PROGRESS: { 
    label: 'In Progress', 
    variant: 'default' as const, 
    description: 'Currently being worked on by support team',
    adminOnly: true 
  },
  WAITING_CLIENT: { 
    label: 'Waiting on Client', 
    variant: 'warning' as const, 
    description: 'Waiting for more information from client',
    adminOnly: false 
  },
  RESOLVED: { 
    label: 'Resolved', 
    variant: 'success' as const, 
    description: 'Issue has been resolved',
    adminOnly: false 
  },
  CLOSED: { 
    label: 'Closed', 
    variant: 'secondary' as const, 
    description: 'Ticket is closed and archived',
    adminOnly: true 
  },
}

export function TicketStatusForm({ ticketId, currentStatus, isAdmin = false }: TicketStatusFormProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>(currentStatus)

  const apiPath = isAdmin ? '/api/admin/tickets' : '/api/portal/tickets'
  const availableStatuses = Object.entries(STATUS_CONFIG).filter(
    ([_, config]) => isAdmin || !config.adminOnly
  )

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (newStatus === currentStatus) {
      setShowOptions(false)
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`${apiPath}/${ticketId}/status`, {
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

  // Simple dropdown for admin
  if (isAdmin) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      await handleStatusChange(selectedStatus)
    }

    const hasChanged = selectedStatus !== currentStatus

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Change Status
          </label>
          <select
            id="status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {availableStatuses.map(([status, config]) => (
              <option key={status} value={status}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <Button type="submit" disabled={!hasChanged || isUpdating} className="w-full">
          {isUpdating ? 'Updating...' : 'Update Status'}
        </Button>
      </form>
    )
  }

  // Enhanced UI for clients
  const currentStatusConfig = STATUS_CONFIG[currentStatus]

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Ticket Status
        </label>
        
        {!showOptions ? (
          <div className="flex items-center gap-2">
            <Badge variant={currentStatusConfig.variant} className="text-sm py-1 px-3">
              {currentStatusConfig.label}
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
            {availableStatuses.map(([status, config]) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status as TicketStatus)}
                disabled={isUpdating}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  status === currentStatus
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">
                    {config.label}
                  </span>
                  {status === currentStatus && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {config.description}
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
