import { motion } from 'motion/react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { hostOf, timeAgo } from '@/lib/format'
import type { LMS, PublicConfig } from '@/lib/types'
import { Card, Button, Pill, Skeleton, EmptyState, LogoBadge } from '@/components/ui'
import { IconLayers, IconLogout, IconPlus, IconEdit, IconExternal, IconServer } from '@/components/icons'

export function OwnerView({ config }: { config: PublicConfig | null }) {
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const { data, loading, error, reload } = useApiData<LMS[]>(() => api.myLMS())
  const provider = config?.provider_name || 'Universal Open edX'

  return (
    <div className="min-h-[100dvh] w-full bg-surface-950">
      <header className="sticky top-0 z-20 flex items-center border-b border-white/8 bg-surface-950/80 px-5 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-accent-300">
            <IconLayers />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white">{provider}</div>
            <div className="text-[11px] text-surface-500">Owner workspace</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[13px] text-surface-400 sm:inline">{user?.email}</span>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Sign out"
          >
            <IconLogout />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Your platforms</h1>
            <p className="mt-1 text-sm text-surface-400">
              The Open edX instances you've registered for the mobile app.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => launchWizard()}>
            <IconPlus /> Register a new LMS
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {loading ? (
            [0, 1].map((i) => <Skeleton key={i} className="h-20" />)
          ) : error ? (
            <EmptyState icon={<IconServer />} title="Could not load your platforms" detail={error} action={<Button size="sm" onClick={reload}>Try again</Button>} />
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={<IconServer />}
              title="No platforms yet"
              detail="Register your Open edX instance so learners can find it in the app."
              action={<Button size="sm" variant="primary" onClick={() => launchWizard()}><IconPlus /> Register your first LMS</Button>}
            />
          ) : (
            data.map((lms, i) => (
              <motion.div key={lms.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="flex flex-wrap items-center gap-4 p-4">
                  <LogoBadge name={lms.name} accent={lms.accent_color} logoUrl={lms.logo_upload_url || lms.logo_url || undefined} />
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-white">{lms.name}</span>
                      <StatusPill lms={lms} />
                    </div>
                    <a
                      href={lms.base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-surface-500 hover:text-accent-300"
                    >
                      {hostOf(lms.base_url)} <IconExternal />
                    </a>
                    <div className="mt-1 text-[12px] text-surface-500">Updated {timeAgo(lms.updated_at)}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => launchWizard(lms.id)}>
                    <IconEdit /> Edit
                  </Button>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

function StatusPill({ lms }: { lms: LMS }) {
  if (lms.status === 'rejected') return <Pill tone="rose">Blocked</Pill>
  if (lms.status === 'pending') return <Pill tone="amber">Pending review</Pill>
  if (!lms.admin_reviewed) return <Pill tone="cyan">Live · awaiting review</Pill>
  return <Pill tone="emerald">Live</Pill>
}

function launchWizard(editId?: number) {
  window.location.href = editId ? `/wizard/?edit=${editId}` : '/wizard/'
}
