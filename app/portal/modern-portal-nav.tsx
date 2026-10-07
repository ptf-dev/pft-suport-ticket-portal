'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Ticket, Plus, Settings, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import type { BuildInfo } from '@/lib/build-info'

interface ModernPortalNavProps {
  user: { name: string; email: string }
  companyName: string
  build: BuildInfo
  banner?: React.ReactNode
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/portal/tickets', label: 'Tickets', icon: Ticket },
  { href: '/portal/tickets/new', label: 'New ticket', icon: Plus },
  { href: '/portal/settings/notifications', label: 'Settings', icon: Settings },
]

const COLLAPSE_KEY = 'pft.portalSidebarCollapsed'

export default function ModernPortalNav({ user, companyName, build, banner, children }: ModernPortalNavProps) {
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

  // Longest matching href wins, so /portal/tickets/new lights up "New ticket" rather than "Tickets".
  const current = NAV_ITEMS
    .filter((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href)))
    .sort((a, b) => b.href.length - a.href.length)[0]

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
            href="/portal"
            className={cn('flex items-center gap-3 group min-w-0', collapsed && 'md:hidden')}
            onClick={() => setOpen(false)}
          >
            <div className="w-9 h-9 bg-ink text-bg rounded-lg flex items-center justify-center font-display text-lg tracking-tightest shadow-ink shrink-0">
              {companyName.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-display text-lg text-ink tracking-tightest truncate">{companyName}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute truncate">Support portal</div>
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
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">Support</span>
          </div>
          {NAV_ITEMS.map((item) => {
            const active = current?.href === item.href
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
          <Link href="/portal/tickets/new" onClick={() => setOpen(false)} className={cn('block', collapsed && 'md:hidden')}>
            <Button variant="accent" size="sm" className="w-full gap-2">
              <Plus className="w-4 h-4" /> New ticket
            </Button>
          </Link>
          <div className={cn('px-1', collapsed && 'md:hidden')}>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint"
              title={[build.commit && `Commit ${build.commit}`, build.time && `Built ${build.time}`].filter(Boolean).join(' · ') || undefined}
            >
              v{build.version}{build.month && ` · ${build.month}`} · {process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        {banner}
        <header className="h-16 bg-bg-elev border-b border-line flex items-center justify-between px-3 md:px-8 shrink-0 safe-pt pr-[max(0.75rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 -ml-2 hover:bg-mute rounded-md text-ink-soft shrink-0"
              aria-label="Toggle sidebar"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-mute truncate">Client portal</div>
              <h1 className="font-display text-lg md:text-xl tracking-tightest text-ink leading-none mt-0.5 truncate">
                {current?.label ?? 'Portal'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-xs shrink-0">
            <span className="hidden lg:inline font-mono uppercase tracking-widest text-ink-mute truncate max-w-[200px]">{companyName}</span>
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

        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-8 bg-dots pb-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
