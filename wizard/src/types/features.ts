export type FeatureCategory =
  | 'pre-login'
  | 'authentication'
  | 'discovery'
  | 'dashboard'
  | 'programs'
  | 'course-features'
  | 'content-support'
  | 'rg-premium'
  | 'integrations'
  | 'theming'

export type FeatureValueType = 'boolean' | 'enum' | 'number'

export type ConfigTarget = 'config.yaml' | 'rg-feature-flags.yaml'

export interface FeatureOption {
  value: string | boolean | number
  label: string
  description: string
  previewAsset?: string
}

export interface Feature {
  id: string
  configKey: string
  configTarget: ConfigTarget
  category: FeatureCategory

  title: string
  subtitle: string
  icon: string

  valueType: FeatureValueType
  defaultValue: string | boolean | number
  options?: FeatureOption[]
  min?: number
  max?: number

  price: number
  backendCost: number
  priceNote?: string
  isIncludedInBase: boolean
  isPremium: boolean

  previewAsset?: string

  yamlPath: string[]
}
