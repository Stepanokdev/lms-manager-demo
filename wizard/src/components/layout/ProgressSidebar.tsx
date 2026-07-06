import { cn } from '@/utils/cn'
import { steps } from '@/data/steps'
import { useWizardStore } from '@/store/useWizardStore'

export function ProgressSidebar() {
  const currentStepIndex = useWizardStore((s) => s.currentStepIndex)
  const setStep = useWizardStore((s) => s.setStep)

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-white/10 bg-surface-900/80 backdrop-blur-sm">
      <div className="border-b border-white/10 p-6">
        <h1 className="text-lg font-bold text-white">Open X Project</h1>
        <p className="text-sm text-surface-400">App Configurator</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {steps.map((step) => {
            const isActive = step.index === currentStepIndex
            const isCompleted = step.index < currentStepIndex
            return (
              <li key={step.id}>
                <button
                  onClick={() => setStep(step.index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200',
                    isActive && 'bg-accent-500/15 text-accent-400',
                    isCompleted && 'text-surface-300 hover:bg-white/5',
                    !isActive && !isCompleted && 'text-surface-500 hover:bg-white/5 hover:text-surface-300',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                      isActive && 'bg-accent-500 text-surface-950',
                      isCompleted && 'bg-white/10 text-white',
                      !isActive && !isCompleted && 'bg-white/5 text-surface-500',
                    )}
                  >
                    {isCompleted ? '✓' : step.index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{step.title}</div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <a
          href="/dashboard"
          className="flex items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm text-surface-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          &larr; Back to Dashboard
        </a>
      </div>
    </aside>
  )
}
