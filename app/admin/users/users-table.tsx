'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResetPasswordModal } from './reset-password-modal'

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

  if (users.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No users found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Create your first user to get started</p>
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
      {users.map((user) => (
        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <td className="px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {user.name}
              </div>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
          </td>
          <td className="px-6 py-4">
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'} className="font-medium">
              {user.role}
            </Badge>
          </td>
          <td className="px-6 py-4">
            <div className="text-sm text-gray-900 dark:text-white font-medium">
              {user.company?.name || '-'}
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="text-sm text-gray-900 dark:text-white font-medium">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </td>
          <td className="px-6 py-4 text-right">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetting({ id: user.id, name: user.name })}
            >
              🔑 Reset Password
            </Button>
          </td>
        </tr>
      ))}
    </>
  )
}
