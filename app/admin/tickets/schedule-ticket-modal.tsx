'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ScheduleTicketModalProps {
  ticketId: string
  ticketTitle: string
  currentScheduledDate: Date | null
  onClose: () => void
}

export function ScheduleTicketModal({
  ticketId,
  ticketTitle,
  currentScheduledDate,
  onClose,
}: ScheduleTicketModalProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(
    currentScheduledDate
      ? new Date(currentScheduledDate).toISOString().split('T')[0]
      : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Quick date options
  const getQuickDate = (days: number): string => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }

  const handleQuickSelect = (days: number) => {
    setSelectedDate(getQuickDate(days))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: selectedDate || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update schedule')
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: null }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear schedule')
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-2xl">📅</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Schedule Ticket
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {ticketTitle}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                ✓ Schedule updated successfully!
              </p>
            </div>
          )}

          {/* Quick Select Buttons */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedDate === getQuickDate(0) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect(0)}
                disabled={loading || success}
                className="text-xs"
              >
                📌 Today
              </Button>
              <Button
                type="button"
                variant={selectedDate === getQuickDate(1) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect(1)}
                disabled={loading || success}
                className="text-xs"
              >
                ⏭️ Tomorrow
              </Button>
              <Button
                type="button"
                variant={selectedDate === getQuickDate(7) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickSelect(7)}
                disabled={loading || success}
                className="text-xs"
              >
                📆 Next Week
              </Button>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label htmlFor="scheduled-date" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Or Choose Custom Date
            </label>
            <input
              type="date"
              id="scheduled-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              disabled={loading || success}
            />
          </div>

          {currentScheduledDate && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Current schedule:</strong>{' '}
                {new Date(currentScheduledDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {currentScheduledDate && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={loading || success}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Clear Schedule
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || success}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success || !selectedDate}
              className="flex-1"
            >
              {loading ? 'Saving...' : success ? 'Saved!' : 'Save Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
