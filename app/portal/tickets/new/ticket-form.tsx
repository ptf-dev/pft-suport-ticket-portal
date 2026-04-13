'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface FormErrors {
  title?: string[]
  description?: string[]
  priority?: string[]
  category?: string[]
  general?: string
}

const PRIORITIES = [
  { value: 'LOW', label: 'Low - General inquiry' },
  { value: 'MEDIUM', label: 'Medium - Normal issue' },
  { value: 'HIGH', label: 'High - Important issue' },
  { value: 'URGENT', label: 'Urgent - Critical issue' },
]

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

export function TicketForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      // Limit to 5 files
      if (files.length + selectedFiles.length > 5) {
        setErrors({ general: 'Maximum 5 images allowed' })
        return
      }
      setSelectedFiles([...selectedFiles, ...files])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

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

    try {
      // Create ticket
      const response = await fetch('/api/portal/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
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

  return (
    <form onSubmit={handleSubmit}>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border-b dark:border-gray-700">
          <CardTitle className="text-xl">Ticket Details</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Fill in the information below to create your support ticket</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-sm">
              <div className="flex items-center">
                <span className="text-xl mr-2">⚠️</span>
                <span>{errors.general}</span>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              type="text"
              placeholder="Brief summary of your issue"
              required
              disabled={isSubmitting}
              className="text-base"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>💡</span>
              <span>Provide a clear, concise title that describes your issue</span>
            </p>
            {errors.title && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>❌</span>
                <span>{errors.title[0]}</span>
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Priority <span className="text-red-500">*</span>
            </Label>
            <Select
              id="priority"
              name="priority"
              required
              disabled={isSubmitting}
              className="text-base"
            >
              <option value="">Select priority level</option>
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>🎯</span>
              <span>Choose the urgency level of your issue</span>
            </p>
            {errors.priority && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>❌</span>
                <span>{errors.priority[0]}</span>
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</Label>
            <Select
              id="category"
              name="category"
              disabled={isSubmitting}
              className="text-base"
            >
              <option value="">Select a category (optional)</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>📁</span>
              <span>Help us route your ticket to the right team</span>
            </p>
            {errors.category && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>❌</span>
                <span>{errors.category[0]}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Description <span className="text-red-500">*</span>
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
              className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-gray-100 ring-offset-white dark:ring-offset-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>📝</span>
              <span>The more details you provide, the faster we can help you</span>
            </p>
            {errors.description && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <span>❌</span>
                <span>{errors.description[0]}</span>
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="images" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Attachments</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="hidden"
              />
              <label
                htmlFor="images"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-base text-gray-700 dark:text-gray-300 font-medium mb-1">
                  Click to upload images or drag and drop
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF up to 10MB (max 5 files)
                </span>
              </label>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span>📎</span>
                  <span>Selected files ({selectedFiles.length}/5):</span>
                </p>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">🖼️</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium ml-3 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 py-4">
          <Link href="/portal/tickets">
            <Button type="button" variant="outline" disabled={isSubmitting} className="shadow-sm">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="shadow-md hover:shadow-lg transition-shadow">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Creating Ticket...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>✓</span>
                <span>Create Ticket</span>
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
