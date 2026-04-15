import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { SMTPService } from '@/lib/services/smtp'
import { EncryptionService } from '@/lib/services/encryption'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const testSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1),
  password: z.string().optional(), // blank = use saved password
  senderEmail: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const result = testSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
    }

    const { host, port, secure, username, senderEmail } = result.data
    let password = result.data.password

    // If no password provided, use the saved one
    if (!password || !password.trim() || password === '••••••••') {
      const existing = await prisma.sMTPSettings.findFirst({ orderBy: { updatedAt: 'desc' } })
      if (!existing) {
        return NextResponse.json({ error: 'No saved password found. Please enter a password.' }, { status: 400 })
      }
      password = EncryptionService.decrypt(existing.password)
    }

    const config = { host, port, secure, auth: { user: username, pass: password } }

    // Test connection first
    const connResult = await SMTPService.testConnection(config)
    if (!connResult.success) {
      return NextResponse.json({ success: false, message: connResult.message })
    }

    // Send test email to sender address
    const emailResult = await SMTPService.sendTestEmail(config, senderEmail)
    return NextResponse.json(emailResult)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
