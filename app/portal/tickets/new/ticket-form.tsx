'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PRIORITY_OPTIONS } from '@/lib/priorities'
import { ATTACHMENT_ACCEPT, isAllowedAttachment, isSpreadsheetMime } from '@/lib/attachments'
import {
  AlertTriangle, ClipboardPaste, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Upload, X,
} from 'lucide-react'
import Link from 'next/link'

interface FormErrors {
  title?: string[]
  description?: string[]
  priority?: string[]
  category?: string[]
  general?: string
}

interface DuplicateTicket {
  id: string
  key: string | null
  title: string
}

const PRIORITIES = PRIORITY_OPTIONS

const CATEGORIES = [
  'Account Issue',
  'Technical Problem',
  'Billing Question',
  'Feature Request',
  'Bug Report',
  'General Inquiry',
  'Platform Access',
  'Data Issue',
  'Performance Issue',
  'Integration Problem',
  'Other',
]

const LABEL_CLS = 'font-mono text-[10px] uppercase tracking-widest text-ink-mute'
const HINT_CLS = 'text-xs text-ink-mute'
const FIELD_ERROR_CLS = 'text-xs text-danger'

function FileKindIcon({ file }: { file: File }) {
  const cls = 'w-5 h-5 text-ink-mute shrink-0'
  if (isSpreadsheetMime(file.type)) return <FileSpreadsheet className={cls} strokeWidth={1.5} />
  if (file.type === 'application/pdf') return <FileText className={cls} strokeWidth={1.5} />
  return <ImageIcon className={cls} strokeWidth={1.5} />
}

