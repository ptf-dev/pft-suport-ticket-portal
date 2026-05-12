'use client'

import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Ticket, Building2, Users, Settings, LogOut, Menu, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModernAdminNavProps {
  user: { name: string; email: string }
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings/smtp', label: 'SMTP', icon: Settings },
]

export default function ModernAdminNav({ user, children }: ModernAdminNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const current = NAV_ITEMS.find((i) => isActive(i.href, i.exact))

  return (
    <div className="flex h-screen bg-bg">
      {open && (
        <div className="fixed inset-0 bg-ink/40 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed md:static w-64 h-screen bg-bg-elev border-r border-line flex flex-col z-50 transform transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="h-16 flex items-center px-5 border-b border-line">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-ink text-bg rounded-lg flex items-center justify-center font-display text-lg tracking-tightest shadow-ink">
              P
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg text-ink tracking-tightest">PropFirmsTech</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">Ops console</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">Workspace</span>
          </div>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-ink text-bg font-medium'
                    : 'text-ink-soft hover:text-ink hover:bg-mute',
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-bg' : 'text-ink-mute group-hover:text-ink')} strokeWidth={1.75} />
                <span className="tracking-tight">{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-line">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-full bg-ink text-bg flex items-center justify-center font-medium text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{user.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute truncate">{user.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-16 bg-bg-elev border-b border-line flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 hover:bg-mute rounded-md text-ink-soft"
              aria-label="Toggle sidebar"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute">
                {current?.label === 'Overview' ? 'Command center' : 'Operations'}
              </div>
              <h1 className="font-display text-xl tracking-tightest text-ink leading-none mt-0.5">
                {current?.label ?? 'Admin'}
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-pulse" />
            </span>
            <span className="font-mono uppercase tracking-widest text-ink-mute">Live</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-8 bg-dots">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
