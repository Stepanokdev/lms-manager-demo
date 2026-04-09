import { SectionTitle } from '@/components/common/SectionTitle'
import { FeatureCard } from '@/components/common/FeatureCard'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeaturesByCategory } from '@/data/features'

export function IntegrationsStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const integrations = getFeaturesByCategory('integrations')

  return (
    <div className="flex h-full flex-col px-12 py-8">
      <SectionTitle
        icon="🔌"
        title="Integrations"
        subtitle="Analytics and third-party services"
      />

      <div className="mx-auto w-full max-w-2xl space-y-3">
        {integrations.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            enabled={selections[feature.id] === true}
            onToggle={(val) => setSelection(feature.id, val)}
          />
        ))}
      </div>
    </div>
  )
}
