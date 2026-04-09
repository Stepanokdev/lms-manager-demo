import { useEffect } from 'react'
import { useWizardStore } from '@/store/useWizardStore'

export function useKeyboardNav() {
  const nextStep = useWizardStore((s) => s.nextStep)
  const prevStep = useWizardStore((s) => s.prevStep)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (isInput) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        prevStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextStep, prevStep])
}
