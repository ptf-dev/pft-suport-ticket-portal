'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Login form component that uses useSearchParams
 */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tenantInfo, setTenantInfo] = useState<{ name: string; subdomain: string } | null>(null)

  // Fetch tenant information on mount
  useEffect(() => {
    async function fetchTenantInfo() {
      try {
        const response = await fetch('/api/tenant-info')
        if (response.ok) {
          const data = await response.json()
          setTenantInfo(data)
        }
      } catch (err) {
        console.error('Failed to fetch tenant info:', err)
      }
    }
    fetchTenantInfo()
  }, [])

  // Check for error in URL params (from NextAuth)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError('Invalid email or password')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Get tenant ID from the tenant info
      const tenantId = tenantInfo?.subdomain || ''

      const result = await signIn('credentials', {
        email,
        password,
        tenantId,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        setIsLoading(false)
      } else if (result?.ok) {
        // Successful login - NextAuth will handle the redirect via callbacks
        // But we need to manually redirect based on role
        // Fetch session to determine role
        const sessionResponse = await fetch('/api/auth/session')
        const session = await sessionResponse.json()

        if (session?.user?.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/portal')
        }
      }
    } catch (err) {
      setError('An error occurred during login')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary-500">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            {tenantInfo ? tenantInfo.name : 'PropFirmsTech'}
          </CardTitle>
          <CardDescription className="text-center text-base dark:text-gray-400">
            Sign in to access your support portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-sm">
                <div className="flex items-center">
                  <span className="text-xl mr-2">⚠️</span>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 text-base"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>🔐</span>
                  <span>Sign In</span>
                </span>
              )}
            </Button>
          </form>

          {tenantInfo && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Accessing: <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{tenantInfo.subdomain}.propfirmstech.com</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Login page with tenant-specific branding
 * 
 * This page:
 * - Extracts tenant from subdomain for scoped login
 * - Displays email/password form
 * - Shows validation errors for invalid credentials
 * - Uses the new design system components
 * 
 * Requirements: 1.3, 1.4, 1.5
 */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
