import { motion } from 'motion/react'
import { cn } from '@/utils/cn'
import { PriceBadge } from './PriceBadge'
import { PremiumBadge } from './PremiumBadge'
import type { Feature } from '@/types/features'

interface FeatureCardProps {
  feature: Feature
  enabled: boolean
  onToggle: (enabled: boolean) => void
  onHover?: () => void
  /** When true the toggle is locked ON and cannot be disabled */
  locked?: boolean
  /** Reason shown below the subtitle when locked */
  lockedReason?: string
}

export function FeatureCard({ feature, enabled, onToggle, onHover, locked, lockedReason }: FeatureCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      type="button"
      onClick={() => {
        if (locked) return
        onToggle(!enabled)
      }}
      onMouseEnter={onHover}
      className={cn(
        'group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200',
        locked && 'cursor-default',
        enabled
          ? 'border-accent-500/40 bg-accent-500/5 shadow-[0_0_20px_rgba(6,182,212,0.05)]'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]',
      )}
    >
      <span className="text-2xl">{feature.icon}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-white">{feature.title}</span>
          {feature.isPremium && <PremiumBadge />}
        </div>
        <p className="mt-0.5 text-sm text-surface-400">{feature.subtitle}</p>
        {feature.priceNote && enabled && !lockedReason && (
          <p className="mt-1 text-xs text-surface-500">{feature.priceNote}</p>
        )}
        {lockedReason && (
          <p className="mt-1 text-xs font-medium text-amber-400/90">{lockedReason}</p>
        )}
      </div>

      <PriceBadge price={feature.price} backendCost={feature.backendCost} />

      {/* Toggle switch */}
      <div
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200',
          enabled ? 'bg-accent-500' : 'bg-surface-700',
          locked && 'opacity-60',
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </div>
    </motion.button>
  )
}
