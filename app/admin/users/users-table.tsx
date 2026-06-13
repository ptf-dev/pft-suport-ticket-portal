'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, KeyRound, UserRound } from 'lucide-react'
import { ResetPasswordModal } from './reset-password-modal'
import { EditEmailModal } from './edit-email-modal'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CLIENT'
  createdAt: Date
  company: { name: string } | null
}

export function UsersTable({ users }: { users: User[] }) {
  const [resetting, setResetting] = useState<{ id: string; name: string } | null>(null)
  const [editingEmail, setEditingEmail] = useState<{ id: string; name: string; email: string } | null>(null)

  if (users.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <UserRound className="w-10 h-10 text-ink-faint" strokeWidth={1.2} />
            <p className="font-display text-2xl tracking-tightest text-ink">No users yet.</p>
            <p className="text-xs text-ink-mute">Create your first user to get started.</p>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      {resetting && (
        <ResetPasswordModal
          userId={resetting.id}
          userName={resetting.name}
          onClose={() => setResetting(null)}
        />
      )}
      {editingEmail && (
        <EditEmailModal
          userId={editingEmail.id}
          userName={editingEmail.name}
          currentEmail={editingEmail.email}
          onClose={() => setEditingEmail(null)}
        />
      )}
      {users.map((user) => (
        <tr key={user.id} className="group hover:bg-bg-sunken transition-colors">
          <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-ink text-bg flex items-center justify-center font-display text-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm font-medium text-ink truncate">{user.name}</div>
            </div>
          </td>
          <td className="px-4 py-3.5 text-sm text-ink-soft">{user.email}</td>
          <td className="px-4 py-3.5">
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
          </td>
          <td className="px-4 py-3.5 text-sm text-ink-soft">{user.company?.name || <span className="text-ink-faint">—</span>}</td>
          <td className="px-4 py-3.5 text-sm text-ink-soft tabular-nums">
            {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </td>
          <td className="px-4 py-3.5 text-right">
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditingEmail({ id: user.id, name: user.name, email: user.email })}>
                <Mail className="w-3.5 h-3.5" /> Change email
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setResetting({ id: user.id, name: user.name })}>
                <KeyRound className="w-3.5 h-3.5" /> Reset password
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}
