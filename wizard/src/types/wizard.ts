export type StepId =
  | 'welcome'
  | 'pre-login'
  | 'authentication'
  | 'dashboard'
  | 'course-features'
  | 'content-support'
  | 'summary'

export interface ClientInfo {
  clientName: string
  companyName: string
  date: string
  // LMS fields
  lmsName: string
  baseUrl: string
  platformName: string
  oauthClientId: string
  description: string
  feedbackEmail: string
  accentColor: string
  logoUrl: string
  loginBackgroundUrl: string
}

export interface StepDefinition {
  id: StepId
  index: number
  title: string
  subtitle: string
  icon: string
  featureIds: string[]
}
