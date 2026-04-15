'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Link from 'next/link'

interface FormErrors {
  name?: string[]
  email?: string[]
  password?: string[]
  role?: string[]
  companyId?: string[]
  general?: string
}

interface Company {
  id: string
  name: string
}

interface UserFormProps {
  companies: Company[]
}

export function UserForm({ companies }: UserFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedRole, setSelectedRole] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as string,
      companyId: formData.get('companyId') as string || null,
    }

    // Client-side validation
    const clientErrors: FormErrors = {}
    if (!data.name?.trim()) {
      clientErrors.name = ['Name is required']
    }
    if (!data.email?.trim()) {
      clientErrors.email = ['Email is required']
    }
    if (!data.password?.trim()) {
      clientErrors.password = ['Password is required']
    }
    if (!data.role) {
      clientErrors.role = ['Role is required']
    }
    if (data.role === 'CLIENT' && !data.companyId) {
      clientErrors.companyId = ['Company is required for CLIENT users']
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/admin/users', {
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
          setErrors({ general: errorData.error || 'Failed to create user' })
        }
        setIsSubmitting(false)
        return
      }

      // Success - redirect to users list
      router.push('/admin/users')
      router.refresh()
    } catch (error) {
      console.error('Error creating user:', error)
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
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              required
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email[0]}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password[0]}</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select
              id="role"
              name="role"
              required
              disabled={isSubmitting}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Select a role</option>
              <option value="ADMIN">Admin</option>
              <option value="CLIENT">Client</option>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role[0]}</p>
            )}
          </div>

          {/* Company (conditional - only for CLIENT role) */}
          {selectedRole === 'CLIENT' && (
            <div className="space-y-2">
              <Label htmlFor="companyId">
                Company <span className="text-red-500">*</span>
              </Label>
              <Select
                id="companyId"
                name="companyId"
                required={selectedRole === 'CLIENT'}
                disabled={isSubmitting}
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
              {errors.companyId && (
                <p className="text-sm text-red-600">{errors.companyId[0]}</p>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Link href="/admin/users">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create User'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
