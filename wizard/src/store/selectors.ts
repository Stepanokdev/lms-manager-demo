import { useWizardStore } from './useWizardStore'
import { features, getFeatureById } from '@/data/features'
import type { Feature } from '@/types/features'

export function useSelections() {
  return useWizardStore((s) => s.selections)
}

export function useSelection(featureId: string) {
  return useWizardStore((s) => s.selections[featureId])
}

export function useTotalPrice(): number {
  const selections = useWizardStore((s) => s.selections)
  let total = 0
  for (const feature of features) {
    const value = selections[feature.id]
    if (feature.valueType === 'boolean' && value === true && !feature.isIncludedInBase) {
      total += feature.price
    }
  }
  return total
}

export function useTotalBackendCost(): number {
  const selections = useWizardStore((s) => s.selections)
  let total = 0
  for (const feature of features) {
    const value = selections[feature.id]
    if (feature.valueType === 'boolean' && value === true && feature.backendCost > 0) {
      total += feature.backendCost
    }
  }
  return total
}

export function useEnabledFeatures(): Feature[] {
  const selections = useWizardStore((s) => s.selections)
  return features.filter((f) => {
    const value = selections[f.id]
    if (f.valueType === 'boolean') return value === true
    return value !== undefined
  })
}

export function useSelectedFeaturesSummary(): Array<{
  feature: Feature
  value: string | boolean | number
  cost: number
  backendCost: number
}> {
  const selections = useWizardStore((s) => s.selections)
  return features.map((f) => {
    const value = selections[f.id] ?? f.defaultValue
    const isEnabled = f.valueType === 'boolean' ? value === true : true
    return {
      feature: f,
      value,
      cost: isEnabled && !f.isIncludedInBase ? f.price : 0,
      backendCost: isEnabled ? f.backendCost : 0,
    }
  })
}
