import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api, ApiError, type LMSQuery } from '@/lib/api'
import { useStore } from '@/store'
import { timeAgo, hostOf } from '@/lib/format'
import type { LMS } from '@/lib/types'
import {
  Card,
  Button,
  Pill,
  Input,
  Skeleton,
  EmptyState,
  LogoBadge,
} from '@/components/ui'
import {
  IconSearch,
  IconServer,
  IconRefresh,
  IconStar,
  IconEye,
  IconEyeOff,
  IconEdit,
  IconCheck,
  IconExternal,
  IconSignal,
  IconShield,
} from '@/components/icons'

type FilterKey = 'all' | 'rereview' | 'public' | 'hidden' | 'featured' | 'unreviewed' | 'pending'
const FILTERS: { key: FilterKey; label: string; query: LMSQuery }[] = [
  { key: 'all', label: 'All', query: {} },
  { key: 'rereview', label: 'Re-review requested', query: { review_requested: true } },
  { key: 'unreviewed', label: 'Needs review', query: { reviewed: false, status_filter: 'approved' } },
  { key: 'featured', label: 'Featured', query: { featured: true } },
  { key: 'public', label: 'Public', query: { visibility: 'public' } },
  { key: 'hidden', label: 'Hidden', query: { visibility: 'hidden' } },
  { key: 'pending', label: 'Pending', query: { status_filter: 'pending' } },
]

const PAGE = 25

