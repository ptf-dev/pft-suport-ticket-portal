export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

export const ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf'

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

export const ATTACHMENT_EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
