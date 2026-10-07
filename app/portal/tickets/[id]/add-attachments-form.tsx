'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { FileText, Paperclip } from 'lucide-react'
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE, isAllowedAttachment } from '@/lib/attachments'

interface AddAttachmentsFormProps {
  ticketId: string
  apiBasePath?: string // defaults to '/api/portal/tickets'
}

export function AddAttachmentsForm({
  ticketId,
  apiBasePath = '/api/portal/tickets',
}: AddAttachmentsFormProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)

      // Validate file types
      const invalidFiles = files.filter(f => !isAllowedAttachment(f.name, f.type))

      if (invalidFiles.length > 0) {
        setError('Only JPEG, PNG, GIF, WebP images, PDFs and Excel files are allowed')
        return
      }

      // Validate file sizes (10MB max)
      const oversizedFiles = files.filter(f => f.size > MAX_ATTACHMENT_SIZE)

      if (oversizedFiles.length > 0) {
        setError('Files must be smaller than 10MB')
        return
      }

      setSelectedFiles(files)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file')
      return
    }

    setIsUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      selectedFiles.forEach(file => {
        formData.append('images', file)
      })

      const response = await fetch(`${apiBasePath}/${ticketId}/images`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload images')
      }

      const data = await response.json()
      setSuccess(`Successfully uploaded ${data.count} image(s)`)
      setSelectedFiles([])
      setIsAdding(false)

      // Refresh the page to show new images
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isAdding) {
    return (
      <Button
        onClick={() => setIsAdding(true)}
        variant="outline"
        size="sm"
        className="gap-1.5"
      >
        <Paperclip className="w-3.5 h-3.5" /> Add attachments
      </Button>
    )
  }

  return (
    <Card className="mb-6 w-full">
      <CardHeader>
        <CardTitle>Add attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="images" className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Select files</Label>
          <input
            id="images"
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-ink-mute file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-mute file:text-ink hover:file:bg-line-soft"
          />
          <p className="text-xs text-ink-mute">
            Accepted formats: JPEG, PNG, GIF, WebP, PDF, XLSX, XLS (max 10MB each)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">Selected files</p>
            <ul className="text-sm text-ink-soft space-y-1">
              {selectedFiles.map((file, index) => (
                <li key={index} className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink-faint" strokeWidth={1.5} />
                  <span>{file.name}</span>
                  <span className="text-xs text-ink-mute">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="text-xs text-danger bg-danger-soft border border-danger/20 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="text-xs text-ok bg-ok-soft border border-ok/20 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Uploading…' : 'Upload'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsAdding(false)
              setSelectedFiles([])
              setError('')
              setSuccess('')
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
