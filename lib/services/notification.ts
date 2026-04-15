import { SMTPService } from './smtp'
import { prisma } from '@/lib/prisma'

/**
 * Notification service — sends emails on ticket events.
 * Uses the active SMTP config from the database.
 * Silently no-ops if SMTP is not configured.
 */

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

function priorityLabel(priority: string): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase()
}

function baseHtml(title: string, body: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:8px;">
      <div style="background:#1e293b;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:18px;">PropFirmsTech Support</h1>
      </div>
      <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;">
        <h2 style="color:#111827;margin-top:0;">${title}</h2>
        ${body}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#6b7280;font-size:12px;margin:0;">PropFirmsTech Support Portal</p>
      </div>
    </div>
  `
}

export class NotificationService {
  /**
   * Notify admin when a new ticket is created by a client.
   */
  static async notifyAdminTicketCreated(ticketId: string): Promise<void> {
    try {
      const smtpSettings = await prisma.sMTPSettings.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      })
      if (!smtpSettings) return

      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          company: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
        },
      })
      if (!ticket) return

      const subject = `[New Ticket] ${ticket.title}`
      const html = baseHtml('New Support Ticket Created', `
        <p>A new ticket has been submitted and requires your attention.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#6b7280;width:120px;">Title</td><td style="padding:8px;font-weight:600;">${ticket.title}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Company</td><td style="padding:8px;">${ticket.company.name}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">Created by</td><td style="padding:8px;">${ticket.createdBy.name} (${ticket.createdBy.email})</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Priority</td><td style="padding:8px;">${priorityLabel(ticket.priority)}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">Status</td><td style="padding:8px;">${statusLabel(ticket.status)}</td></tr>
        </table>
        <p style="color:#374151;">${ticket.description.slice(0, 300)}${ticket.description.length > 300 ? '…' : ''}</p>
        <a href="${process.env.NEXTAUTH_URL}/admin/tickets/${ticket.id}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">View Ticket →</a>
      `)

      await SMTPService.sendEmail({ to: smtpSettings.senderEmail, subject, html })
    } catch (err) {
      console.error('[NotificationService] notifyAdminTicketCreated failed:', err)
    }
  }

  /**
   * Notify the ticket creator (client) when the admin changes the ticket status.
   * Only sends if the company has notifyOnStatusChange enabled.
   */
  static async notifyClientStatusChanged(
    ticketId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          company: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
        },
      })
      if (!ticket) return

      // Check company notification preferences
      const notifSettings = await prisma.notificationSettings.findUnique({
        where: { companyId: ticket.companyId },
      })
      if (!notifSettings?.emailNotificationsEnabled) return
      if (!notifSettings.notifyOnStatusChange) return

      const subject = `[Ticket Update] ${ticket.title} — status changed to ${statusLabel(newStatus)}`
      const html = baseHtml('Your Ticket Status Has Changed', `
        <p>Hi ${ticket.createdBy.name},</p>
        <p>The status of your support ticket has been updated.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#6b7280;width:120px;">Ticket</td><td style="padding:8px;font-weight:600;">${ticket.title}</td></tr>
          <tr style="background:#f9fafb;"><td style="padding:8px;color:#6b7280;">Previous status</td><td style="padding:8px;">${statusLabel(oldStatus)}</td></tr>
          <tr><td style="padding:8px;color:#6b7280;">New status</td><td style="padding:8px;font-weight:600;color:#2563eb;">${statusLabel(newStatus)}</td></tr>
        </table>
        <a href="${process.env.NEXTAUTH_URL}/portal/tickets/${ticket.id}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin-top:8px;">View Ticket →</a>
      `)

      await SMTPService.sendEmail({ to: ticket.createdBy.email, subject, html })
    } catch (err) {
      console.error('[NotificationService] notifyClientStatusChanged failed:', err)
    }
  }
}
