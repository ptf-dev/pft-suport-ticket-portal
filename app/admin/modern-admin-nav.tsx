'use client'

import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Ticket, Building2, Users, Settings, LogOut, Menu, X,
  Rocket, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

interface ModernAdminNavProps {
  user: { name: string; email: string }
  version: string
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { href: '/admin/sprints', label: 'Sprints', icon: Rocket },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings/smtp', label: 'SMTP', icon: Settings },
]

const COLLAPSE_KEY = 'pft.sidebarCollapsed'

export default function ModernAdminNav({ user, version, children }: ModernAdminNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
    } catch { /* ignore */ }
  }, [])

  const toggleCollapse = () =>
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const current = NAV_ITEMS.find((i) => isActive(i.href, i.exact))

  const handleSignOut = () => signOut({ callbackUrl: '/login' })

  return (
    <div className="flex h-dvh bg-bg overflow-hidden">
      {open && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed md:static top-0 left-0 w-[85vw] max-w-xs h-dvh bg-bg-elev border-r border-line flex flex-col z-50 transform transition-all duration-300 safe-pl',
          collapsed ? 'md:w-16' : 'md:w-72',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className={cn('h-16 flex items-center border-b border-line shrink-0 safe-pt', collapsed ? 'md:px-0 px-5' : 'px-5')}>
          <Link
            href="/admin"
            className={cn('flex items-center gap-3 group min-w-0', collapsed && 'md:hidden')}
            onClick={() => setOpen(false)}
          >
            <div className="w-9 h-9 bg-ink text-bg rounded-lg flex items-center justify-center font-display text-lg tracking-tightest shadow-ink shrink-0">
              P
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-display text-lg text-ink tracking-tightest truncate">PropFirmsTech</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute truncate">Ticket portal</div>
            </div>
          </Link>
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'hidden md:inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-mute hover:text-ink hover:bg-mute transition-colors shrink-0',
              collapsed ? 'md:mx-auto' : 'ml-auto',
            )}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto overscroll-contain">
          <div className={cn('px-3 pb-2', collapsed && 'md:hidden')}>
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
                title={collapsed ? item.label : undefined}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  collapsed && 'md:justify-center md:gap-0 md:px-0',
                  active
                    ? 'bg-ink text-bg font-medium'
                    : 'text-ink-soft hover:text-ink hover:bg-mute',
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-bg' : 'text-ink-mute group-hover:text-ink')} strokeWidth={1.75} />
                <span className={cn('tracking-tight', collapsed && 'md:hidden')}>{item.label}</span>
                {active && <span className={cn('ml-auto h-1.5 w-1.5 rounded-full bg-accent', collapsed && 'md:hidden')} />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-line shrink-0 safe-pb space-y-2">
          <div className={cn('flex items-center gap-3 px-2 py-2 rounded-md bg-mute/40', collapsed && 'md:px-0 md:gap-0 md:justify-center')}>
            <div className="w-9 h-9 rounded-full bg-ink text-bg flex items-center justify-center font-medium text-sm shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className={cn('flex-1 min-w-0', collapsed && 'md:hidden')}>
              <div className="text-sm font-medium text-ink truncate">{user.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-mute truncate">{user.email}</div>
            </div>
            <span className={cn('relative flex h-1.5 w-1.5 shrink-0', collapsed && 'md:hidden')} title="Online">
              <span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pulse" />
            </span>
          </div>
          <div className={cn('px-1', collapsed && 'md:hidden')}>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">v{version} · production</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <header className="h-16 bg-bg-elev border-b border-line flex items-center justify-between px-3 md:px-8 shrink-0 safe-pt safe-pr">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 -ml-2 hover:bg-mute rounded-md text-ink-soft shrink-0"
              aria-label="Toggle sidebar"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute truncate">
                {current?.label === 'Overview' ? 'Command center' : 'Operations'}
              </div>
              <h1 className="font-display text-lg md:text-xl tracking-tightest text-ink leading-none mt-0.5 truncate">
                {current?.label ?? 'Admin'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-xs shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pulse" />
              </span>
              <span className="font-mono uppercase tracking-widest text-ink-mute">Live</span>
            </div>
            <ThemeToggle compact />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="h-9 px-2.5 md:px-3"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5 md:mr-1.5" />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-8 bg-dots safe-pb safe-pr">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
