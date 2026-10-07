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

const CHECKBOX_CLS = 'h-4 w-4 rounded border-line accent-ink'

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

  const options = [
    { id: 'notifyOnStatusChange', label: 'Notify when ticket status changes', checked: settings.notifyOnStatusChange },
    { id: 'notifyOnNewComments', label: 'Notify when new comments are added', checked: settings.notifyOnNewComments },
    { id: 'notifyOnTicketAssignment', label: 'Notify when tickets are assigned', checked: settings.notifyOnTicketAssignment },
    { id: 'notifyOnTicketResolution', label: 'Notify when tickets are resolved', checked: settings.notifyOnTicketResolution },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            message.includes('success')
              ? 'border-ok/20 bg-ok-soft text-ok'
              : 'border-danger/20 bg-danger-soft text-danger'
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="emailNotificationsEnabled"
            name="emailNotificationsEnabled"
            defaultChecked={settings.emailNotificationsEnabled}
            className={CHECKBOX_CLS}
          />
          <Label htmlFor="emailNotificationsEnabled" className="text-ink">
            Enable email notifications
          </Label>
        </div>

        <div className="ml-2 space-y-3 border-l border-line pl-5">
          {options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={option.id}
                name={option.id}
                defaultChecked={option.checked}
                className={CHECKBOX_CLS}
              />
              <Label htmlFor={option.id} className="text-sm text-ink-soft">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  )
}
