'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Image Upload Component
 * Requirements: 5.4, 9.1, 9.4
 */
interface ImageUploadProps {
  onFilesSelected?: (files: File[]) => void
  maxFiles?: number
  disabled?: boolean
}

export default function ImageUpload({
  onFilesSelected,
  maxFiles = 5,
  disabled = false,
}: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate files
    const validFiles: File[] = []
    const newPreviews: string[] = []

    for (const file of files) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`)
        continue
      }

      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds 10MB limit`)
        continue
      }

      validFiles.push(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string)
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    }

    const updatedFiles = [...selectedFiles, ...validFiles]
    setSelectedFiles(updatedFiles)
    
    if (onFilesSelected) {
      onFilesSelected(updatedFiles)
    }
  }

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index)
    const updatedPreviews = previews.filter((_, i) => i !== index)
    
    setSelectedFiles(updatedFiles)
    setPreviews(updatedPreviews)
    
    if (onFilesSelected) {
      onFilesSelected(updatedFiles)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || selectedFiles.length >= maxFiles}
        >
          {selectedFiles.length === 0
            ? 'Select Images'
            : `Add More Images (${selectedFiles.length}/${maxFiles})`}
        </Button>
        <p className="mt-1 text-xs text-gray-500">
          JPEG, PNG, GIF, or WebP. Max 10MB per file.
        </p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                ×
              </button>
              <p className="mt-1 text-xs text-gray-600 truncate">
                {selectedFiles[index].name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
