import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'
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
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="font-display text-2xl tracking-tightest text-ink leading-none">
            Stay in <em className="italic text-accent">the loop.</em>
          </h1>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
            Client portal · Notifications
          </span>
        </div>
        <p className="text-sm text-ink-mute">
          Choose which ticket events send an email to your team.
        </p>
      </header>

      <div className="flex items-start gap-2 rounded-xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
        <Info className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
        <p>
          <strong className="font-semibold">Note:</strong> Email notifications are configured but SMTP integration is pending.
          Settings will be applied once the email service is activated.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  )
}
