'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

function apply(theme: Theme) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme | null) ?? 'system'
    setTheme(saved)
    setMounted(true)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if ((localStorage.getItem('theme') as Theme | null) === 'system' || !localStorage.getItem('theme')) {
        apply('system')
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const set = (t: Theme) => {
    setTheme(t)
    if (t === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', t)
    apply(t)
  }

  if (!mounted) {
    return <div className={cn('inline-flex rounded-md border border-line', compact ? 'h-7' : 'h-8', 'w-[88px]')} />
  }

  const btn = (t: Theme, Icon: typeof Sun, label: string) => (
    <button
      key={t}
      type="button"
      onClick={() => set(t)}
      title={label}
      aria-label={label}
      className={cn(
        'flex items-center justify-center transition-colors rounded',
        compact ? 'h-6 w-7' : 'h-7 w-8',
        theme === t
          ? 'bg-ink text-bg'
          : 'text-ink-mute hover:text-ink',
      )}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    </button>
  )

  return (
    <div className={cn(
      'inline-flex items-center gap-0.5 rounded-md border border-line bg-bg-elev p-0.5',
      compact ? 'h-7' : 'h-8',
    )}>
      {btn('light', Sun, 'Light')}
      {btn('system', Monitor, 'Auto')}
      {btn('dark', Moon, 'Dark')}
    </div>
  )
}
