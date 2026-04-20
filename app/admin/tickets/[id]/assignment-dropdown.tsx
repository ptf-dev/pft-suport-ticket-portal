'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/**
 * Assignment Dropdown Component
 * Requirements: 2.1, 2.2
 * 
 * Allows admins to assign tickets to agents
 */
interface AssignmentDropdownProps {
  ticketId: string
  currentAssignedToId: string | null
  currentAssignedTo: { id: string; name: string; email: string } | null
}

interface AdminUser {
  id: string
  name: string
  email: string
}

export function AssignmentDropdown({
  ticketId,
  currentAssignedToId,
  currentAssignedTo,
}: AssignmentDropdownProps) {
  const router = useRouter()
  const [assignedToId, setAssignedToId] = useState<string>(currentAssignedToId || '')
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch list of active admin users on component mount
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const response = await fetch('/api/admin/users')
        if (!response.ok) {
          throw new Error('Failed to fetch admin users')
        }
        const data = await response.json()
        
        // Filter for active admin users only
        const activeAdmins = data.filter(
          (user: any) => user.role === 'ADMIN' && user.isActive
        )
        
        setAdminUsers(activeAdmins)
      } catch (err) {
        console.error('Error fetching admin users:', err)
        setError('Failed to load admin users')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAdminUsers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Store the previous value for rollback
    const previousAssignedToId = currentAssignedToId || ''
    
    // Optimistic UI update - immediately update the displayed value
    // This makes the UI feel more responsive
    const newAssignedToId = assignedToId === '' ? null : assignedToId

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToId: newAssignedToId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update assignment')
      }

      // Revalidate page on success to get fresh data from server
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update assignment')
      // Rollback on error - restore previous value
      setAssignedToId(previousAssignedToId)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanged = assignedToId !== (currentAssignedToId || '')

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Change Assignment
        </Label>
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label htmlFor="assignedTo" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Change Assignment
        </Label>
        <Select
          id="assignedTo"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          disabled={isSubmitting}
          className="mt-1"
        >
          <option value="">Unassigned</option>
          {adminUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
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
        {isSubmitting ? 'Updating...' : 'Update Assignment'}
      </Button>
    </form>
  )
}
