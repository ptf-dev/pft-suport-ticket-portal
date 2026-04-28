'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TicketPriority } from '@prisma/client'

interface TicketPriorityFormProps {
  ticketId: string
  currentPriority: TicketPriority
  isAdmin?: boolean
}

const PRIORITY_CONFIG = {
  LOW: { 
    label: 'Low', 
    variant: 'secondary' as const, 
    icon: '🟢',
    description: 'Not urgent, can be addressed when convenient' 
  },
  MEDIUM: { 
    label: 'Medium', 
    variant: 'default' as const, 
    icon: '🟡',
    description: 'Normal priority, should be addressed soon' 
  },
  HIGH: { 
    label: 'High', 
    variant: 'warning' as const, 
    icon: '🟠',
    description: 'Important issue, needs prompt attention' 
  },
  URGENT: { 
    label: 'Urgent', 
    variant: 'destructive' as const, 
    icon: '🔴',
    description: 'Critical issue requiring immediate attention' 
  },
}

export function TicketPriorityForm({ ticketId, currentPriority, isAdmin = false }: TicketPriorityFormProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority>(currentPriority)

  const apiPath = isAdmin ? '/api/admin/tickets' : '/api/portal/tickets'

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (newPriority === currentPriority) {
      setShowOptions(false)
      return
    }

    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`${apiPath}/${ticketId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update priority')
      }

      setShowOptions(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update priority')
    } finally {
      setIsUpdating(false)
    }
  }

  // Simple dropdown for admin
  if (isAdmin) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      await handlePriorityChange(selectedPriority)
    }

    const hasChanged = selectedPriority !== currentPriority

    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="priority" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Change Priority
          </label>
          <select
            id="priority"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as TicketPriority)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
              <option key={priority} value={priority}>
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
          {isUpdating ? 'Updating...' : 'Update Priority'}
        </Button>
      </form>
    )
  }

  // Enhanced UI for clients
  const currentPriorityConfig = PRIORITY_CONFIG[currentPriority]

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Ticket Priority
        </label>
        
        {!showOptions ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentPriorityConfig.icon}</span>
              <Badge variant={currentPriorityConfig.variant} className="text-sm py-1 px-3">
                {currentPriorityConfig.label}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(true)}
              className="text-xs"
            >
              Change Priority
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
              <button
                key={priority}
                onClick={() => handlePriorityChange(priority as TicketPriority)}
                disabled={isUpdating}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  priority === currentPriority
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {config.label}
                    </span>
                  </div>
                  {priority === currentPriority && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 ml-7">
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
        💡 Set priority to help our team understand the urgency of your issue
      </p>
    </div>
  )
}
