import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/services/encryption'
import { z } from 'zod'

const smtpSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535, 'Port must be between 1 and 65535'),
  secure: z.boolean(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(), // optional on update (keep existing if blank)
  senderEmail: z.string().email('Valid sender email is required'),
  senderName: z.string().min(1, 'Sender name is required'),
  isActive: z.boolean().default(true),
})

export async function GET() {
  try {
    const session = await requireAdmin()

    const settings = await prisma.sMTPSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!settings) return NextResponse.json(null)

    // Mask password
    return NextResponse.json({
      ...settings,
      password: '••••••••',
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const userId = session.user.id

    const body = await request.json()
    const result = smtpSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { password, ...rest } = result.data

    const existing = await prisma.sMTPSettings.findFirst({ orderBy: { updatedAt: 'desc' } })

    let encryptedPassword: string
    if (password && password.trim()) {
      encryptedPassword = EncryptionService.encrypt(password)
    } else if (existing) {
      encryptedPassword = existing.password // keep existing
    } else {
      return NextResponse.json({ error: 'Password is required for new SMTP settings' }, { status: 400 })
    }

    const data = {
      ...rest,
      password: encryptedPassword,
      updatedBy: userId,
    }

    let settings
    if (existing) {
      settings = await prisma.sMTPSettings.update({
        where: { id: existing.id },
        data,
      })
    } else {
      settings = await prisma.sMTPSettings.create({
        data: { ...data, createdBy: userId },
      })
    }

    return NextResponse.json({ ...settings, password: '••••••••' })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
