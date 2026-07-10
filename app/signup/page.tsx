'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * Public self-signup page. Submits an access request that a super-admin reviews.
 * On approval the applicant receives an emailed link to set their password.
 */
export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', firmName: '', note: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          firmName: form.firmName,
          note: form.note || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
        setMessage({ type: 'success', text: data.message || 'Request submitted.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Please check your details and try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Request Access</h1>
            <p className="text-gray-600">
              Ask to join your firm&apos;s support team. We&apos;ll review your request and email you a link to set your password.
            </p>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input id="name" type="text" value={form.name} onChange={update('name')} required
                  placeholder="Jane Doe" className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Work Email</label>
                <input id="email" type="email" value={form.email} onChange={update('email')} required
                  placeholder="you@yourfirm.com" className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="firmName" className="block text-sm font-medium text-gray-700 mb-2">Firm / Company Name</label>
                <input id="firmName" type="text" value={form.firmName} onChange={update('firmName')} required
                  placeholder="Acme Prop Trading" className={inputClass} disabled={isLoading} />
              </div>
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">Anything we should know? (optional)</label>
                <textarea id="note" value={form.note} onChange={update('note')} rows={3}
                  placeholder="Your role, who referred you, etc." className={inputClass} disabled={isLoading} />
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                {isLoading ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}

          <div className="text-center pt-4 border-t border-gray-200">
            <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
