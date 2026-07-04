import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { useStore } from '@/store'
import { timeAgo, hostOf } from '@/lib/format'
import type { Report, ReportStatus } from '@/lib/types'
import {
  Card,
  Button,
  Pill,
  SeverityMark,
  LogoBadge,
  Skeleton,
  EmptyState,
  Textarea,
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
  IconSignal,
} from '@/components/icons'

type Filter = ReportStatus | 'all'
const FILTERS: Filter[] = ['new', 'investigating', 'resolved', 'dismissed', 'all']

export function ReportsView() {
  const [filter, setFilter] = useState<Filter>('new')
  const stats = useStore((s) => s.stats)
  const refreshStats = useStore((s) => s.refreshStats)
  const { data, loading, error, setData, reload } = useApiData<Report[]>(
    () => api.listReports(filter === 'all' ? undefined : filter),
    [filter],
  )

  const onLocalUpdate = (updated: Report) => {
    setData((prev) => {
      if (!prev) return prev
      // Drop from the current list if it no longer matches the active filter.
      if (filter !== 'all' && updated.status !== filter) {
        return prev.filter((r) => r.id !== updated.id)
      }
      return prev.map((r) => (r.id === updated.id ? updated : r))
    })
    refreshStats()
  }

  const counts: Record<Filter, number | null> = {
    new: stats?.new ?? null,
    investigating: stats?.investigating ?? null,
    resolved: stats?.resolved ?? null,
    dismissed: stats?.dismissed ?? null,
    all: stats?.total ?? null,
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Complaints</h1>
          <p className="mt-1 text-sm text-surface-400">
            Filed from the mobile apps. High-severity reports rise to the top.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reload}>
          <IconRefresh /> Refresh
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ' +
              (filter === f
                ? 'border-accent-500/40 bg-accent-500/12 text-accent-200'
                : 'border-white/10 text-surface-400 hover:text-surface-200')
            }
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
            {counts[f] !== null && (
              <span className="tnum text-[11px] text-surface-500">{counts[f]}</span>
            )}
          </button>
        ))}
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
          title={filter === 'new' ? 'Inbox zero' : 'Nothing here'}
          detail={
            filter === 'new'
              ? 'No new complaints waiting. New reports from the apps will appear here instantly.'
              : `No ${filter === 'all' ? '' : STATUS_LABEL[filter].toLowerCase() + ' '}complaints to show.`
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {data.map((r) => (
              <ReportCard key={r.id} report={r} onUpdate={onLocalUpdate} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

const SEV_BORDER: Record<string, string> = {
  high: 'before:bg-rose-500',
  medium: 'before:bg-premium-500',
  low: 'before:bg-surface-600',
}

function ReportCard({ report, onUpdate }: { report: Report; onUpdate: (r: Report) => void }) {
  const pushToast = useStore((s) => s.pushToast)
  const [note, setNote] = useState(report.resolution_note || '')
  const [showResolve, setShowResolve] = useState(false)
  const [busy, setBusy] = useState<ReportStatus | null>(null)
  const [rechecking, setRechecking] = useState(false)
  const [health, setHealth] = useState<{ ok: boolean; note: string } | null>(null)

  const setStatus = async (status: ReportStatus, resolutionNote?: string) => {
    setBusy(status)
    try {
      const updated = await api.updateReport(report.id, {
        status,
        resolution_note: resolutionNote ?? note ?? '',
      })
      onUpdate(updated)
      pushToast({ kind: 'success', title: `Marked ${STATUS_LABEL[status].toLowerCase()}` })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Update failed', detail: (e as Error).message })
    } finally {
      setBusy(null)
      setShowResolve(false)
    }
  }

  const recheck = async () => {
    if (!report.lms_id) return
    setRechecking(true)
    setHealth(null)
    try {
      const lms = await api.recheckLMS(report.lms_id)
      setHealth({ ok: !!lms.last_health_ok, note: lms.last_health_note })
    } catch (e) {
      setHealth({ ok: false, note: (e as Error).message })
    } finally {
      setRechecking(false)
    }
  }

  const targetName = report.lms?.name ?? hostOf(report.reported_base_url)
  const targetUrl = report.lms?.base_url ?? report.reported_base_url
  const isOpen = report.status === 'new' || report.status === 'investigating'

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
          <LogoBadge
            name={targetName}
            accent={report.lms?.accent_color}
            logoUrl={report.lms?.logo_url || undefined}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] font-semibold text-white">{targetName}</span>
              <SeverityMark severity={report.severity} />
              <Pill tone="slate">{CATEGORY_LABEL[report.category]}</Pill>
              {report.status !== 'new' && (
                <Pill tone={STATUS_TONE[report.status]}>{STATUS_LABEL[report.status]}</Pill>
              )}
            </div>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-surface-500 hover:text-accent-300"
            >
              {hostOf(targetUrl)} <IconExternal />
            </a>
            <p className="mt-2.5 text-sm leading-relaxed text-surface-200">
              {report.message || <span className="text-surface-500">No details provided.</span>}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-surface-500">
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
                <a href={`mailto:${report.reporter_email}`} className="flex items-center gap-1.5 hover:text-accent-300">
                  <IconMail /> {report.reporter_email}
                </a>
              )}
            </div>

            {report.status === 'resolved' && report.resolution_note && (
              <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[13px] text-emerald-200/90">
                <span className="font-semibold">Resolution:</span> {report.resolution_note}
              </div>
            )}
          </div>
        </div>

        {/* Inline health recheck result */}
        <AnimatePresence>
          {health && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div
                className={
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] ' +
                  (health.ok
                    ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-200'
                    : 'border-rose-500/25 bg-rose-500/[0.07] text-rose-200')
                }
              >
                <IconSignal />
                <span className="font-semibold">{health.ok ? 'Reachable' : 'Problem detected'}:</span>
                {health.note}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {showResolve ? (
          <div className="mt-4 flex flex-col gap-2.5 border-t border-white/8 pt-4">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you do about it? (visible in the log)"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowResolve(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="success" loading={busy === 'resolved'} onClick={() => setStatus('resolved')}>
                <IconCheck /> Confirm resolved
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4">
            <Button
              size="sm"
              variant="ghost"
              loading={rechecking}
              disabled={!report.lms_id}
              onClick={recheck}
              title={report.lms_id ? 'Re-probe the LMS now' : 'Not linked to a registered LMS'}
            >
              <IconSignal /> Check LMS now
            </Button>
            <div className="flex-1" />
            {isOpen && report.status !== 'investigating' && (
              <Button size="sm" variant="subtle" loading={busy === 'investigating'} onClick={() => setStatus('investigating')}>
                Investigating
              </Button>
            )}
            {isOpen && (
              <>
                <Button size="sm" variant="ghost" loading={busy === 'dismissed'} onClick={() => setStatus('dismissed')}>
                  <IconX /> Dismiss
                </Button>
                <Button size="sm" variant="success" onClick={() => setShowResolve(true)}>
                  <IconCheck /> Resolve
                </Button>
              </>
            )}
            {!isOpen && (
              <Button size="sm" variant="ghost" loading={busy === 'new'} onClick={() => setStatus('new')}>
                Reopen
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
