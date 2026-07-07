import { motion } from 'motion/react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { timeAgo } from '@/lib/format'
import { Card, Button, Skeleton, LogoBadge, SeverityMark, Pill, HealthDot } from '@/components/ui'
import { CATEGORY_LABEL } from './reportMeta'
import type { PublicConfig } from '@/lib/types'
import {
  IconAlert,
  IconServer,
  IconEye,
  IconStar,
  IconChevronRight,
  IconCheck,
  IconMobile,
} from '@/components/icons'

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
}

export function OverviewView({ config }: { config: PublicConfig | null }) {
  const isCurated = config?.directory_mode === 'curated'
  const setView = useStore((s) => s.setView)
  const user = useStore((s) => s.user)
  const { data, loading } = useApiData(() =>
    Promise.all([
      api.overview(),
      api.listReports({ status: 'new' }),
      api.listLMS({ reviewed: false, status_filter: 'approved', limit: 6 }),
    ]),
  )

  const overview = data?.[0]
  const latestReports = (data?.[1] ?? []).slice(0, 5)
  const needsReview = data?.[2] ?? []

  const openComplaints = overview ? overview.reports.new + overview.reports.reviewing : 0
  const highOpen = overview?.reports.high_open ?? 0

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isCurated
              ? "Your organization's platforms at a glance."
              : 'Here is what needs your attention across the registry.'}
          </p>
        </div>
        {!isCurated && (
          <Button variant="ghost" size="sm" onClick={() => setView('reports')}>
            <IconAlert /> Open triage inbox
          </Button>
        )}
      </header>

      {loading || !overview ? (
        <OverviewSkeleton />
      ) : (
        <>
          {/* Hero row: complaints (wide) + review queue — moderation only, hidden in curated. */}
          {!isCurated && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <motion.div {...fade} transition={{ duration: 0.4 }}>
              <Card className="relative overflow-hidden p-6">
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted">
                      <IconAlert /> Open complaints
                    </div>
                    <div className="mt-2 flex items-end gap-3">
                      <span className="tnum text-5xl font-bold leading-none text-ink">
                        {openComplaints}
                      </span>
                      {highOpen > 0 && (
                        <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-danger">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                          {highOpen} high-severity
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant={highOpen > 0 ? 'danger' : 'subtle'} size="sm" onClick={() => setView('reports')}>
                    Triage now <IconChevronRight />
                  </Button>
                </div>
                <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label="New" value={overview.reports.new} tone="cyan" />
                  <MiniStat label="Reviewing" value={overview.reports.reviewing} tone="amber" />
                  <MiniStat label="Affected LMS" value={overview.reports.affected_lms} tone="rose" />
                  <MiniStat label="Blocked" value={overview.reports.blocked} tone="emerald" />
                </div>
              </Card>
            </motion.div>

            <motion.div {...fade} transition={{ duration: 0.4, delay: 0.05 }}>
              <Card className="flex h-full flex-col p-6">
                <div className="flex items-center gap-2 text-sm font-medium text-muted">
                  <IconEye /> Awaiting your review
                </div>
                <div className="mt-2 flex items-end gap-3">
                  <span className="tnum text-5xl font-bold leading-none text-ink">
                    {overview.lms.unreviewed}
                  </span>
                  <span className="mb-1 text-sm text-muted">auto-approved, unverified</span>
                </div>
                <p className="mt-3 flex-1 text-[13px] leading-relaxed text-muted">
                  New submissions go live immediately. Confirm each one is configured correctly so
                  learners never hit a broken instance.
                </p>
                <Button variant="ghost" size="sm" className="mt-4 self-start" onClick={() => setView('lms')}>
                  Review instances <IconChevronRight />
                </Button>
              </Card>
            </motion.div>
          </div>
          )}

          {/* LMS metric strip — divided, not boxed */}
          <motion.div {...fade} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card className="p-0">
              <div className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
                <StatCell icon={<IconServer />} label="Total LMS" value={overview.lms.total} />
                <StatCell icon={<IconEye />} label="Public" value={overview.lms.public} />
                <StatCell icon={<IconStar />} label="Featured" value={overview.lms.featured} />
                <StatCell icon={<IconEye />} label="Hidden" value={overview.lms.hidden} />
              </div>
            </Card>
          </motion.div>

          {/* Two panels: latest complaints + review queue — moderation only, hidden in curated. */}
          {!isCurated && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Latest complaints" onSeeAll={() => setView('reports')}>
              {latestReports.length === 0 ? (
                <QuietRow icon={<IconCheck />} text="No new complaints. All clear." />
              ) : (
                latestReports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setView('reports')}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-canvas-2"
                  >
                    <LogoBadge
                      name={r.lms?.name ?? r.reported_base_url}
                      accent={r.lms?.accent_color}
                      logoUrl={r.lms?.logo_url || undefined}
                      size={36}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">
                          {r.lms?.name ?? r.reported_base_url}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">{CATEGORY_LABEL[r.category]}</span>
                      </div>
                      <div className="truncate text-[13px] text-muted">{r.message || 'No details provided'}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SeverityMark severity={r.severity} />
                      <span className="flex items-center gap-1 text-[11px] text-faint">
                        <IconMobile /> {timeAgo(r.created_at)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </Panel>

            <Panel title="Review queue" onSeeAll={() => setView('lms')}>
              {needsReview.length === 0 ? (
                <QuietRow icon={<IconCheck />} text="Every live instance has been reviewed." />
              ) : (
                needsReview.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setView('lms')}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-canvas-2"
                  >
                    <LogoBadge name={l.name} accent={l.accent_color} logoUrl={l.logo_upload_url || l.logo_url || undefined} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{l.name}</div>
                      <div className="truncate text-[13px] text-muted">{l.base_url}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <HealthDot ok={l.last_health_ok} label={false} />
                      <Pill tone="amber">Unreviewed</Pill>
                    </div>
                  </button>
                ))
              )}
            </Panel>
          </div>
          )}
        </>
      )}
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: 'cyan' | 'amber' | 'rose' | 'emerald' }) {
  const colors: Record<string, string> = {
    cyan: 'text-link',
    amber: 'text-warning',
    rose: 'text-danger',
    emerald: 'text-success',
  }
  return (
    <div className="rounded-md border border-line bg-canvas-2 px-3.5 py-3">
      <div className={`tnum text-2xl font-bold ${colors[tone]}`}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-canvas-2 text-lg text-muted">
        {icon}
      </span>
      <div>
        <div className="tnum text-2xl font-bold text-ink">{value}</div>
        <div className="text-[12px] text-muted">{label}</div>
      </div>
    </div>
  )
}

function Panel({ title, onSeeAll, children }: { title: string; onSeeAll: () => void; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center justify-between px-2">
        <h2 className="text-sm font-bold text-ink-soft">{title}</h2>
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-[13px] text-link hover:text-link-hover">
          See all <IconChevronRight />
        </button>
      </div>
      <div className="flex flex-col">{children}</div>
    </Card>
  )
}

function QuietRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted">
      <span className="text-success">{icon}</span>
      {text}
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
      <Skeleton className="h-24" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
