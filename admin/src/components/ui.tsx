import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { initials, readableOn } from '@/lib/format'
import type { Severity } from '@/lib/types'

/* ── Card surface ─────────────────────────────────────── */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.03]',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-24px_rgba(0,0,0,0.6)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ── Button ───────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'success'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-surface-950 hover:bg-accent-400 font-semibold',
  ghost: 'bg-transparent text-surface-300 border border-white/10 hover:bg-white/5 hover:text-white',
  subtle: 'bg-white/[0.06] text-surface-200 hover:bg-white/10',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/25 hover:bg-rose-500/25',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25',
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'subtle', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium',
        'transition-[background,color,transform] duration-150 active:scale-[0.97]',
        'disabled:opacity-45 disabled:pointer-events-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent-400/50',
        size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2.5 text-sm',
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
})

/* ── Pills / tags ─────────────────────────────────────── */
export function Pill({
  tone,
  children,
  className,
}: {
  tone: 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate' | 'sky'
  children: ReactNode
  className?: string
}) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-300 bg-emerald-500/12 border-emerald-500/25',
    amber: 'text-premium-400 bg-premium-500/12 border-premium-500/25',
    rose: 'text-rose-300 bg-rose-500/12 border-rose-500/25',
    cyan: 'text-accent-300 bg-accent-500/12 border-accent-500/25',
    sky: 'text-primary-300 bg-primary-500/12 border-primary-500/25',
    slate: 'text-surface-300 bg-white/5 border-white/10',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SeverityMark({ severity }: { severity: Severity }) {
  const map: Record<Severity, { tone: 'rose' | 'amber' | 'slate'; label: string }> = {
    high: { tone: 'rose', label: 'High' },
    medium: { tone: 'amber', label: 'Medium' },
    low: { tone: 'slate', label: 'Low' },
  }
  const { tone, label } = map[severity]
  const dot = tone === 'rose' ? 'bg-rose-400' : tone === 'amber' ? 'bg-premium-400' : 'bg-surface-500'
  return (
    <Pill tone={tone}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dot, severity === 'high' && 'animate-pulse')} />
      {label}
    </Pill>
  )
}

/* ── Logo / initials badge ────────────────────────────── */
export function LogoBadge({
  name,
  accent,
  logoUrl,
  size = 44,
}: {
  name: string
  accent?: string
  logoUrl?: string | null
  size?: number
}) {
  const color = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#3b82f6'
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="shrink-0 rounded-xl bg-white/5 object-contain"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl font-bold"
      style={{
        width: size,
        height: size,
        background: color,
        color: readableOn(color),
        fontSize: size * 0.34,
      }}
    >
      {initials(name)}
    </div>
  )
}

/* ── Health dot ───────────────────────────────────────── */
export function HealthDot({ ok, label = true }: { ok: boolean | null; label?: boolean }) {
  const cfg =
    ok === null
      ? { c: 'bg-surface-500', t: 'Not checked' }
      : ok
        ? { c: 'bg-emerald-400', t: 'Reachable' }
        : { c: 'bg-rose-400', t: 'Unreachable' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-surface-400">
      <span className={cn('h-2 w-2 rounded-full', cfg.c)} />
      {label && cfg.t}
    </span>
  )
}

/* ── Form fields ──────────────────────────────────────── */
const fieldBase =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-surface-500 outline-none transition-colors focus:border-accent-500/50 focus:bg-white/[0.07]'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...rest} />
  },
)
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, 'resize-none leading-relaxed', className)} {...rest} />
  },
)

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-surface-300">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-rose-400">{error}</span>
      ) : hint ? (
        <span className="text-xs text-surface-500">{hint}</span>
      ) : null}
    </label>
  )
}

/* ── Skeleton / empty ─────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon?: ReactNode
  title: string
  detail?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-3xl text-surface-500">{icon}</div>}
      <div className="text-base font-semibold text-surface-200">{title}</div>
      {detail && <p className="mt-1 max-w-sm text-sm text-surface-500">{detail}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
