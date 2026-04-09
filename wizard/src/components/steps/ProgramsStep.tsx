import { SectionTitle } from '@/components/common/SectionTitle'
import { FeatureCard } from '@/components/common/FeatureCard'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeatureById } from '@/data/features'
import { ProgramsScreen, LearnScreen } from '@/components/screens'

export function ProgramsStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const feature = getFeatureById('programs')!
  const enabled = selections['programs'] === true

  return (
    <div className="flex h-full">
      <div className="flex max-w-xl flex-1 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle
          icon="🎓"
          title="Programs"
          subtitle="Should users be able to browse learning programs?"
        />

        <div className="space-y-4">
          <FeatureCard
            feature={feature}
            enabled={enabled}
            onToggle={(val) => setSelection('programs', val)}
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center border-l border-white/5 bg-white/[0.01]">
        <PhonePreview size="lg">
          {enabled ? <ProgramsScreen /> : <LearnScreen />}
        </PhonePreview>
      </div>
    </div>
  )
}