export function LMSView() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [items, setItems] = useState<LMS[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])

  const baseQuery = useCallback(
    (offset: number): LMSQuery => ({
      ...FILTERS.find((f) => f.key === filter)!.query,
      q: q || undefined,
      limit: PAGE,
      offset,
    }),
    [filter, q],
  )

  const reqId = useRef(0)

  const load = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError(null)
    try {
      const rows = await api.listLMS(baseQuery(0))
      if (id !== reqId.current) return
      setItems(rows)
      setHasMore(rows.length === PAGE)
    } catch (e) {
      if (id !== reqId.current) return
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      if (id === reqId.current) setLoading(false)
    }
  }, [baseQuery])

  useEffect(() => {
    load()
  }, [load])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const rows = await api.listLMS(baseQuery(items.length))
      setItems((prev) => [...prev, ...rows])
      setHasMore(rows.length === PAGE)
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false)
    }
  }

  const patchItem = (updated: LMS) =>
    setItems((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">LMS instances</h1>
          <p className="mt-1 text-sm text-muted">
            Every registered Open edX platform. Search, verify, and control catalog placement.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load}>
          <IconRefresh /> Refresh
        </Button>
      </header>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-muted">
            <IconSearch />
          </span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by name, platform, or URL…"
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ' +
                (filter === f.key
                  ? 'border-brand-500/40 bg-brand-50 text-brand-700'
                  : 'border-line text-muted hover:text-ink-soft')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[74px]" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<IconServer />} title="Could not load instances" detail={error} action={<Button size="sm" onClick={load}>Try again</Button>} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconSearch />}
          title="No instances match"
          detail={q ? `Nothing found for “${q}”.` : 'No LMS instances in this view yet.'}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map((lms) => (
                <LMSRow key={lms.id} lms={lms} onChange={patchItem} />
              ))}
            </AnimatePresence>
          </div>
          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button variant="ghost" size="sm" loading={loadingMore} onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LMSRow({ lms, onChange }: { lms: LMS; onChange: (l: LMS) => void }) {
  const pushToast = useStore((s) => s.pushToast)
  const [rechecking, setRechecking] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const wrap = async (key: string, fn: () => Promise<LMS>, ok?: string) => {
    setBusy(key)
    try {
      const updated = await fn()
      onChange(updated)
      if (ok) pushToast({ kind: 'success', title: ok })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Action failed', detail: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  const recheck = async () => {
    setRechecking(true)
    try {
      const updated = await api.recheckLMS(lms.id)
      onChange(updated)
      pushToast({
        kind: updated.last_health_ok ? 'success' : 'error',
        title: updated.last_health_ok ? `${lms.name} is reachable` : `${lms.name} has a problem`,
        detail: updated.last_health_note,
      })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Recheck failed', detail: (e as Error).message })
    } finally {
      setRechecking(false)
    }
  }

  const statusTone = lms.status === 'approved' ? 'emerald' : lms.status === 'pending' ? 'amber' : 'rose'
  const healthColor =
    lms.last_health_ok === null ? 'bg-faint' : lms.last_health_ok ? 'bg-success' : 'bg-danger'

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <LogoBadge name={lms.name} accent={lms.accent_color} logoUrl={lms.logo_upload_url || lms.logo_url || undefined} />

          <div className="min-w-[200px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{lms.name}</span>
              {lms.featured && (
                <span className="text-warning" title="Featured in curated mode">
                  <IconStar />
                </span>
              )}
              {lms.admin_reviewed ? (
                <Pill tone="emerald">
                  <IconCheck /> Reviewed
                </Pill>
              ) : (
                <Pill tone="amber">Unreviewed</Pill>
              )}
              {lms.review_requested_at && lms.status === 'rejected' && (
                <Pill tone="cyan">Re-review requested</Pill>
              )}
            </div>
            <a
              href={lms.base_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted hover:text-link-hover"
            >
              {hostOf(lms.base_url)} <IconExternal />
            </a>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px]">
              <Pill tone={statusTone}>{lms.status === 'rejected' ? 'blocked' : lms.status}</Pill>
              <Pill tone={lms.visibility === 'public' ? 'sky' : 'slate'}>
                {lms.visibility === 'public' ? <IconEye /> : <IconEyeOff />} {lms.visibility}
              </Pill>
              <span className="flex items-center gap-1.5 text-muted">
                <span className={`h-2 w-2 rounded-full ${healthColor}`} />
                {lms.last_checked_at ? `checked ${timeAgo(lms.last_checked_at)}` : 'not checked'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <IconBtn label="Recheck health" loading={rechecking} onClick={recheck}>
              <IconSignal />
            </IconBtn>
            <IconBtn
              label={lms.featured ? 'Unfeature' : 'Feature in curated mode'}
              active={lms.featured}
              loading={busy === 'feat'}
              onClick={() => wrap('feat', () => api.updateLMS(lms.id, { featured: !lms.featured }), lms.featured ? 'Removed from featured' : 'Added to featured')}
            >
              <IconStar />
            </IconBtn>
            <IconBtn
              label={lms.visibility === 'public' ? 'Hide from search' : 'Make public'}
              loading={busy === 'vis'}
              onClick={() =>
                wrap(
                  'vis',
                  () => api.updateLMS(lms.id, { visibility: lms.visibility === 'public' ? 'hidden' : 'public' }),
                  lms.visibility === 'public' ? 'Hidden from search' : 'Now public',
                )
              }
            >
              {lms.visibility === 'public' ? <IconEye /> : <IconEyeOff />}
            </IconBtn>
            <IconBtn
              label={lms.admin_reviewed ? 'Mark unreviewed' : 'Mark reviewed'}
              active={lms.admin_reviewed}
              loading={busy === 'rev'}
              onClick={() => wrap('rev', () => api.reviewLMS(lms.id, !lms.admin_reviewed), lms.admin_reviewed ? 'Marked unreviewed' : 'Marked reviewed')}
            >
              <IconCheck />
            </IconBtn>
            <IconBtn
              label={lms.status === 'rejected' ? 'Restore to catalog' : 'Block (remove from catalog)'}
              active={lms.status === 'rejected'}
              loading={busy === 'block'}
              onClick={() =>
                wrap(
                  'block',
                  () => (lms.status === 'rejected' ? api.unblockLMS(lms.id) : api.blockLMS(lms.id)),
                  lms.status === 'rejected' ? 'Restored to catalog' : 'Blocked',
                )
              }
            >
              <IconShield />
            </IconBtn>
            <a
              href={`/wizard/?edit=${lms.id}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Edit in the wizard"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-canvas-2 hover:text-ink"
            >
              <IconEdit />
            </a>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  loading,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  loading?: boolean
  active?: boolean
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={loading}
      className={
        'flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors active:scale-95 disabled:opacity-50 ' +
        (active
          ? 'border-brand-500/40 bg-brand-50 text-link'
          : 'border-line text-muted hover:bg-canvas-2 hover:text-ink')
      }
    >
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  )
}
