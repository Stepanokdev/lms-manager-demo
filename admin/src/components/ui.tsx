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
        'rounded-md border border-line bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
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
  primary: 'bg-brand-500 text-white hover:bg-brand-600 font-semibold',
  ghost: 'bg-transparent text-brand-500 border border-brand-500/70 hover:bg-brand-50 font-semibold',
  subtle: 'bg-canvas-2 text-ink-soft border border-line hover:bg-line/60',
  danger: 'bg-danger text-white hover:brightness-95 font-semibold',
  success: 'bg-success text-white hover:brightness-95 font-semibold',
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
        'inline-flex items-center justify-center gap-1.5 rounded font-medium',
        'transition-[background,color,transform] duration-150 active:scale-[0.98]',
        'disabled:opacity-45 disabled:pointer-events-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-brand-500/40',
        size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-sm',
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
    emerald: 'text-success bg-success-bg border-success/20',
    amber: 'text-warning bg-warning-bg border-warning/20',
    rose: 'text-danger bg-danger-bg border-danger/20',
    cyan: 'text-link bg-info-bg border-link/20',
    sky: 'text-brand-500 bg-brand-50 border-brand-500/20',
    slate: 'text-muted bg-canvas-2 border-line',
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
  const dot = tone === 'rose' ? 'bg-danger' : tone === 'amber' ? 'bg-warning' : 'bg-faint'
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
  const color = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#0a3055'
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="shrink-0 rounded-md border border-line bg-white object-contain"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md font-bold"
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
      ? { c: 'bg-faint', t: 'Not checked' }
      : ok
        ? { c: 'bg-success', t: 'Online' }
        : { c: 'bg-danger', t: 'Not responding' }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className={cn('h-2 w-2 rounded-full', cfg.c)} />
      {label && cfg.t}
    </span>
  )
}

/* ── Form fields ──────────────────────────────────────── */
const fieldBase =
  'w-full rounded border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder-faint outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25'

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
      <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

/* ── Skeleton / empty ─────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-canvas-2', className)} />
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
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong bg-card px-6 py-14 text-center">
      {icon && <div className="mb-3 text-3xl text-faint">{icon}</div>}
      <div className="text-base font-semibold text-ink">{title}</div>
      {detail && <p className="mt-1 max-w-sm text-sm text-muted">{detail}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
