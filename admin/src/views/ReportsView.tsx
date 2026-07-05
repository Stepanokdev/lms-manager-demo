import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { useStore } from '@/store'
import { timeAgo, hostOf } from '@/lib/format'
import type { Report, ReportStatus, Severity, ReportCategory, AffectedLMS } from '@/lib/types'
import {
  Card,
  Button,
  Pill,
  SeverityMark,
  LogoBadge,
  Skeleton,
  EmptyState,
} from '@/components/ui'
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_TONE, PLATFORM_LABEL } from './reportMeta'
import {
  IconAlert,
  IconRefresh,
  IconCheck,
  IconX,
  IconExternal,
  IconMail,
  IconMobile,
  IconClock,
  IconShield,
  IconLayers,
} from '@/components/icons'

type Filter = ReportStatus | 'all'
const FILTERS: Filter[] = ['new', 'reviewing', 'blocked', 'dismissed', 'all']
const SEVERITIES: (Severity | 'all')[] = ['all', 'high', 'medium', 'low']
const CATEGORIES: (ReportCategory | 'all')[] = ['all', 'inappropriate', 'scam', 'impersonation', 'spam', 'broken', 'other']

const PAGE = 100

export function ReportsView() {
  const [filter, setFilter] = useState<Filter>('new')
  const [severity, setSeverity] = useState<Severity | 'all'>('all')
  const [category, setCategory] = useState<ReportCategory | 'all'>('all')
  const [lmsFilter, setLmsFilter] = useState<{ id: number; name: string } | null>(null)
  const [grouped, setGrouped] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const stats = useStore((s) => s.stats)
  const refreshStats = useStore((s) => s.refreshStats)
  const { data, loading, error, reload } = useApiData<Report[]>(
    () =>
      api.listReports({
        status: filter === 'all' ? undefined : filter,
        severity: severity === 'all' ? undefined : severity,
        category: category === 'all' ? undefined : category,
        lms_id: lmsFilter?.id,
        limit,
      }),
    [filter, severity, category, lmsFilter, limit],
  )
  const resetPage = () => setLimit(PAGE)
  const hasMore = !!data && data.length === limit

  const afterChange = () => {
    reload()
    refreshStats()
  }

  const drillIntoLms = (id: number, name: string) => {
    setGrouped(false)
    setFilter('all')
    setSeverity('all')
    setCategory('all')
    setLmsFilter({ id, name })
  }

  const counts: Record<Filter, number | null> = {
    new: stats?.new ?? null,
    reviewing: stats?.reviewing ?? null,
    blocked: stats?.blocked ?? null,
    dismissed: stats?.dismissed ?? null,
    all: stats?.total ?? null,
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Complaints</h1>
          <p className="mt-1 text-sm text-muted">
            Learners flag platforms that shouldn't be in the catalog. Open the LMS to check, then
            block it or dismiss the report.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={grouped ? 'primary' : 'ghost'} size="sm" onClick={() => setGrouped((g) => !g)}>
            <IconLayers /> {grouped ? 'Grouped by platform' : 'Group by platform'}
          </Button>
          <Button variant="ghost" size="sm" onClick={reload}>
            <IconRefresh /> Refresh
          </Button>
        </div>
      </header>

      {grouped ? (
        <GroupedInbox onOpen={drillIntoLms} onChange={afterChange} />
      ) : (
        <>
          {lmsFilter && (
            <div className="flex items-center gap-2 rounded-md border border-brand-500/30 bg-brand-50 px-3.5 py-2 text-[13px] text-brand-700">
              Showing complaints for <span className="font-semibold">{lmsFilter.name}</span>
              <button className="ml-auto text-muted hover:text-ink" onClick={() => setLmsFilter(null)}>
                Clear
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => {
                  resetPage()
                  setFilter(f)
                }}
                className={
                  'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ' +
                  (filter === f
                    ? 'border-brand-500/40 bg-brand-50 text-brand-700'
                    : 'border-line text-muted hover:text-ink-soft')
                }
              >
                {f === 'all' ? 'All' : STATUS_LABEL[f]}
                {counts[f] !== null && <span className="tnum text-[11px] text-muted">{counts[f]}</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  resetPage()
                  setSeverity(s)
                }}
                className={
                  'rounded-full border px-3 py-1 text-[12px] font-medium capitalize transition-colors ' +
                  (severity === s
                    ? 'border-danger/40 bg-danger-bg text-danger'
                    : 'border-line text-muted hover:text-ink-soft')
                }
              >
                {s === 'all' ? 'Any severity' : s}
              </button>
            ))}
            <select
              value={category}
              onChange={(e) => {
                resetPage()
                setCategory(e.target.value as ReportCategory | 'all')
              }}
              className="rounded-full border border-line bg-white px-3 py-1 text-[12px] text-ink-soft outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Any category' : CATEGORY_LABEL[cat]}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<IconAlert />} title="Could not load complaints" detail={error} action={<Button size="sm" onClick={reload}>Try again</Button>} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<IconCheck />}
          title={filter === 'new' ? 'Nothing waiting' : 'Nothing here'}
          detail={
            filter === 'new'
              ? 'No new complaints. Reports from the apps land here the moment they arrive.'
              : `No ${filter === 'all' ? '' : STATUS_LABEL[filter].toLowerCase() + ' '}complaints.`
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {data.map((r) => (
              <ReportCard key={r.id} report={r} onChange={afterChange} />
            ))}
          </AnimatePresence>
          {hasMore && (
            <div className="flex justify-center pt-1">
              <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}

/* ── Grouped-by-platform triage (makes brigading visible) ─────── */
function GroupedInbox({
  onOpen,
  onChange,
}: {
  onOpen: (id: number, name: string) => void
  onChange: () => void
}) {
  const pushToast = useStore((s) => s.pushToast)
  const { data, loading, error, reload } = useApiData<AffectedLMS[]>(() => api.reportsByLMS())
  const [busy, setBusy] = useState<number | null>(null)

  const block = async (id: number, name: string) => {
    setBusy(id)
    try {
      await api.blockLMS(id)
      pushToast({ kind: 'success', title: `${name} blocked`, detail: 'Removed from the catalog.' })
      reload()
      onChange()
    } catch (e) {
      pushToast({ kind: 'error', title: 'Block failed', detail: (e as Error).message })
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
  if (error) return <EmptyState icon={<IconAlert />} title="Could not load" detail={error} action={<Button size="sm" onClick={reload}>Try again</Button>} />
  if (!data || data.length === 0)
    return <EmptyState icon={<IconCheck />} title="No open complaints" detail="Nothing to triage right now." />

  return (
    <div className="flex flex-col gap-3">
      {data.map((g) => {
        const name = g.lms?.name ?? hostOf(g.reported_base_url)
        return (
          <Card key={g.lms?.id ?? g.reported_base_url} className={'relative overflow-hidden p-5 pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 ' + SEV_BORDER[g.worst_severity]}>
            <div className="flex flex-wrap items-start gap-4">
              <LogoBadge name={name} accent={g.lms?.accent_color} logoUrl={g.lms?.logo_url || undefined} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">{name}</span>
                  <SeverityMark severity={g.worst_severity} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
                  <span><span className="tnum font-semibold text-ink-soft">{g.open_count}</span> open complaint{g.open_count === 1 ? '' : 's'}</span>
                  <span><span className="tnum font-semibold text-ink-soft">{g.distinct_reporters}</span> distinct reporter{g.distinct_reporters === 1 ? '' : 's'}</span>
                  <span className="flex items-center gap-1"><IconClock /> {timeAgo(g.latest_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.categories.map((c) => (
                    <Pill key={c} tone="slate">{CATEGORY_LABEL[c]}</Pill>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {g.lms && (
                  <Button size="sm" variant="ghost" onClick={() => onOpen(g.lms!.id, name)}>
                    View {g.open_count}
                  </Button>
                )}
                {g.lms && (
                  <Button size="sm" variant="danger" loading={busy === g.lms.id} onClick={() => block(g.lms!.id, name)}>
                    <IconShield /> Block platform
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

const SEV_BORDER: Record<string, string> = {
  high: 'before:bg-danger',
  medium: 'before:bg-warning',
  low: 'before:bg-faint',
}

/** Open the admin's own mail client with the notice pre-filled. */
function openMailto(to: string, subject: string, body: string) {
  const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  const a = document.createElement('a')
  a.href = href
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function ReportCard({ report, onChange }: { report: Report; onChange: () => void }) {
  const pushToast = useStore((s) => s.pushToast)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmingBlock, setConfirmingBlock] = useState(false)

  const setStatus = async (status: ReportStatus, label: string) => {
    setBusy(status)
    try {
      await api.updateReport(report.id, { status })
      pushToast({ kind: 'success', title: label })
      onChange()
    } catch (e) {
      pushToast({ kind: 'error', title: 'Update failed', detail: (e as Error).message })
      setBusy(null)
    }
  }

  const blockLMS = async () => {
    if (!report.lms_id) return
    setBusy('block')
    try {
      await api.blockLMS(report.lms_id)
      pushToast({
        kind: 'success',
        title: `${targetName} blocked`,
        detail: 'Removed from the catalog. You can undo this under LMS instances.',
      })
      onChange()
    } catch (e) {
      pushToast({ kind: 'error', title: 'Block failed', detail: (e as Error).message })
      setBusy(null)
    }
  }

  const emailOwner = async () => {
    if (!report.lms_id) return
    setBusy('notify')
    try {
      const res = await api.notifyOwner(report.lms_id)
      if (res.sent) {
        pushToast({ kind: 'success', title: 'Owner emailed', detail: res.owner_email })
      } else {
        openMailto(res.owner_email, res.subject, res.body)
        pushToast({ kind: 'info', title: 'Opened your email to the owner', detail: res.owner_email })
      }
      onChange()
    } catch (e) {
      pushToast({ kind: 'error', title: 'Could not contact owner', detail: (e as Error).message })
      setBusy(null)
    }
  }

  const targetName = report.lms?.name ?? hostOf(report.reported_base_url)
  const targetUrl = report.lms?.base_url ?? report.reported_base_url
  const isOpen = report.status === 'new' || report.status === 'reviewing'
  const contacted = !!report.lms?.owner_notified_at

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <Card
        className={
          'relative overflow-hidden p-5 pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 ' +
          SEV_BORDER[report.severity]
        }
      >
        <div className="flex flex-wrap items-start gap-4">
          <LogoBadge name={targetName} accent={report.lms?.accent_color} logoUrl={report.lms?.logo_url || undefined} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] font-semibold text-ink">{targetName}</span>
              <SeverityMark severity={report.severity} />
              <Pill tone="slate">{CATEGORY_LABEL[report.category]}</Pill>
              {report.status !== 'new' && <Pill tone={STATUS_TONE[report.status]}>{STATUS_LABEL[report.status]}</Pill>}
            </div>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted hover:text-link-hover"
            >
              {hostOf(targetUrl)} <IconExternal />
            </a>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
              {report.message || <span className="text-muted">No details provided.</span>}
            </p>

            {report.screenshot_url && (
              <a
                href={report.screenshot_url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open full screenshot"
                className="mt-3 inline-flex overflow-hidden rounded-md border border-line transition-colors hover:border-brand-500/50"
              >
                <img src={report.screenshot_url} alt="Reporter screenshot" className="max-h-44 w-auto object-contain" />
              </a>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <IconClock /> {timeAgo(report.created_at)}
              </span>
              {report.platform && (
                <span className="flex items-center gap-1.5">
                  <IconMobile /> {PLATFORM_LABEL[report.platform] ?? report.platform}
                  {report.app_version ? ` · v${report.app_version}` : ''}
                </span>
              )}
              {report.reporter_email && (
                <a href={`mailto:${report.reporter_email}`} className="flex items-center gap-1.5 hover:text-link-hover">
                  <IconMail /> {report.reporter_email}
                </a>
              )}
            </div>

            {report.status === 'dismissed' && report.resolution_note && (
              <div className="mt-3 rounded-lg border border-line bg-canvas-2 px-3 py-2 text-[13px] text-ink-soft">
                <span className="font-semibold">Note:</span> {report.resolution_note}
              </div>
            )}
            {report.status === 'blocked' && (
              <div className="mt-3 rounded-lg border border-danger/20 bg-danger-bg px-3 py-2 text-[13px] text-danger">
                This LMS was removed from the catalog. Restore it under LMS instances if needed.
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Button size="sm" variant="ghost" onClick={() => window.open(targetUrl, '_blank', 'noopener')}>
            <IconExternal /> Open LMS
          </Button>
          {report.lms_id && (
            <Button size="sm" variant={contacted ? 'ghost' : 'subtle'} loading={busy === 'notify'} onClick={emailOwner}>
              <IconMail /> {contacted ? 'Owner contacted' : 'Email owner'}
            </Button>
          )}
          <div className="flex-1" />
          {isOpen && (
            <>
              {report.status === 'new' && (
                <Button size="sm" variant="subtle" loading={busy === 'reviewing'} onClick={() => setStatus('reviewing', 'Marked reviewing')}>
                  Reviewing
                </Button>
              )}
              <Button size="sm" variant="ghost" loading={busy === 'dismissed'} onClick={() => setStatus('dismissed', 'Complaint dismissed')}>
                <IconX /> Dismiss
              </Button>
              {report.lms_id &&
                (confirmingBlock ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-muted">Block and remove from catalog?</span>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingBlock(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="danger" loading={busy === 'block'} onClick={blockLMS}>
                      <IconShield /> Confirm block
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => setConfirmingBlock(true)}>
                    <IconShield /> Block LMS
                  </Button>
                ))}
            </>
          )}
          {report.status === 'dismissed' && (
            <Button size="sm" variant="ghost" loading={busy === 'new'} onClick={() => setStatus('new', 'Reopened')}>
              Reopen
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
