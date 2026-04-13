'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * Comment Form Component
 * Requirements: 8.1, 8.3, 8.4, 8.6
 */
interface CommentFormProps {
  ticketId: string
  isAdmin?: boolean
  onCommentAdded?: () => void
}

export default function CommentForm({
  ticketId,
  isAdmin = false,
  onCommentAdded,
}: CommentFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [internal, setInternal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!message.trim()) {
      setError('Comment message is required')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, internal }),
      })

      if (!response.ok) {
        const error = await response.json()
        setError(error.message || 'Failed to add comment')
        return
      }

      // Reset form
      setMessage('')
      setInternal(false)
      
      // Refresh page to show new comment
      if (onCommentAdded) {
        onCommentAdded()
      } else {
        router.refresh()
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="message" className="dark:text-gray-300">Add Comment</Label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-primary-500"
          placeholder="Write your comment here..."
          disabled={isSubmitting}
        />
      </div>

      {isAdmin && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="internal"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            disabled={isSubmitting}
          />
          <Label htmlFor="internal" className="ml-2 text-sm dark:text-gray-300">
            Internal note (only visible to admins)
          </Label>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !message.trim()}>
          {isSubmitting ? 'Adding...' : 'Add Comment'}
        </Button>
      </div>
    </form>
  )
}
