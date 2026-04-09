import { SectionTitle } from '@/components/common/SectionTitle'
import { FeatureCard } from '@/components/common/FeatureCard'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeaturesByCategory } from '@/data/features'
import {
  AIAssistantScreen,
  SmartPushScreen,
  LMSSelectionScreen,
} from '@/components/screens'
import { useState } from 'react'
import type { ReactNode } from 'react'

const featureScreenMap: Record<string, ReactNode> = {
  ai_assistant: <AIAssistantScreen />,
  smart_push: <SmartPushScreen />,
  lms_selection: <LMSSelectionScreen />,
}

export function PremiumFeaturesStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const premiumFeatures = getFeaturesByCategory('rg-premium')
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  const activeFeatureId =
    hoveredFeature ?? premiumFeatures.find((f) => selections[f.id] === true)?.id ?? null

  const activeScreen = activeFeatureId ? featureScreenMap[activeFeatureId] : null

  return (
    <div className="flex h-full">
      <div className="flex max-w-xl flex-1 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle
          icon="⭐"
          title="Premium Features"
          subtitle="Advanced features by RaccoonGang"
        />

        <div className="mb-4 flex items-center gap-2 rounded-lg border border-premium-500/20 bg-premium-500/5 px-4 py-2">
          <span className="text-premium-400">⭐</span>
          <span className="text-sm text-premium-400">
            These are exclusive RaccoonGang features not available in standard OpenEdX
          </span>
        </div>

        <div className="space-y-3">
          {premiumFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              enabled={selections[feature.id] === true}
              onToggle={(val) => setSelection(feature.id, val)}
              onHover={() => setHoveredFeature(feature.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center border-l border-white/5 bg-white/[0.01]">
        <PhonePreview size="lg">
          {activeScreen ?? (
            <div className="flex h-full flex-col items-center justify-center bg-[#1C1C1E] p-4">
              <div className="text-center">
                <div className="text-[32px]">⭐</div>
                <div className="mt-2 text-[12px] font-semibold text-white">Premium Features</div>
                <div className="mt-1 text-[9px] text-[#8E8E93]">
                  Hover over a feature to see preview
                </div>
              </div>
            </div>
          )}
        </PhonePreview>
      </div>
    </div>
  )
}
