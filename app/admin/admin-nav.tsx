'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

/**
 * Admin navigation component
 * Requirements: 10.2, 10.4
 */
interface AdminNavProps {
  user: {
    name: string
    email: string
  }
}

export default function AdminNav({ user }: AdminNavProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">
              PropFirmsTech Admin
            </h1>
            <div className="hidden md:flex space-x-4">
              <a
                href="/admin"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/admin/companies"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Companies
              </a>
              <a
                href="/admin/users"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Users
              </a>
              <a
                href="/admin/tickets"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Tickets
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              Logout
            </Button>
            <span className="text-sm text-gray-700">{user.name}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
