'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Modern Portal Navigation with Sidebar
 * Requirements: 10.1, 10.3, 10.4
 */
interface ModernPortalNavProps {
  user: {
    name: string
    email: string
  }
  companyName: string
  children: React.ReactNode
}

export default function ModernPortalNav({ user, companyName, children }: ModernPortalNavProps) {
  const pathname = usePathname()
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const navItems = [
    { href: '/portal', label: 'Dashboard', icon: '📊', exact: true },
    { href: '/portal/tickets', label: 'Tickets', icon: '🎫' },
    { href: '/portal/tickets/new', label: 'New Ticket', icon: '➕' },
    { href: '/portal/settings/notifications', label: 'Settings', icon: '⚙️' },
  ]

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href) && href !== '/portal'
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">{companyName}</h1>
              <p className="text-xs text-gray-500">Support Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item.href, item.exact)
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 shadow-sm border border-green-100'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
              {isActive(item.href, item.exact) && (
                <div className="ml-auto w-1.5 h-1.5 bg-green-600 rounded-full"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 mb-3 p-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <span className="mr-2">🚪</span>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {navItems.find(item => isActive(item.href, item.exact))?.label || 'Portal'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Welcome, <span className="font-semibold text-gray-900">{user.name}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
