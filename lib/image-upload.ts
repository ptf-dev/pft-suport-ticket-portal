import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * Image Upload Service
 * Requirements: 5.4, 5.5, 5.6, 9.1, 9.2, 9.3, 9.5
 * 
 * Handles file upload validation and storage
 */

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

export interface UploadedFile {
  filename: string
  url: string
  size: number
  mimeType: string
}

export interface UploadError {
  filename: string
  error: string
}

export interface UploadResult {
  success: UploadedFile[]
  errors: UploadError[]
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): string | null {
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed types: JPEG, PNG, GIF, WebP`
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds 10MB limit`
  }

  return null
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  return `${timestamp}-${random}.${extension}`
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

/**
 * Upload a single file
 */
export async function uploadFile(file: File): Promise<UploadedFile> {
  // Validate file
  const validationError = validateFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  // Ensure upload directory exists
  await ensureUploadDir()

  // Generate unique filename
  const filename = generateFilename(file.name)
  const filepath = join(UPLOAD_DIR, filename)

  // Convert file to buffer and write to disk
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filepath, buffer)

  // Return file metadata
  return {
    filename,
    url: `/uploads/${filename}`,
    size: file.size,
    mimeType: file.type,
  }
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[]): Promise<UploadResult> {
  const success: UploadedFile[] = []
  const errors: UploadError[] = []

  for (const file of files) {
    try {
      const uploaded = await uploadFile(file)
      success.push(uploaded)
    } catch (error) {
      errors.push({
        filename: file.name,
        error: error instanceof Error ? error.message : 'Upload failed',
      })
    }
  }

  return { success, errors }
}
