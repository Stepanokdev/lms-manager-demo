import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { IconCheck, IconCopy } from './icons'

/**
 * A read-only value the user is meant to take somewhere else.
 *
 * Confirmation is inline rather than a toast: the reason to look at this control
 * is the value itself, so the feedback belongs where the eyes already are. The
 * text stays selectable so keyboard copy works exactly as it always did.
 */
export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const copy = useCallback((text: string) => {
    const done = () => {
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallback(text, done))
    } else {
      fallback(text, done)
    }
  }, [])

  return [copied, copy]
}

/** execCommand path for browsers that withhold the async clipboard on http origins. */
function fallback(text: string, done: () => void) {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  try {
    document.execCommand('copy')
    done()
  } finally {
    document.body.removeChild(el)
  }
}

export function CopyField({
  value,
  label,
  hint,
  className,
}: {
  value: string
  label?: string
  hint?: string
  className?: string
}) {
  const [copied, copy] = useCopy()

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-[13px] font-semibold text-ink-soft">{label}</span>}
      <div className="flex items-stretch overflow-hidden rounded border border-line-strong bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25">
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[13px] text-ink outline-none"
          aria-label={label || 'Value to copy'}
        />
        <button
          type="button"
          onClick={() => copy(value)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-l border-line px-3.5 text-[13px] font-semibold transition-colors',
            'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40',
            copied ? 'bg-success-bg text-success' : 'bg-canvas-2 text-ink-soft hover:bg-line/60',
          )}
        >
          {copied ? <IconCheck /> : <IconCopy />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {/* Announced without moving anything on screen. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </div>
  )
}

export function CodeBlock({
  code,
  filename,
  className,
}: {
  code: string
  filename?: string
  className?: string
}) {
  const [copied, copy] = useCopy()

  return (
    <div className={cn('overflow-hidden rounded-md border border-line', className)}>
      <div className="flex items-center gap-2 border-b border-line bg-canvas-2 px-3 py-2">
        {filename && (
          <span className="truncate font-mono text-[12px] text-ink-soft">{filename}</span>
        )}
        <button
          type="button"
          onClick={() => copy(code)}
          className={cn(
            'ml-auto flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[12px] font-semibold transition-colors',
            'outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
            copied ? 'text-success' : 'text-muted hover:bg-line/60 hover:text-ink',
          )}
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* Wide snippets scroll inside the block; the page never scrolls sideways. */}
      <pre className="overflow-x-auto bg-white px-3.5 py-3 text-[12.5px] leading-relaxed text-ink">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  )
}
