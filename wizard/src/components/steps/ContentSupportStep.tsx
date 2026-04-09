import { SectionTitle } from '@/components/common/SectionTitle'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeaturesByCategory } from '@/data/features'
import { NotAvailableScreen, WebViewUnitScreen } from '@/components/screens'
import type { FeatureOption } from '@/types/features'
import { cn } from '@/utils/cn'

export function ContentSupportStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const contentFeatures = getFeaturesByCategory('content-support')
  const feature = contentFeatures[0]
  const options = feature?.options as FeatureOption[] | undefined
  const value = selections['unknown_units_mode'] ?? 'block'

  return (
    <div className="flex h-full">
      {/* Left: title + options */}
      <div className="flex w-[380px] flex-shrink-0 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle icon="📶" title="Content Display" subtitle="How to handle unsupported content types" />

        {options && (
          <div className="mt-4 space-y-3">
            {options.map((option) => {
              const isSelected = value === option.value
              return (
                <button
                  key={String(option.value)}
                  onClick={() => setSelection('unknown_units_mode', option.value)}
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
        )}

        {/* Supported content types */}
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-500">Supported out of the box</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ['Video', 'MP4, HLS, YouTube'],
              ['HTML', 'Rich content via WebView'],
              ['Problems', 'Quizzes & assessments'],
              ['Discussions', 'Native forums'],
              ['Drag & Drop', 'Interactive exercises'],
              ['Surveys', 'Via WebView'],
              ['ORA', 'Peer/self assessments'],
            ].map(([name, desc]) => (
              <div key={name} className="flex items-start gap-2 rounded-lg px-2 py-1.5">
                <span className="mt-0.5 text-xs text-accent-400">•</span>
                <div>
                  <span className="text-xs font-medium text-white">{name}</span>
                  <span className="ml-1 text-[10px] text-surface-500">{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-surface-500 leading-relaxed">
            Custom XBlock types not listed here will be handled based on the setting above.
          </p>
        </div>
      </div>

      {/* Right: two phone previews */}
      <div className="flex flex-1 items-center justify-center gap-12 border-l border-white/5 bg-white/[0.01]">
        <PhonePreview label="Block" selected={value === 'block'} onClick={() => setSelection('unknown_units_mode', 'block')}>
          <NotAvailableScreen />
        </PhonePreview>
        <PhonePreview label="WebView" selected={value === 'webview'} onClick={() => setSelection('unknown_units_mode', 'webview')}>
          <WebViewUnitScreen />
        </PhonePreview>
      </div>
    </div>
  )
}
