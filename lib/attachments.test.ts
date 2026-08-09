import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXT_CONTENT_TYPE,
  isAllowedAttachment,
  isSpreadsheetMime,
  resolveAttachmentMime,
  attachmentOpenLabel,
} from './attachments'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLS = 'application/vnd.ms-excel'

describe('isAllowedAttachment', () => {
  it('accepts Excel files by their proper MIME type', () => {
    expect(isAllowedAttachment('report.xlsx', XLSX)).toBe(true)
    expect(isAllowedAttachment('legacy.xls', XLS)).toBe(true)
  })

  it('still accepts the previously supported types', () => {
    expect(isAllowedAttachment('shot.png', 'image/png')).toBe(true)
    expect(isAllowedAttachment('statement.pdf', 'application/pdf')).toBe(true)
  })

  // Windows/some browsers report Office files as octet-stream or "".
  it('falls back to the extension when the browser reports a generic type', () => {
    expect(isAllowedAttachment('report.xlsx', 'application/octet-stream')).toBe(true)
    expect(isAllowedAttachment('report.xlsx', '')).toBe(true)
    expect(isAllowedAttachment('legacy.XLS', 'application/octet-stream')).toBe(true)
  })

  it('rejects disallowed files even when the type is generic', () => {
    expect(isAllowedAttachment('payload.exe', 'application/octet-stream')).toBe(false)
    expect(isAllowedAttachment('notes.txt', '')).toBe(false)
    expect(isAllowedAttachment('noextension', 'application/octet-stream')).toBe(false)
  })

  it('does not let a mismatched extension smuggle in a disallowed MIME type', () => {
    // A real type that is not on the allowlist must be rejected outright, even
    // though the name ends in an allowed extension.
    expect(isAllowedAttachment('sneaky.xlsx', 'text/html')).toBe(false)
    expect(isAllowedAttachment('sneaky.pdf', 'application/x-msdownload')).toBe(false)
  })
})

describe('resolveAttachmentMime', () => {
  it('keeps an already-valid MIME type', () => {
    expect(resolveAttachmentMime('report.xlsx', XLSX)).toBe(XLSX)
  })

  it('normalises a generic type to the one implied by the extension', () => {
    expect(resolveAttachmentMime('report.xlsx', 'application/octet-stream')).toBe(XLSX)
    expect(resolveAttachmentMime('legacy.xls', '')).toBe(XLS)
  })
})

describe('attachment config', () => {
  it('exposes Excel in the allowlist and the file picker accept string', () => {
    expect(ALLOWED_ATTACHMENT_TYPES).toContain(XLSX)
    expect(ALLOWED_ATTACHMENT_TYPES).toContain(XLS)
    expect(ATTACHMENT_ACCEPT).toContain('.xlsx')
    expect(ATTACHMENT_ACCEPT).toContain('.xls')
  })

  it('can serve every allowed type back from a stored extension', () => {
    const servable = new Set(Object.values(ATTACHMENT_EXT_CONTENT_TYPE))
    for (const type of ALLOWED_ATTACHMENT_TYPES) {
      expect(servable.has(type)).toBe(true)
    }
  })

  it('identifies spreadsheets', () => {
    expect(isSpreadsheetMime(XLSX)).toBe(true)
    expect(isSpreadsheetMime(XLS)).toBe(true)
    expect(isSpreadsheetMime('application/pdf')).toBe(false)
  })
})

describe('attachmentOpenLabel', () => {
  it('names the actual file type instead of assuming PDF', () => {
    expect(attachmentOpenLabel('application/pdf')).toBe('Open PDF')
    expect(attachmentOpenLabel(XLSX)).toBe('Open Excel')
    expect(attachmentOpenLabel(XLS)).toBe('Open Excel')
  })

  it('falls back to a generic label for anything else', () => {
    expect(attachmentOpenLabel('application/octet-stream')).toBe('Open file')
  })
})
