import { SectionTitle } from '@/components/common/SectionTitle'
import { FeatureCard } from '@/components/common/FeatureCard'
import { SliderInput } from '@/components/common/SliderInput'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeatureById } from '@/data/features'

export function ThemingStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const roundedFeature = getFeatureById('rounded_corners')!
  const buttonRadius = (selections['button_radius'] as number) ?? 8

  return (
    <div className="flex h-full">
      <div className="flex max-w-xl flex-1 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle icon="🎨" title="Theming" subtitle="Customize the visual style" />

        <div className="space-y-6">
          <FeatureCard
            feature={roundedFeature}
            enabled={selections['rounded_corners'] === true}
            onToggle={(val) => setSelection('rounded_corners', val)}
          />

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <SliderInput
              label="Button Corner Radius"
              value={buttonRadius}
              min={0}
              max={30}
              onChange={(val) => setSelection('button_radius', val)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center border-l border-white/5 bg-white/[0.01]">
        <PhonePreview size="lg">
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface-800 p-6">
            <div className="text-sm font-medium text-surface-300">Preview</div>
            <button
              className="w-full bg-accent-500 px-4 py-3 text-sm font-semibold text-white"
              style={{ borderRadius: `${buttonRadius}px` }}
            >
              Primary Button
            </button>
            <button
              className="w-full border border-accent-500 bg-transparent px-4 py-3 text-sm font-semibold text-accent-400"
              style={{ borderRadius: `${buttonRadius}px` }}
            >
              Secondary Button
            </button>
            <div
              className="w-full bg-white/10 px-4 py-3 text-center text-sm text-surface-300"
              style={{
                borderRadius: selections['rounded_corners'] ? `${buttonRadius}px` : '0px',
              }}
            >
              Card Element
            </div>
          </div>
        </PhonePreview>
      </div>
    </div>
  )
}
