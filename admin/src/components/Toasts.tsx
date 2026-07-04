import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '@/store'
import { cn } from '@/lib/cn'
import { IconBell, IconCheck, IconX, IconAlert } from './icons'

const KIND = {
  info: { ring: 'border-white/12', icon: <IconBell />, iconColor: 'text-primary-300' },
  success: { ring: 'border-emerald-500/30', icon: <IconCheck />, iconColor: 'text-emerald-300' },
  error: { ring: 'border-rose-500/30', icon: <IconAlert />, iconColor: 'text-rose-300' },
  alert: { ring: 'border-rose-500/40', icon: <IconAlert />, iconColor: 'text-rose-300' },
} as const

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const k = KIND[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border bg-surface-900/90 p-3.5 backdrop-blur-xl',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_40px_-16px_rgba(0,0,0,0.7)]',
                k.ring,
              )}
            >
              <div className={cn('mt-0.5 text-lg', k.iconColor)}>
                {t.kind === 'alert' ? (
                  <span className="inline-block animate-pulse">{k.icon}</span>
                ) : (
                  k.icon
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.detail && <div className="mt-0.5 text-[13px] text-surface-400">{t.detail}</div>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-surface-500 transition-colors hover:text-white"
                aria-label="Dismiss"
              >
                <IconX />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
