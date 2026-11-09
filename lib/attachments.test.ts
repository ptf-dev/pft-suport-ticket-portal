import {
  ALLOWED_ATTACHMENT_TYPES,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXT_CONTENT_TYPE,
  ATTACHMENT_TYPES_LABEL,
  isAllowedAttachment,
  isArchiveMime,
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

describe('zip archives', () => {
  const ZIP = 'application/zip'

  it('accepts a .zip by its proper MIME type', () => {
    expect(isAllowedAttachment('FOU-103 Release Checklist.zip', ZIP)).toBe(true)
  })

  it('accepts the names Windows and other browsers use, only for files named .zip', () => {
    expect(isAllowedAttachment('bundle.zip', 'application/x-zip-compressed')).toBe(true)
    expect(isAllowedAttachment('bundle.ZIP', 'application/x-zip')).toBe(true)
    expect(isAllowedAttachment('payload.exe', 'application/x-zip-compressed')).toBe(false)
    expect(isAllowedAttachment('notes.txt', 'multipart/x-zip')).toBe(false)
  })

  it('falls back to the extension when the browser reports a generic type', () => {
    expect(isAllowedAttachment('bundle.zip', 'application/octet-stream')).toBe(true)
    expect(isAllowedAttachment('bundle.zip', '')).toBe(true)
  })

  it('still rejects other archive formats', () => {
    expect(isAllowedAttachment('bundle.rar', 'application/vnd.rar')).toBe(false)
    expect(isAllowedAttachment('bundle.7z', 'application/x-7z-compressed')).toBe(false)
    expect(isAllowedAttachment('bundle.tar.gz', 'application/gzip')).toBe(false)
  })

  it('stores every zip flavour as application/zip', () => {
    expect(resolveAttachmentMime('bundle.zip', 'application/x-zip-compressed')).toBe(ZIP)
    expect(resolveAttachmentMime('bundle.zip', 'application/octet-stream')).toBe(ZIP)
    expect(resolveAttachmentMime('bundle.zip', ZIP)).toBe(ZIP)
  })

  it('is offered by the file picker, served back as a zip, and labelled for download', () => {
    expect(ATTACHMENT_ACCEPT).toContain('.zip')
    expect(ATTACHMENT_ACCEPT).toContain(ZIP)
    expect(ATTACHMENT_EXT_CONTENT_TYPE.zip).toBe(ZIP)
    expect(attachmentOpenLabel(ZIP)).toBe('Download ZIP')
    expect(attachmentOpenLabel('application/x-zip-compressed')).toBe('Download ZIP')
    expect(isArchiveMime(ZIP)).toBe(true)
    expect(isArchiveMime('application/pdf')).toBe(false)
    expect(ATTACHMENT_TYPES_LABEL).toContain('ZIP')
  })
})
