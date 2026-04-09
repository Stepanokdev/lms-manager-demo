import { cn } from '@/utils/cn'
import { steps, TOTAL_STEPS } from '@/data/steps'
import { useWizardStore } from '@/store/useWizardStore'

export function StepNavigation() {
  const currentStepIndex = useWizardStore((s) => s.currentStepIndex)
  const nextStep = useWizardStore((s) => s.nextStep)
  const prevStep = useWizardStore((s) => s.prevStep)
  const lmsValidated = useWizardStore((s) => s.lmsValidated)

  const isFirst = currentStepIndex === 0
  const isLast = currentStepIndex === TOTAL_STEPS - 1
  const nextDisabled = isLast || (isFirst && !lmsValidated)

  return (
    <div className="flex h-16 flex-shrink-0 items-center justify-between border-t border-white/10 bg-surface-900/80 px-8 backdrop-blur-sm">
      <button
        onClick={prevStep}
        disabled={isFirst}
        className={cn(
          'rounded-lg px-5 py-2 text-sm font-medium transition-all',
          isFirst
            ? 'cursor-not-allowed text-surface-600'
            : 'text-surface-300 hover:bg-white/5 hover:text-white',
        )}
      >
        ← Back
      </button>

      <div className="flex items-center gap-2">
        {steps.map((step) => (
          <div
            key={step.id}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              step.index === currentStepIndex
                ? 'w-8 bg-accent-500'
                : step.index < currentStepIndex
                  ? 'w-1.5 bg-accent-500/40'
                  : 'w-1.5 bg-white/15',
            )}
          />
        ))}
      </div>

      <button
        onClick={nextStep}
        disabled={nextDisabled}
        className={cn(
          'rounded-lg px-5 py-2 text-sm font-medium transition-all',
          nextDisabled
            ? 'cursor-not-allowed text-surface-600'
            : 'bg-accent-500 text-surface-950 hover:bg-accent-400',
        )}
      >
        {isLast ? 'Done' : 'Next →'}
      </button>
    </div>
  )
}
