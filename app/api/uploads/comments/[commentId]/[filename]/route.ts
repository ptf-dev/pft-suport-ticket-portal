import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Comment Image Serving Endpoint
 * 
 * GET /api/uploads/comments/[commentId]/[filename]
 * - Serves uploaded comment images
 * - No authentication required (images are accessible via URL)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { commentId: string; filename: string } }
) {
  try {
    const filepath = join(
      process.cwd(),
      'public',
      'uploads',
      'comments',
      params.commentId,
      params.filename
    )

    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(filepath)
    
    // Determine content type from filename
    const ext = params.filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error serving comment image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
