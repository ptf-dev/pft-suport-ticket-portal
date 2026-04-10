import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import NotificationSettingsForm from './notification-settings-form'

/**
 * Notification Settings Page
 * Requirements: Email notification system
 * 
 * Note: SMTP implementation skipped for MVP
 * This page provides the data structure for future email notifications
 */
export default async function NotificationSettingsPage() {
  // Protect route - client only
  const session = await requireClient()
  const companyId = session.user.companyId!

  // Get or create notification settings
  let settings = await prisma.notificationSettings.findUnique({
    where: { companyId },
  })

  // Create default settings if they don't exist
  if (!settings) {
    settings = await prisma.notificationSettings.create({
      data: {
        companyId,
        emailNotificationsEnabled: true,
        notifyOnStatusChange: true,
        notifyOnNewComments: true,
        notifyOnTicketAssignment: false,
        notifyOnTicketResolution: true,
        customEmailTemplates: false,
        recipientEmails: [],
      },
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure email notification preferences for your support tickets.
        </p>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Email notifications are configured but SMTP integration is pending.
            Settings will be applied once email service is activated.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
