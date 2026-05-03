'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X } from 'lucide-react'

interface EditCommentButtonProps {
  ticketId: string
  commentId: string
  currentMessage: string
}

export function EditCommentButton({ ticketId, commentId, currentMessage }: EditCommentButtonProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [message, setMessage] = useState(currentMessage)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!message.trim()) return
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update comment')
      }

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        title="Edit comment"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={4}
      />
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !message.trim()}
          className="gap-1"
        >
          <Check className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsEditing(false)
            setMessage(currentMessage)
            setError(null)
          }}
          disabled={isSaving}
          className="gap-1"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
