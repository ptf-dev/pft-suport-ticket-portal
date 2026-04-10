'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'

interface FormErrors {
  name?: string[]
  contactEmail?: string[]
  subdomain?: string[]
  whatsappLink?: string[]
  notes?: string[]
  general?: string
}

interface CompanyFormData {
  name: string
  contactEmail: string
  subdomain: string
  whatsappLink?: string
  notes?: string
}

interface CompanyFormFieldsProps {
  initialData?: CompanyFormData
  companyId?: string
  mode: 'create' | 'edit'
}

export function CompanyFormFields({ initialData, companyId, mode }: CompanyFormFieldsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      contactEmail: formData.get('contactEmail') as string,
      subdomain: formData.get('subdomain') as string,
      whatsappLink: formData.get('whatsappLink') as string,
      notes: formData.get('notes') as string,
    }

    // Client-side validation
    const clientErrors: FormErrors = {}
    if (!data.name?.trim()) {
      clientErrors.name = ['Company name is required']
    }
    if (!data.contactEmail?.trim()) {
      clientErrors.contactEmail = ['Contact email is required']
    }
    if (!data.subdomain?.trim()) {
      clientErrors.subdomain = ['Subdomain is required']
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setIsSubmitting(false)
      return
    }

    try {
      const url = mode === 'create' 
        ? '/api/admin/companies' 
        : `/api/admin/companies/${companyId}`
      
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
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
          setErrors({ general: errorData.error || `Failed to ${mode} company` })
        }
        setIsSubmitting(false)
        return
      }

      // Success - redirect to companies list
      router.push('/admin/companies')
      router.refresh()
    } catch (error) {
      console.error(`Error ${mode}ing company:`, error)
      setErrors({ general: 'An unexpected error occurred' })
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., Acme Prop Trading"
              defaultValue={initialData?.name}
              required
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail">
              Contact Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="contact@example.com"
              defaultValue={initialData?.contactEmail}
              required
              disabled={isSubmitting}
            />
            {errors.contactEmail && (
              <p className="text-sm text-red-600">{errors.contactEmail[0]}</p>
            )}
          </div>

          {/* Subdomain */}
          <div className="space-y-2">
            <Label htmlFor="subdomain">
              Subdomain <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                name="subdomain"
                type="text"
                placeholder="acme"
                pattern="[a-z0-9-]+"
                defaultValue={initialData?.subdomain}
                required
                disabled={isSubmitting}
                className="flex-1"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                .propfirmstech.com
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Lowercase letters, numbers, and hyphens only
            </p>
            {errors.subdomain && (
              <p className="text-sm text-red-600">{errors.subdomain[0]}</p>
            )}
          </div>

          {/* WhatsApp Link */}
          <div className="space-y-2">
            <Label htmlFor="whatsappLink">WhatsApp Link</Label>
            <Input
              id="whatsappLink"
              name="whatsappLink"
              type="url"
              placeholder="https://wa.me/1234567890"
              defaultValue={initialData?.whatsappLink}
              disabled={isSubmitting}
            />
            {errors.whatsappLink && (
              <p className="text-sm text-red-600">{errors.whatsappLink[0]}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Additional notes about this company..."
              defaultValue={initialData?.notes}
              disabled={isSubmitting}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes[0]}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Link href="/admin/companies">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting 
              ? (mode === 'create' ? 'Creating...' : 'Updating...') 
              : (mode === 'create' ? 'Create Company' : 'Update Company')
            }
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
