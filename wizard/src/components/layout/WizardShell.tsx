import { useWizardStore } from '@/store/useWizardStore'
import { useKeyboardNav } from '@/hooks/useKeyboardNav'
import { setUserAccent } from '@/components/screens/shared'
import { ProgressSidebar } from './ProgressSidebar'
import { StepNavigation } from './StepNavigation'
import { SlideTransition } from './SlideTransition'

import { WelcomeStep } from '@/components/steps/WelcomeStep'
import { PreLoginStep } from '@/components/steps/PreLoginStep'
import { BrandingStep } from '@/components/steps/BrandingStep'
import { DashboardStep } from '@/components/steps/DashboardStep'
import { CourseFeaturesStep } from '@/components/steps/CourseFeaturesStep'
import { ContentSupportStep } from '@/components/steps/ContentSupportStep'
import { SummaryStep } from '@/components/steps/SummaryStep'

const stepComponents = [
  WelcomeStep,
  BrandingStep,
  PreLoginStep,
  DashboardStep,
  CourseFeaturesStep,
  ContentSupportStep,
  SummaryStep,
]

export function WizardShell() {
  const currentStepIndex = useWizardStore((s) => s.currentStepIndex)
  const direction = useWizardStore((s) => s.direction)
  const accentColor = useWizardStore((s) => s.clientInfo.accentColor)

  // Sync accent color to the shared screen theme
  setUserAccent(accentColor || '#42AAFF')

  useKeyboardNav()

  const StepComponent = stepComponents[currentStepIndex]!

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      <ProgressSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <SlideTransition stepIndex={currentStepIndex} direction={direction}>
            <StepComponent />
          </SlideTransition>
        </div>
        <StepNavigation />
      </div>
    </div>
  )
}
