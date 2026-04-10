import { NextRequest, NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Image Upload API Endpoint
 * Requirements: 5.4, 5.5, 9.1, 9.2, 9.3
 * 
 * POST /api/portal/tickets/[id]/images
 * - Client authentication required
 * - Validates file types (JPEG, PNG, GIF, WebP)
 * - Validates file size (max 10MB)
 * - Stores images and creates TicketImage records
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require client authentication
    const session = await requireClient()
    const companyId = session.user.companyId!

    // Verify ticket exists and belongs to client's company
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    })

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (ticket.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate files
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, GIF, WebP` },
          { status: 400 }
        )
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'tickets', params.id)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Upload files and create records
    const uploadedImages = []
    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filepath = join(uploadDir, filename)

      // Write file
      await writeFile(filepath, buffer)

      // Create database record
      const image = await prisma.ticketImage.create({
        data: {
          ticketId: params.id,
          filename,
          url: `/uploads/tickets/${params.id}/${filename}`,
          size: file.size,
          mimeType: file.type,
        },
      })

      uploadedImages.push(image)
    }

    return NextResponse.json(
      { images: uploadedImages, count: uploadedImages.length },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading images:', error)
    
    if (error instanceof Error && error.message.includes('Client access required')) {
      return NextResponse.json(
        { error: 'Client access required' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
