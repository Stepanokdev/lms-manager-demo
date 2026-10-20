import type { StepDefinition } from '@/types/wizard'

export const steps: StepDefinition[] = [
  {
    id: 'welcome',
    index: 0,
    title: 'LMS Info',
    subtitle: 'Basic information about your LMS instance',
    icon: '🏫',
    featureIds: [],
  },
  {
    id: 'authentication',
    index: 1,
    title: 'Branding',
    subtitle: 'Colors, logo, and login screen appearance',
    icon: '🎨',
    featureIds: [],
  },
  {
    id: 'dashboard',
    index: 2,
    title: 'Dashboard',
    subtitle: 'How enrolled courses are displayed',
    icon: '📊',
    featureIds: ['dashboard_type'],
  },
  {
    id: 'course-features',
    index: 3,
    title: 'Course Features',
    subtitle: 'Enhance the learning experience',
    icon: '📚',
    featureIds: ['course_progress', 'course_dropdown_nav'],
  },
  {
    id: 'content-support',
    index: 4,
    title: 'Content Display',
    subtitle: 'How unsupported content types are handled',
    icon: '📶',
    featureIds: ['unknown_units_mode'],
  },
  {
    id: 'summary',
    index: 5,
    title: 'Review & Submit',
    subtitle: 'Review your configuration and submit',
    icon: '📋',
    featureIds: [],
  },
]

export const TOTAL_STEPS = steps.length
