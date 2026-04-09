import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'
import { ios } from '@/components/screens/shared'

const sizes = {
  sm: { w: 220, h: 470, radius: 32, island: { h: 22, w: 80 }, indicator: { w: 90, h: 4 }, topOffset: 2 },
  md: { w: 280, h: 590, radius: 36, island: { h: 26, w: 90 }, indicator: { w: 110, h: 4 }, topOffset: 2.5 },
  lg: { w: 300, h: 640, radius: 40, island: { h: 28, w: 100 }, indicator: { w: 120, h: 5 }, topOffset: 2.5 },
} as const

interface PhonePreviewProps {
  children?: React.ReactNode
  className?: string
  label?: string
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

function usePhoneScale(baseHeight: number) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight
      // Phone should be ~78% of viewport height, clamped between 0.55x and 2.0x
      const target = vh * 0.78
      setScale(Math.min(Math.max(target / baseHeight, 0.55), 2.0))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [baseHeight])

  return scale
}

export function PhonePreview({ children, className, label, selected, onClick, size = 'md' }: PhonePreviewProps) {
  const s = sizes[size]
  const scale = usePhoneScale(s.h)

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        className={cn(
          'group relative transition-all duration-300',
          onClick && 'cursor-pointer',
          selected && 'scale-[1.02]',
        )}
      >
        {/* Outer wrapper reserves scaled space in layout */}
        <div style={{ width: s.w * scale, height: s.h * scale }}>
          {/* Phone frame at original size, scaled via CSS transform */}
          <div
            className={cn(
              'relative overflow-hidden origin-top-left',
              selected && 'drop-shadow-[0_0_30px_rgba(91,134,119,0.3)]',
            )}
            style={{
              width: s.w,
              height: s.h,
              borderRadius: s.radius,
              backgroundColor: ios.bg,
              transform: `scale(${scale})`,
              boxShadow: selected
                ? `0 0 0 3px ${ios.accent}, 0 8px 40px ${ios.shadow}`
                : `0 0 0 1px ${ios.cardStroke}, 0 4px 24px ${ios.shadow}`,
            }}
          >
            {/* Dynamic Island */}
            <div className="absolute left-1/2 z-20 -translate-x-1/2" style={{ top: `${s.topOffset * 4}px` }}>
              <div
                className="rounded-full bg-black"
                style={{ height: s.island.h, width: s.island.w }}
              />
            </div>

            {/* Screen content */}
            <div className="relative h-full w-full overflow-hidden text-left">
              {children || (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-center" style={{ color: ios.textSecondary }}>
                    <div className="text-3xl">📱</div>
                    <div className="mt-2 text-xs">Preview</div>
                  </div>
                </div>
              )}
            </div>

            {/* Home indicator */}
            <div
              className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/20"
              style={{ width: s.indicator.w, height: s.indicator.h }}
            />
          </div>
        </div>
      </div>
      {label && (
        <span
          className={cn(
            'font-semibold transition-colors',
            size === 'sm' ? 'text-sm' : 'text-lg',
            selected ? 'text-accent-400' : 'text-surface-400',
          )}
        >
          {label}
        </span>
      )}
    </div>
  )
}
