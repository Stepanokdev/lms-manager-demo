import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'

interface PriceBadgeProps {
  price: number
  backendCost?: number
  className?: string
}

export function PriceBadge({ price, backendCost, className }: PriceBadgeProps) {
  const isIncluded = price === 0

  return (
    <div className={cn('flex flex-col items-end gap-0.5', className)}>
      <span
        className={cn(
          'rounded-full px-3 py-0.5 text-sm font-semibold',
          isIncluded ? 'bg-emerald-500/15 text-emerald-400' : 'bg-accent-500/15 text-accent-400',
        )}
      >
        {formatCurrency(price)}
      </span>
      {backendCost !== undefined && backendCost > 0 && (
        <span className="text-xs text-surface-500">+{formatCurrency(backendCost)} backend</span>
      )}
    </div>
  )
}
