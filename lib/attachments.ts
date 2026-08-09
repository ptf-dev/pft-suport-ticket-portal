export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  // Excel — .xlsx first, then legacy .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

// Extensions are listed alongside the MIME types: some browsers/OS combinations
// report Office files as application/octet-stream (or an empty string), and the
// file picker matches those on extension instead.
export const ATTACHMENT_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  '.xlsx',
  '.xls',
].join(',')

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB

export const ATTACHMENT_EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

export function isSpreadsheetMime(mimeType: string): boolean {
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  )
}

function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? ''
}

/**
 * Whether a file may be attached.
 *
 * Prefers the browser-reported MIME type, but falls back to the extension when
 * that type is missing or generic — Windows and some browsers hand back
 * `application/octet-stream` (or nothing at all) for .xlsx/.xls, which would
 * otherwise reject a perfectly valid spreadsheet. The stored file is always
 * served back with the content type derived from its extension, so an accepted
 * file can only ever be served as one of the types on the allowlist.
 */
export function isAllowedAttachment(fileName: string, mimeType: string): boolean {
  if (ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) return true
  const generic = !mimeType || mimeType === 'application/octet-stream'
  if (!generic) return false
  return Boolean(ATTACHMENT_EXT_CONTENT_TYPE[extensionOf(fileName)])
}

/** Content type to persist for a file, normalising generic browser values. */
export function resolveAttachmentMime(fileName: string, mimeType: string): string {
  if (ALLOWED_ATTACHMENT_TYPES.includes(mimeType)) return mimeType
  return ATTACHMENT_EXT_CONTENT_TYPE[extensionOf(fileName)] ?? mimeType
}
