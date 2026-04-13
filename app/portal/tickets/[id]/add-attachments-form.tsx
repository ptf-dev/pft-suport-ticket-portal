'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

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
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const invalidFiles = files.filter(f => !allowedTypes.includes(f.type))
      
      if (invalidFiles.length > 0) {
        setError('Only JPEG, PNG, GIF, and WebP images are allowed')
        return
      }

      // Validate file sizes (10MB max)
      const maxSize = 10 * 1024 * 1024
      const oversizedFiles = files.filter(f => f.size > maxSize)
      
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
      >
        📎 Add Attachments
      </Button>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Attachments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="images">Select Images</Label>
          <input
            id="images"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Accepted formats: JPEG, PNG, GIF, WebP (max 10MB each)
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected files:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {selectedFiles.map((file, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span>📄</span>
                  <span>{file.name}</span>
                  <span className="text-xs text-gray-400">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
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
