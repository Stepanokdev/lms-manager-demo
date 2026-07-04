/** Relative time such as "6 min ago" / "2 h ago" / "3 d ago". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—'
  // Backend timestamps are naive UTC; treat them as UTC.
  const withZone = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z'
  const then = new Date(withZone).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 45) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo} mo ago`
  return `${Math.round(mo / 12)} y ago`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const joined = parts.map((p) => p[0] ?? '').join('')
  return (joined || name.slice(0, 1)).toUpperCase()
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

/** Pick readable text (near-black or white) for a colored badge background. */
export function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#0a0f1a'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#0a0f1a' : '#ffffff'
}
