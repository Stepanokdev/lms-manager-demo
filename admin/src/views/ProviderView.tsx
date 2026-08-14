import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { hostOf, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { LMS } from '@/lib/types'
import { QrDialog } from '@/components/QrDialog'
import { Button, Card, EmptyState, LogoBadge, Pill, Skeleton } from '@/components/ui'
import {
  IconChevronRight,
  IconEdit,
  IconExternal,
  IconEye,
  IconEyeOff,
  IconLink,
  IconPlus,
  IconQr,
  IconServer,
} from '@/components/icons'

/**
 * The provider's platforms — the whole of what they publish, in the order their
 * app will show it.
 *
 * Deliberately smaller than the operator's LMS view: there is no review queue,
 * no featured star and no block button here, because a provider is not
 * moderating strangers. They are arranging their own shelf.
 */
export function ProviderView() {
  const setView = useStore((s) => s.setView)
  const pushToast = useStore((s) => s.pushToast)
  const { data, loading, error, reload, setData } = useApiData<LMS[]>(() => api.myLMS())
  const org = useStore((s) => s.org)
  const [qrLms, setQrLms] = useState<LMS | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const rows = data ?? []
  const published = rows.filter((l) => l.visibility === 'public').length

  const patch = (updated: LMS) =>
    setData((prev) => (prev ? prev.map((l) => (l.id === updated.id ? updated : l)) : prev))

  const toggleVisibility = async (lms: LMS) => {
    setBusyId(lms.id)
    const next = lms.visibility === 'public' ? 'hidden' : 'public'
    try {
      patch(await api.updateMyLMS(lms.id, { visibility: next }))
      pushToast({
        kind: 'success',
        title: next === 'public' ? `${lms.name} is live in your app` : `${lms.name} is hidden`,
        detail:
          next === 'public'
            ? 'Learners see it the next time the app opens.'
            : 'It stays here, but the app stops listing it.',
      })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Could not update', detail: (e as Error).message })
    } finally {
      setBusyId(null)
    }
  }

  /** Swap two neighbours' sort_order — the order the app renders them in. */
  const move = async (index: number, delta: number) => {
    const a = rows[index]
    const b = rows[index + delta]
    if (!a || !b) return
    setBusyId(a.id)
    try {
      const [movedA, movedB] = await Promise.all([
        api.updateMyLMS(a.id, { sort_order: index + delta }),
        api.updateMyLMS(b.id, { sort_order: index }),
      ])
      setData((prev) => {
        if (!prev) return prev
        const next = prev.map((l) => (l.id === movedA.id ? movedA : l.id === movedB.id ? movedB : l))
        return [...next].sort((x, y) => x.sort_order - y.sort_order || x.name.localeCompare(y.name))
      })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Could not reorder', detail: (e as Error).message })
      reload()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Your platforms</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length > 0
              ? `${published} of ${rows.length} visible in your app, in this order.`
              : 'The Open edX platforms your app offers, in the order it shows them.'}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => launchWizard()}>
          <IconPlus /> Add a platform
        </Button>
      </header>

      {org && rows.length > 0 && (
        <button
          onClick={() => setView('appconfig')}
          className="group flex items-center gap-3 rounded-md border border-line bg-card px-4 py-3 text-left transition-colors hover:border-line-strong"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <IconLink />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">Your directory address</span>
            <span className="block truncate font-mono text-[12.5px] text-muted">
              {org.directory_url}
            </span>
          </span>
          <span className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5">
            <IconChevronRight />
          </span>
        </button>
      )}

      <div className="flex flex-col gap-3">
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-[86px]" />)
        ) : error ? (
          <EmptyState
            icon={<IconServer />}
            title="Could not load your platforms"
            detail={error}
            action={<Button size="sm" onClick={reload}>Try again</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconServer />}
            title="No platforms yet"
            detail="Add your first Open edX platform. You'll set its address, branding and mobile features, and it appears in your app as soon as you save."
            action={
              <Button size="sm" variant="primary" onClick={() => launchWizard()}>
                <IconPlus /> Add your first platform
              </Button>
            }
          />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((lms, i) => (
              <motion.div
                key={lms.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className={cn('p-3.5', lms.visibility === 'hidden' && 'bg-canvas-2')}>
                  <div className="flex flex-wrap items-center gap-3.5">
                    <div className="flex shrink-0 flex-col">
                      <OrderButton
                        label={`Move ${lms.name} up`}
                        disabled={i === 0 || busyId !== null}
                        onClick={() => move(i, -1)}
                        direction="up"
                      />
                      <OrderButton
                        label={`Move ${lms.name} down`}
                        disabled={i === rows.length - 1 || busyId !== null}
                        onClick={() => move(i, 1)}
                        direction="down"
                      />
                    </div>

                    <LogoBadge
                      name={lms.name}
                      accent={lms.accent_color}
                      logoUrl={lms.logo_upload_url || lms.logo_url || undefined}
                      size={40}
                    />

                    <div className="min-w-[180px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-ink">{lms.name}</span>
                        {lms.visibility === 'public' ? (
                          <Pill tone="emerald">In your app</Pill>
                        ) : (
                          <Pill tone="slate">Hidden</Pill>
                        )}
                      </div>
                      <a
                        href={lms.base_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-link-hover"
                      >
                        {hostOf(lms.base_url)} <IconExternal />
                      </a>
                      <div className="mt-0.5 text-[12px] text-faint">
                        Updated {timeAgo(lms.updated_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <IconBtn
                        label={
                          lms.visibility === 'public'
                            ? `Hide ${lms.name} from your app`
                            : `Show ${lms.name} in your app`
                        }
                        loading={busyId === lms.id}
                        onClick={() => toggleVisibility(lms)}
                      >
                        {lms.visibility === 'public' ? <IconEye /> : <IconEyeOff />}
                      </IconBtn>
                      <IconBtn label={`QR code for ${lms.name}`} onClick={() => setQrLms(lms)}>
                        <IconQr />
                      </IconBtn>
                      <a
                        href={`/wizard/?edit=${lms.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Edit ${lms.name}`}
                        title={`Edit ${lms.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
                      >
                        <IconEdit />
                      </a>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {qrLms && <QrDialog lms={qrLms} onClose={() => setQrLms(null)} />}
    </div>
  )
}

function OrderButton({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  direction: 'up' | 'down'
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-5 w-6 items-center justify-center rounded text-faint transition-colors',
        'hover:bg-canvas-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30',
        'outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
      )}
    >
      <span className={cn('text-sm', direction === 'up' ? '-rotate-90' : 'rotate-90')}>
        <IconChevronRight />
      </span>
    </button>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  loading,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition-colors',
        'hover:border-line-strong hover:text-ink disabled:opacity-45 disabled:pointer-events-none',
        'outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
      )}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}

function launchWizard(editId?: number) {
  window.location.href = editId ? `/wizard/?edit=${editId}` : '/wizard/'
}
