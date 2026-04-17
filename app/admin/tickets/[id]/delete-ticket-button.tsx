'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface DeleteTicketButtonProps {
  ticketId: string
  ticketTitle: string
}

export function DeleteTicketButton({ ticketId, ticketTitle }: DeleteTicketButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/delete`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete ticket')
      }

      // Redirect to tickets list after successful deletion
      router.push('/admin/tickets')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket')
      setIsDeleting(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete Ticket
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-2">
          Confirm Deletion
        </h3>
        <p className="text-sm text-red-800 dark:text-red-200 mb-3">
          Are you sure you want to delete &quot;{ticketTitle}&quot;? This action cannot be undone. All comments, attachments, and related data will be permanently deleted.
        </p>
        
        {error && (
          <div className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowConfirm(false)
              setError(null)
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
