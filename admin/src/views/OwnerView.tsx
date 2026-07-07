import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { QrDialog } from '@/components/QrDialog'
import { hostOf, timeAgo } from '@/lib/format'
import type { LMS, PublicConfig } from '@/lib/types'
import { Card, Button, Pill, Skeleton, EmptyState, LogoBadge } from '@/components/ui'
import { IconLayers, IconLogout, IconPlus, IconEdit, IconExternal, IconServer, IconAlert, IconCheck, IconQr } from '@/components/icons'

export function OwnerView({ config }: { config: PublicConfig | null }) {
  const user = useStore((s) => s.user)
  const logout = useStore((s) => s.logout)
  const pushToast = useStore((s) => s.pushToast)
  const { data, loading, error, reload } = useApiData<LMS[]>(() => api.myLMS())
  const provider = config?.provider_name || 'Open X Project'
  const [qrLms, setQrLms] = useState<LMS | null>(null)

  const requestReview = async (id: number) => {
    try {
      await api.requestReview(id)
      pushToast({ kind: 'success', title: 'Re-review requested', detail: "We'll take another look." })
      reload()
    } catch (e) {
      pushToast({ kind: 'error', title: 'Could not request review', detail: (e as Error).message })
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-canvas">
      <header className="sticky top-0 z-20 flex items-center border-b border-line bg-card/95 px-5 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas-2 text-link">
            <IconLayers />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-ink">{provider}</div>
            <div className="text-[11px] text-muted">Owner workspace</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[13px] text-muted sm:inline">{user?.email}</span>
          <button
            onClick={logout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas-2 hover:text-ink"
            aria-label="Sign out"
          >
            <IconLogout />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">Your platforms</h1>
            <p className="mt-1 text-sm text-muted">
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
                <Card className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <LogoBadge name={lms.name} accent={lms.accent_color} logoUrl={lms.logo_upload_url || lms.logo_url || undefined} />
                    <div className="min-w-[180px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-ink">{lms.name}</span>
                        <StatusPill lms={lms} />
                      </div>
                      <a
                        href={lms.base_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted hover:text-link-hover"
                      >
                        {hostOf(lms.base_url)} <IconExternal />
                      </a>
                      <div className="mt-1 text-[12px] text-muted">Updated {timeAgo(lms.updated_at)}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setQrLms(lms)} title="Show a QR code that opens this platform in the app">
                      <IconQr /> QR
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => launchWizard(lms.id)}>
                      <IconEdit /> Edit
                    </Button>
                  </div>

                  {lms.status === 'rejected' && (
                    <div className="mt-3 rounded-md border border-danger/25 bg-danger-bg px-4 py-3">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-danger">
                        <IconAlert /> Temporarily removed from the app
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-danger/80">
                        Learners reported this platform for {lms.block_reason || 'a policy issue'}. Please
                        fix the issue, then let us know and we'll take another look.
                      </p>
                      <div className="mt-3">
                        {lms.review_requested_at ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-success">
                            <IconCheck /> Re-review requested — we'll get back to you
                          </span>
                        ) : (
                          <Button size="sm" variant="subtle" onClick={() => requestReview(lms.id)}>
                            I've fixed it — request re-review
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {qrLms && <QrDialog lms={qrLms} onClose={() => setQrLms(null)} />}
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
