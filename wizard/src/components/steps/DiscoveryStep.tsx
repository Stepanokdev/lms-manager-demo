import { SectionTitle } from '@/components/common/SectionTitle'
import { OptionSelector } from '@/components/common/OptionSelector'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeatureById } from '@/data/features'
import { DiscoveryScreen } from '@/components/screens'

export function DiscoveryStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const feature = getFeatureById('discovery_type')!

  return (
    <div className="flex h-full flex-col px-12 py-8">
      <SectionTitle
        icon={feature.icon}
        title="Course Discovery"
        subtitle="How will users find and browse available courses?"
      />
      <div className="flex flex-1 items-center justify-center">
        <OptionSelector
          options={feature.options!}
          value={selections['discovery_type'] ?? 'native'}
          onChange={(val) => setSelection('discovery_type', val)}
          renderScreen={(val) => (
            <DiscoveryScreen variant={val as 'native' | 'none'} />
          )}
        />
      </div>
    </div>
  )
}
