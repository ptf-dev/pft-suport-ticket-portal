import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { SmtpSettingsForm } from './smtp-settings-form'

export default async function SmtpSettingsPage() {
  await requireAdmin()

  const settings = await prisma.sMTPSettings.findFirst({ orderBy: { updatedAt: 'desc' } })

  const formData = settings
    ? {
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        username: settings.username,
        senderEmail: settings.senderEmail,
        senderName: settings.senderName,
        isActive: settings.isActive,
      }
    : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SMTP Settings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure the email server used to send ticket notifications
        </p>
      </div>

      {settings?.isActive && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <span>✅</span> SMTP is active — email notifications are enabled
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        <SmtpSettingsForm initialData={formData} />
      </div>

      {/* Provider hints */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Common Provider Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Gmail</p>
            <p>Host: smtp.gmail.com</p>
            <p>Port: 465 (SSL) / 587 (TLS)</p>
            <p>Use App Password (not account password)</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Outlook / Office 365</p>
            <p>Host: smtp.office365.com</p>
            <p>Port: 587</p>
            <p>Secure: TLS (STARTTLS)</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">SendGrid</p>
            <p>Host: smtp.sendgrid.net</p>
            <p>Port: 587</p>
            <p>Username: apikey / Password: API key</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">AWS SES</p>
            <p>Host: email-smtp.us-east-1.amazonaws.com</p>
            <p>Port: 587</p>
            <p>Use SMTP credentials from SES console</p>
          </div>
        </div>
      </div>
    </div>
  )
}
