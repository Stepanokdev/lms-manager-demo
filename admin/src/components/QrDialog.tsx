import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { makeLmsQrDataUrl } from '@/lib/qr'
import { hostOf } from '@/lib/format'
import type { LMS } from '@/lib/types'
import { IconX } from '@/components/icons'

/**
 * Shows an LMS's QR so a learner can scan it in the app's "Find your LMS" reader.
 * Display-only by design — no forced download; right-click (desktop) or long-press
 * (touch) the image to save it. Shared by the owner workspace and admin console.
 */
export function QrDialog({ lms, onClose }: { lms: Pick<LMS, 'name' | 'base_url'>; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    makeLmsQrDataUrl(lms).then(
      (url) => alive && setSrc(url),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [lms])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`QR code for ${lms.name}`}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-line bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-ink">{lms.name}</div>
            <div className="truncate text-[13px] text-muted">{hostOf(lms.base_url)}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas-2 hover:text-ink"
          >
            <IconX />
          </button>
        </div>

        <div className="mt-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
          {src ? (
            <img src={src} alt={`QR code linking to ${lms.base_url}`} className="h-full w-full" draggable={false} />
          ) : failed ? (
            <span className="px-6 text-center text-[13px] text-muted">Couldn't generate the QR code.</span>
          ) : (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-transparent" />
          )}
        </div>

        <p className="mt-3 text-center text-[12px] leading-relaxed text-muted">
          Scan it in the app's <span className="font-medium text-ink-soft">Find your LMS</span> reader to open this
          platform. Right-click the code to save it.
        </p>
      </div>
    </div>,
    document.body,
  )
}
