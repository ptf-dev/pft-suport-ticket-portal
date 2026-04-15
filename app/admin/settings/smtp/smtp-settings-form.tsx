'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SmtpFormData {
  host: string
  port: number
  secure: boolean
  username: string
  senderEmail: string
  senderName: string
  isActive: boolean
}

interface Props {
  initialData: SmtpFormData | null
}

export function SmtpSettingsForm({ initialData }: Props) {
  const [form, setForm] = useState({
    host: initialData?.host ?? '',
    port: initialData?.port ?? 587,
    secure: initialData?.secure ?? false,
    username: initialData?.username ?? '',
    password: '',
    senderEmail: initialData?.senderEmail ?? '',
    senderName: initialData?.senderName ?? '',
    isActive: initialData?.isActive ?? true,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const set = (key: keyof typeof form, value: string | number | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save settings' })
      } else {
        setMessage({ type: 'success', text: 'SMTP settings saved successfully' })
        setForm(prev => ({ ...prev, password: '' })) // clear password field after save
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error, please try again' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      })
      const data = await res.json()
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message ?? (data.success ? 'Test email sent!' : 'Test failed'),
      })
    } catch {
      setMessage({ type: 'error', text: 'Network error during test' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Host */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="host">SMTP Host <span className="text-red-500">*</span></Label>
          <Input id="host" value={form.host} onChange={e => set('host', e.target.value)}
            placeholder="smtp.gmail.com" required disabled={saving} />
        </div>

        {/* Port */}
        <div className="space-y-1.5">
          <Label htmlFor="port">Port <span className="text-red-500">*</span></Label>
          <Input id="port" type="number" value={form.port}
            onChange={e => set('port', parseInt(e.target.value) || 587)}
            placeholder="587" required disabled={saving} />
        </div>

        {/* Secure */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.secure}
              onChange={e => set('secure', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Use SSL/TLS (port 465)
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">Uncheck for STARTTLS (port 587)</p>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="username">Username / Email <span className="text-red-500">*</span></Label>
          <Input id="username" value={form.username} onChange={e => set('username', e.target.value)}
            placeholder="you@gmail.com" required disabled={saving} />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">
            Password {!initialData && <span className="text-red-500">*</span>}
            {initialData && <span className="text-xs text-gray-400 ml-1">(leave blank to keep existing)</span>}
          </Label>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'}
              value={form.password} onChange={e => set('password', e.target.value)}
              placeholder={initialData ? '••••••••' : 'Enter password'}
              disabled={saving} className="pr-10" />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {/* Sender Email */}
        <div className="space-y-1.5">
          <Label htmlFor="senderEmail">Sender Email <span className="text-red-500">*</span></Label>
          <Input id="senderEmail" type="email" value={form.senderEmail}
            onChange={e => set('senderEmail', e.target.value)}
            placeholder="support@yourdomain.com" required disabled={saving} />
          <p className="text-xs text-gray-500 dark:text-gray-400">Admin notifications will also go to this address</p>
        </div>

        {/* Sender Name */}
        <div className="space-y-1.5">
          <Label htmlFor="senderName">Sender Name <span className="text-red-500">*</span></Label>
          <Input id="senderName" value={form.senderName} onChange={e => set('senderName', e.target.value)}
            placeholder="PropFirmsTech Support" required disabled={saving} />
        </div>

        {/* Active toggle */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isActive}
              onChange={e => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable email notifications (activate SMTP)
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={saving || testing}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
        <Button type="button" variant="outline" onClick={handleTest} disabled={saving || testing}>
          {testing ? 'Testing…' : '🔌 Test Connection'}
        </Button>
      </div>
    </form>
  )
}
