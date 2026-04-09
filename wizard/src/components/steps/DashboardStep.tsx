import { SectionTitle } from '@/components/common/SectionTitle'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeatureById } from '@/data/features'
import { LearnScreen } from '@/components/screens'
import type { FeatureOption } from '@/types/features'
import { cn } from '@/utils/cn'

export function DashboardStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const feature = getFeatureById('dashboard_type')!
  const options = feature.options as [FeatureOption, FeatureOption]
  const value = selections['dashboard_type'] ?? 'gallery'

  return (
    <div className="flex h-full">
      {/* Left: title + options */}
      <div className="flex w-[380px] flex-shrink-0 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle
          icon={feature.icon}
          title="Dashboard Layout"
          subtitle="How should enrolled courses be displayed?"
        />
        <div className="mt-4 space-y-3">
          {options.map((option) => {
            const isSelected = value === option.value
            return (
              <button
                key={String(option.value)}
                onClick={() => setSelection('dashboard_type', option.value)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  isSelected
                    ? 'border-accent-500/50 bg-accent-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]',
                )}
              >
                <div className={cn('text-sm font-semibold', isSelected ? 'text-accent-400' : 'text-white')}>
                  {option.label}
                </div>
                <div className="mt-1 text-xs text-surface-400">{option.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: phone preview */}
      <div className="flex flex-1 items-center justify-center border-l border-white/5 bg-white/[0.01]">
        <PhonePreview label={value === 'gallery' ? 'Gallery' : 'List'} selected>
          <LearnScreen variant={value as 'gallery' | 'list'} />
        </PhonePreview>
      </div>
    </div>
  )
}
