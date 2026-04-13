'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

/**
 * Portal navigation component
 * Requirements: 10.1, 10.4
 */
interface PortalNavProps {
  user: {
    name: string
    email: string
  }
  companyName: string
}

export default function PortalNav({ user, companyName }: PortalNavProps) {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">
              {companyName} Support Portal
            </h1>
            <div className="hidden md:flex space-x-4">
              <a
                href="/portal"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </a>
              <a
                href="/portal/tickets"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Tickets
              </a>
              <a
                href="/portal/tickets/new"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                New Ticket
              </a>
              <a
                href="/portal/settings/notifications"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Settings
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
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">{companyName}</div>
            </div>
           
          </div>
        </div>
      </div>
    </nav>
  )
}
