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
  IconBuilding,
  IconLink,
} from './icons'

export interface NavItem {
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

/** Portal mode: the operator also runs the tenants themselves. */
const OPERATOR_PORTAL_NAV: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <IconGrid /> },
  { id: 'orgs', label: 'Organizations', icon: <IconBuilding /> },
  { id: 'lms', label: 'All platforms', icon: <IconServer /> },
  { id: 'admins', label: 'Team', icon: <IconUsers /> },
]

/** What a provider sees: their shelf, their address, their details. */
export const PROVIDER_NAV: NavItem[] = [
  { id: 'platforms', label: 'Platforms', icon: <IconServer /> },
  { id: 'appconfig', label: 'App config', icon: <IconLink /> },
  { id: 'organization', label: 'Organization', icon: <IconBuilding /> },
]

export function Shell({
  config,
  children,
  nav: navOverride,
  subtitle,
  brand,
}: {
  config: PublicConfig | null
  children: ReactNode
  nav?: NavItem[]
  subtitle?: string
  brand?: string
}) {
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const stats = useStore((s) => s.stats)

  const openReports = stats ? stats.new + stats.reviewing : 0
  const hasHigh = (stats?.high_open ?? 0) > 0

  const brandName = brand || config?.provider_name || 'LMS Registry'
  // Curated (institution) mode has no learner reports, so drop the Complaints tab.
  const isCurated = config?.directory_mode === 'curated'
  const isPortal = config?.directory_mode === 'portal'
  const defaultNav = isPortal
    ? OPERATOR_PORTAL_NAV
    : isCurated
      ? NAV.filter((item) => item.id !== 'reports')
      : NAV
  const nav = navOverride ?? defaultNav

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-canvas">
      {/* Sidebar (lg+) */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <Brand name={brandName} subtitle={subtitle} />
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.map((item) => (
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

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: brand + sign out (navigation lives in the bottom bar) */}
        <header className="flex shrink-0 items-center gap-3 border-b border-line bg-card px-4 py-3 lg:hidden">
          <Brand name={brandName} subtitle={subtitle} />
          <button
            onClick={logout}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-lg text-muted transition-colors hover:bg-canvas-2 hover:text-ink"
            aria-label="Sign out"
          >
            <IconLogout />
          </button>
        </header>

        {/* The one scroll container — content scrolls here on every screen size. */}
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        {/* Mobile bottom nav: thumb-friendly, labeled tabs */}
        <nav className="flex shrink-0 items-stretch border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
          {nav.map((item) => (
            <MobileTab
              key={item.id}
              item={item}
              active={view === item.id}
              alert={item.id === 'reports' && openReports > 0}
              alertHigh={item.id === 'reports' && hasHigh}
              onClick={() => setView(item.id)}
            />
          ))}
        </nav>
      </div>
    </div>
  )
}

function MobileTab({
  item,
  active,
  alert,
  alertHigh,
  onClick,
}: {
  item: NavItem
  active: boolean
  alert: boolean
  alertHigh: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
        active ? 'text-brand-600' : 'text-muted hover:text-ink',
      )}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
    >
      <span className="relative text-xl">
        {item.icon}
        {alert && (
          <span className={cn('absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full', alertHigh ? 'bg-danger' : 'bg-link')} />
        )}
      </span>
      {item.label}
    </button>
  )
}

function Brand({ name, compact, subtitle }: { name: string; compact?: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-500 text-white">
        <IconLayers />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-ink">{name}</div>
          <div className="text-[11px] text-muted">{subtitle || 'Admin console'}</div>
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