export function TicketForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [duplicateTicket, setDuplicateTicket] = useState<DuplicateTicket | null>(null)
  const [pendingData, setPendingData] = useState<Record<string, string> | null>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      addFiles(files)
    }
  }

  const addFiles = (files: File[]) => {
    const validFiles = files.filter(file => isAllowedAttachment(file.name, file.type))

    // Limit to 5 files total
    if (validFiles.length + selectedFiles.length > 5) {
      setErrors({ general: 'Maximum 5 attachments allowed' })
      return
    }

    // Clear any previous errors
    if (errors.general) {
      setErrors({})
    }

    setSelectedFiles([...selectedFiles, ...validFiles])
  }

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      const files: File[] = []

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            const file = new File([blob], `pasted-image-${Date.now()}.png`, { type })
            files.push(file)
          }
        }
      }

      if (files.length > 0) {
        addFiles(files)
      } else {
        setErrors({ general: 'No image found in clipboard' })
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error)
      setErrors({ general: 'Failed to read clipboard. Please make sure you have copied an image.' })
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const submitTicket = async (data: Record<string, string>, force: boolean) => {
    try {
      const response = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, force }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.error === 'duplicate' && errorData.duplicateTicket) {
          setDuplicateTicket(errorData.duplicateTicket)
          setPendingData(data)
          setIsSubmitting(false)
          return
        }
        if (errorData.details) {
          setErrors(errorData.details)
        } else {
          setErrors({ general: errorData.error || 'Failed to create ticket' })
        }
        setIsSubmitting(false)
        return
      }

      const ticket = await response.json()

      // Upload images if any
      if (selectedFiles.length > 0) {
        const uploadFormData = new FormData()
        selectedFiles.forEach(file => {
          uploadFormData.append('images', file)
        })

        await fetch(`/api/portal/tickets/${ticket.id}/images`, {
          method: 'POST',
          body: uploadFormData,
        })
      }

      // Success - redirect to ticket detail
      router.push(`/portal/tickets/${ticket.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating ticket:', error)
      setErrors({ general: 'An unexpected error occurred' })
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})
    setDuplicateTicket(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as string,
      category: formData.get('category') as string,
    }

    // Client-side validation
    const clientErrors: FormErrors = {}
    if (!data.title?.trim()) {
      clientErrors.title = ['Title is required']
    }
    if (!data.description?.trim()) {
      clientErrors.description = ['Description is required']
    }
    if (!data.priority) {
      clientErrors.priority = ['Priority is required']
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setIsSubmitting(false)
      return
    }

    await submitTicket(data, false)
  }

  const handleCreateAnyway = async () => {
    if (!pendingData) return
    setIsSubmitting(true)
    await submitTicket(pendingData, true)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader className="border-b border-line-soft">
          <CardTitle>Ticket details</CardTitle>
          <CardDescription>Fill in the information below to open your support ticket.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {errors.general && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={2} />
              <span>{errors.general}</span>
            </div>
          )}

          {duplicateTicket && (
            <div className="rounded-lg border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warn" strokeWidth={2} />
                <span>
                  This looks similar to an existing open ticket:{' '}
                  <strong className="font-semibold">{duplicateTicket.key ?? duplicateTicket.id.slice(0, 8)}</strong> — &quot;{duplicateTicket.title}&quot;.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/portal/tickets/${duplicateTicket.id}`}>
                  <Button type="button" size="sm" variant="outline">View existing ticket</Button>
                </Link>
                <Button type="button" size="sm" variant="outline" disabled={isSubmitting} onClick={handleCreateAnyway}>
                  Create a new ticket anyway
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="title" className={LABEL_CLS}>
              Title <span className="text-danger">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="Brief summary of your issue"
              required
              disabled={isSubmitting}
            />
            <p className={HINT_CLS}>A clear, concise title that describes the issue.</p>
            {errors.title && <p className={FIELD_ERROR_CLS}>{errors.title[0]}</p>}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="priority" className={LABEL_CLS}>
                Priority <span className="text-danger">*</span>
              </Label>
              <Select
                id="priority"
                name="priority"
                required
                disabled={isSubmitting}
              >
                <option value="">Select priority level</option>
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
              <p className={HINT_CLS}>The time in brackets is the resolution turnaround the PFT team commits to at that priority.</p>
              {errors.priority && <p className={FIELD_ERROR_CLS}>{errors.priority[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className={LABEL_CLS}>Category</Label>
              <Select
                id="category"
                name="category"
                disabled={isSubmitting}
              >
                <option value="">Select a category (optional)</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
              <p className={HINT_CLS}>Helps us route your ticket to the right team.</p>
              {errors.category && <p className={FIELD_ERROR_CLS}>{errors.category[0]}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className={LABEL_CLS}>
              Description <span className="text-danger">*</span>
            </Label>
            <textarea
              id="description"
              name="description"
              rows={8}
              placeholder="Provide a detailed description of your issue...

Please include:
• What you were trying to do
• What actually happened
• Any error messages you received
• Steps to reproduce the issue
• When the issue started
• Any relevant account or transaction details"
              required
              disabled={isSubmitting}
              className="flex w-full rounded-md border border-line bg-bg-elev px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed"
            />
            <p className={HINT_CLS}>The more detail you provide, the faster we can help.</p>
            {errors.description && <p className={FIELD_ERROR_CLS}>{errors.description[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="images" className={LABEL_CLS}>Attachments</Label>
            <div
              ref={dropZoneRef}
              className="rounded-xl border border-dashed border-line bg-bg-sunken p-8 text-center hover:bg-mute transition-colors"
            >
              <input
                type="file"
                id="images"
                accept={ATTACHMENT_ACCEPT}
                multiple
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
              <label
                htmlFor="images"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-10 h-10 text-ink-faint mb-3" strokeWidth={1.25} />
                <span className="text-sm font-medium text-ink mb-1">
                  Click to upload attachments or drag and drop
                </span>
                <span className="text-xs text-ink-mute">
                  PNG, JPG, GIF, WebP, PDF, XLSX, XLS up to 10MB (max 5 files)
                </span>
              </label>
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePasteFromClipboard}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" /> Paste from clipboard
                </Button>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className={LABEL_CLS}>Selected files ({selectedFiles.length}/5)</p>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-line bg-bg-elev px-3 py-2"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileKindIcon file={file} />
                      <span className="text-sm text-ink truncate">{file.name}</span>
                      <span className="text-xs text-ink-mute whitespace-nowrap tabular-nums">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="ml-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-danger-soft transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-line-soft bg-bg-sunken/60 py-4">
          <Link href="/portal/tickets">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" variant="accent" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Creating ticket…' : 'Create ticket'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
