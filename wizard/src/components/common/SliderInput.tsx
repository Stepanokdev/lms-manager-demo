import { cn } from '@/utils/cn'

interface SliderInputProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  unit?: string
  className?: string
}

export function SliderInput({ label, value, min, max, onChange, unit = 'px', className }: SliderInputProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-white">{label}</span>
        <span className="rounded-lg bg-white/10 px-3 py-1 text-sm font-mono font-semibold text-accent-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-accent-500"
      />
      <div className="flex justify-between text-xs text-surface-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
