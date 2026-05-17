'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => signOut({ callbackUrl: '/login' })

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
    <div className="flex h-dvh bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static top-0 left-0 w-[85vw] max-w-xs md:w-64 h-dvh bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm z-50 transform transition-transform duration-300 ease-in-out safe-pl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700 shrink-0 safe-pt">
          <Link href="/portal" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <span className="text-white text-lg font-bold">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{companyName}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">PFT Support Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overscroll-contain">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item.href, item.exact)
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 text-green-700 dark:text-green-300 shadow-sm border border-green-100 dark:border-green-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
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

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 safe-pb">
          <div className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shrink-0">
              <span className="text-white font-bold text-sm">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 md:px-8 shadow-sm shrink-0 safe-pt safe-pr">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              {navItems.find(item => isActive(item.href, item.exact))?.label || 'Portal'}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
              Welcome, <span className="font-semibold text-gray-900 dark:text-gray-100">{user.name}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9 px-2.5 md:px-3 hover:bg-red-50 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-300 hover:border-red-200 dark:hover:border-red-700 transition-colors"
              aria-label="Logout"
            >
              <span className="md:mr-1.5">🚪</span>
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 md:p-8 safe-pb safe-pr">
          {children}
        </main>
      </div>
    </div>
  )
}
