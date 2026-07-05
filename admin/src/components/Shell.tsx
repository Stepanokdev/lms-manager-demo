import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { useStore, type View } from '@/store'
import { cn } from '@/lib/cn'
import type { PublicConfig } from '@/lib/types'
import {
  IconLayers,
  IconGrid,
  IconServer,
  IconAlert,
  IconUsers,
  IconLogout,
} from './icons'

interface NavItem {
  id: View
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <IconGrid /> },
  { id: 'lms', label: 'LMS instances', icon: <IconServer /> },
  { id: 'reports', label: 'Complaints', icon: <IconAlert /> },
  { id: 'admins', label: 'Team', icon: <IconUsers /> },
]

export function Shell({ config, children }: { config: PublicConfig | null; children: ReactNode }) {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const stats = useStore((s) => s.stats)

  const openReports = stats ? stats.new + stats.reviewing : 0
  const hasHigh = (stats?.high_open ?? 0) > 0

  const brandName = config?.provider_name || 'LMS Registry'

  return (
    <div className="flex min-h-[100dvh] w-full bg-canvas">
      {/* Sidebar (lg+) */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <Brand name={brandName} />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={view === item.id}
              badge={item.id === 'reports' ? openReports : 0}
              badgeAlert={item.id === 'reports' && hasHigh}
              onClick={() => setView(item.id)}
            />
          ))}
        </nav>
        <UserChip name={user?.name ?? ''} email={user?.email ?? ''} onLogout={logout} />
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-card/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Brand name={brandName} compact />
          <div className="ml-auto flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'relative flex h-9 w-9 items-center justify-center rounded-md text-lg transition-colors',
                  view === item.id ? 'bg-brand-50 text-brand-600' : 'text-muted hover:text-ink',
                )}
                aria-label={item.label}
              >
                {item.icon}
                {item.id === 'reports' && openReports > 0 && (
                  <span
                    className={cn(
                      'absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full',
                      hasHigh ? 'bg-danger' : 'bg-link',
                    )}
                  />
                )}
              </button>
            ))}
            <button
              onClick={logout}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-lg text-muted hover:text-ink"
              aria-label="Sign out"
            >
              <IconLogout />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

function Brand({ name, compact }: { name: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-white">
        <IconLayers />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-ink">{name}</div>
          <div className="text-[11px] text-muted">Admin console</div>
        </div>
      )}
    </div>
  )
}

function NavButton({
  item,
  active,
  badge,
  badgeAlert,
  onClick,
}: {
  item: NavItem
  active: boolean
  badge: number
  badgeAlert: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-brand-700' : 'text-muted hover:text-ink',
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute inset-0 -z-10 rounded-md border border-brand-100 bg-brand-50"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className={cn('text-lg', active ? 'text-brand-500' : 'text-faint group-hover:text-muted')}>
        {item.icon}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
      {badge > 0 && (
        <span
          className={cn(
            'tnum rounded-full px-1.5 py-0.5 text-[11px] font-bold',
            badgeAlert ? 'bg-danger-bg text-danger' : 'bg-info-bg text-link',
          )}
        >
          {badge}
          {badgeAlert && (
            <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-danger align-middle" />
          )}
        </span>
      )}
    </button>
  )
}

function UserChip({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-line bg-canvas-2 p-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-xs font-bold text-brand-600">
        {name.slice(0, 1).toUpperCase() || 'A'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink">{name || 'Admin'}</div>
        <div className="truncate text-[11px] text-muted">{email}</div>
      </div>
      <button
        onClick={onLogout}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-line/60 hover:text-ink"
        aria-label="Sign out"
      >
        <IconLogout />
      </button>
    </div>
  )
}
