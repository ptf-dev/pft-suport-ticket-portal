import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcrypt'

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors.password?.[0] ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: params.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(result.data.password, 10)
    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
