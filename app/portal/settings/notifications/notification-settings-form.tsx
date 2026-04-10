'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NotificationSettings } from '@prisma/client'

/**
 * Notification Settings Form
 * Requirements: Email notification system
 */
interface NotificationSettingsFormProps {
  settings: NotificationSettings
}

export default function NotificationSettingsForm({
  settings,
}: NotificationSettingsFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const data = {
      emailNotificationsEnabled: formData.get('emailNotificationsEnabled') === 'on',
      notifyOnStatusChange: formData.get('notifyOnStatusChange') === 'on',
      notifyOnNewComments: formData.get('notifyOnNewComments') === 'on',
      notifyOnTicketAssignment: formData.get('notifyOnTicketAssignment') === 'on',
      notifyOnTicketResolution: formData.get('notifyOnTicketResolution') === 'on',
    }

    try {
      const response = await fetch('/api/portal/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      setMessage('Settings updated successfully')
      router.refresh()
    } catch (error) {
      setMessage('Failed to update settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`px-4 py-3 rounded ${
            message.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="emailNotificationsEnabled"
            name="emailNotificationsEnabled"
            defaultChecked={settings.emailNotificationsEnabled}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <Label htmlFor="emailNotificationsEnabled" className="ml-2">
            Enable email notifications
          </Label>
        </div>

        <div className="ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyOnStatusChange"
              name="notifyOnStatusChange"
              defaultChecked={settings.notifyOnStatusChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <Label htmlFor="notifyOnStatusChange" className="ml-2 text-sm">
              Notify when ticket status changes
            </Label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyOnNewComments"
              name="notifyOnNewComments"
              defaultChecked={settings.notifyOnNewComments}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <Label htmlFor="notifyOnNewComments" className="ml-2 text-sm">
              Notify when new comments are added
            </Label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyOnTicketAssignment"
              name="notifyOnTicketAssignment"
              defaultChecked={settings.notifyOnTicketAssignment}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <Label htmlFor="notifyOnTicketAssignment" className="ml-2 text-sm">
              Notify when tickets are assigned
            </Label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifyOnTicketResolution"
              name="notifyOnTicketResolution"
              defaultChecked={settings.notifyOnTicketResolution}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <Label htmlFor="notifyOnTicketResolution" className="ml-2 text-sm">
              Notify when tickets are resolved
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}
