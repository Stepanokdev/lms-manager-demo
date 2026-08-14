import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { OrganizationAdmin } from '@/lib/types'
import { Button, Card, EmptyState, Input, LogoBadge, Pill, Skeleton } from '@/components/ui'
import { IconBuilding, IconExternal, IconSearch } from '@/components/icons'

/**
 * Every provider on this deployment, for the operator who runs it.
 *
 * The one action here is suspension, and it is deliberately the only one: taking
 * a directory offline is reversible and affects nothing else, while editing a
 * provider's platforms for them would be someone else's app changing under them.
 */
export function OrgsView() {
  const pushToast = useStore((s) => s.pushToast)
  const { data, loading, error, reload, setData } = useApiData<OrganizationAdmin[]>(() =>
    api.listOrgs(),
  )
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const rows = (data ?? []).filter((org) => {
    if (!q.trim()) return true
    const needle = q.trim().toLowerCase()
    return (
      org.name.toLowerCase().includes(needle) ||
      org.slug.includes(needle) ||
      org.owner_email.toLowerCase().includes(needle)
    )
  })

  const setActive = async (org: OrganizationAdmin, active: boolean) => {
    setBusyId(org.id)
    try {
      const updated = await api.setOrgActive(org.id, active)
      setData((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev))
      pushToast({
        kind: active ? 'success' : 'info',
        title: active ? `${org.name} restored` : `${org.name} suspended`,
        detail: active
          ? 'Their directory is back at the same address.'
          : 'Their directory now returns nothing. Their platforms are kept.',
      })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Could not update', detail: (e as Error).message })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Organizations</h1>
          <p className="mt-1 text-sm text-muted">
            Every provider on this registry, and the directory each one ships.
          </p>
        </div>
        {data && data.length > 0 && (
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <IconSearch />
            </span>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, address or owner"
              className="pl-9"
              aria-label="Search organizations"
            />
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3">
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[92px]" />)
        ) : error ? (
          <EmptyState
            icon={<IconBuilding />}
            title="Could not load organizations"
            detail={error}
            action={<Button size="sm" onClick={reload}>Try again</Button>}
          />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            icon={<IconBuilding />}
            title="No providers yet"
            detail="Providers sign themselves up from the login screen. The first one to register will appear here with its own directory address."
          />
        ) : rows.length === 0 ? (
          <EmptyState icon={<IconSearch />} title="Nothing matches that" detail={`No organization matches "${q}".`} />
        ) : (
          rows.map((org, i) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.2 }}
            >
              <Card className={cn('p-4', !org.active && 'bg-canvas-2')}>
                <div className="flex flex-wrap items-center gap-4">
                  <LogoBadge name={org.name} logoUrl={org.logo_url || undefined} size={40} />

                  <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink">{org.name}</span>
                      {org.active ? (
                        <Pill tone="emerald">Live</Pill>
                      ) : (
                        <Pill tone="rose">Suspended</Pill>
                      )}
                    </div>
                    <a
                      href={org.directory_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 font-mono text-[12.5px] text-muted transition-colors hover:text-link-hover"
                    >
                      /p/{org.slug} <IconExternal />
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-faint">
                      <span>
                        <span className="tnum text-muted">{org.published_count}</span> of{' '}
                        <span className="tnum text-muted">{org.platform_count}</span> published
                      </span>
                      {org.owner_email && <span>{org.owner_email}</span>}
                      <span>Joined {timeAgo(org.created_at)}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={org.active ? 'subtle' : 'primary'}
                    loading={busyId === org.id}
                    onClick={() => setActive(org, !org.active)}
                  >
                    {org.active ? 'Suspend' : 'Restore'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
