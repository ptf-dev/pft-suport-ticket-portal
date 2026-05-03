'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import Link from 'next/link'

interface Company {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface AdminUser {
  id: string
  name: string
  email: string
}

interface Props {
  companies: Company[]
}

const PRIORITIES = [
  { value: 'LOW', label: 'Low - General inquiry' },
  { value: 'MEDIUM', label: 'Medium - Normal issue' },
  { value: 'HIGH', label: 'High - Important issue' },
  { value: 'URGENT', label: 'Urgent - Critical issue' },
]

const CATEGORIES = [
  'Account Issue', 'Technical Problem', 'Billing Question',
  'Feature Request', 'Bug Report', 'General Inquiry',
  'Platform Access', 'Data Issue', 'Performance Issue',
  'Integration Problem', 'Other',
]

export function AdminTicketForm({ companies }: Props) {
  const router = useRouter()
  const [companyId, setCompanyId] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      addFiles(files)
    }
  }

  const addFiles = (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length + selectedFiles.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }
    setSelectedFiles(prev => [...prev, ...imageFiles])
    if (error === 'Maximum 5 images allowed') setError('')
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Load users when company changes
  useEffect(() => {
    if (!companyId) {
      setUsers([])
      return
    }
    setLoadingUsers(true)
    fetch(`/api/admin/companies/${companyId}/users`)
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [companyId])

  // Load admin users on mount
  useEffect(() => {
    setLoadingAdminUsers(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        const activeAdmins = Array.isArray(data)
          ? data.filter((u: any) => u.role === 'ADMIN' && u.isActive)
          : []
        setAdminUsers(activeAdmins)
      })
      .catch(() => setAdminUsers([]))
      .finally(() => setLoadingAdminUsers(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const body = {
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      priority: fd.get('priority') as string,
      category: fd.get('category') as string,
      companyId: fd.get('companyId') as string,
      createdById: fd.get('createdById') as string,
      assignedToId: fd.get('assignedToId') as string || undefined,
    }

    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create ticket')
        setIsSubmitting(false)
        return
      }

      if (selectedFiles.length > 0) {
        const uploadFormData = new FormData()
        selectedFiles.forEach(file => {
          uploadFormData.append('images', file)
        })
        await fetch(`/api/admin/tickets/${data.id}/images`, {
          method: 'POST',
          body: uploadFormData,
        })
      }

      router.push(`/admin/tickets/${data.id}`)
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Company */}
      <div className="space-y-1.5">
        <Label htmlFor="companyId">Company <span className="text-red-500">*</span></Label>
        <Select
          id="companyId"
          name="companyId"
          required
          disabled={isSubmitting}
          value={companyId}
          onChange={e => setCompanyId(e.target.value)}
        >
          <option value="">Select a company</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {/* User */}
      <div className="space-y-1.5">
        <Label htmlFor="createdById">Created on behalf of <span className="text-red-500">*</span></Label>
        <Select
          id="createdById"
          name="createdById"
          required
          disabled={isSubmitting || !companyId}
        >
          <option value="">
            {!companyId ? 'Select a company first' : loadingUsers ? 'Loading users…' : 'Select a user'}
          </option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
        <Input id="title" name="title" placeholder="Brief summary of the issue" required disabled={isSubmitting} />
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
        <Select id="priority" name="priority" required disabled={isSubmitting}>
          <option value="">Select priority</option>
          {PRIORITIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select id="category" name="category" disabled={isSubmitting}>
          <option value="">Select a category (optional)</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      </div>

      {/* Assign To */}
      <div className="space-y-1.5">
        <Label htmlFor="assignedToId">Assign To</Label>
        <Select id="assignedToId" name="assignedToId" disabled={isSubmitting || loadingAdminUsers}>
          <option value="">
            {loadingAdminUsers ? 'Loading agents…' : 'Leave unassigned (optional)'}
          </option>
          {adminUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
        <textarea
          id="description"
          name="description"
          rows={7}
          required
          disabled={isSubmitting}
          placeholder="Detailed description of the issue…"
          className="flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:opacity-50"
        />
      </div>

      {/* Image Upload */}
      <div className="space-y-1.5">
        <Label>Attachments</Label>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            <svg className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Click to upload images
            <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1">
              PNG, JPG, GIF, WebP up to 10MB (max 5 files)
            </span>
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2 mt-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Selected files ({selectedFiles.length}/5):
            </p>
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 text-xs font-medium ml-2 px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/tickets">
          <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  )
}
