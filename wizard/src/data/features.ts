import type { Feature } from '@/types/features'

export const features: Feature[] = [
  // ── Dashboard ──────────────────────────────────────────
  {
    id: 'dashboard_type',
    configKey: 'DASHBOARD',
    configTarget: 'config.yaml',
    category: 'dashboard',
    title: 'Dashboard Layout',
    subtitle: 'How enrolled courses are displayed',
    icon: '📊',
    valueType: 'enum',
    defaultValue: 'gallery',
    options: [
      {
        value: 'gallery',
        label: 'Gallery',
        description: 'Card-based grid layout with course thumbnails',
        previewAsset: 'dashboard-gallery.png',
      },
      {
        value: 'list',
        label: 'List',
        description: 'Compact list view for quick navigation',
        previewAsset: 'dashboard-list.png',
      },
    ],
    price: 0,
    backendCost: 0,
    isIncludedInBase: true,
    isPremium: false,
    yamlPath: ['DASHBOARD', 'TYPE'],
  },

  // ── Course Features ────────────────────────────────────
  {
    id: 'course_progress',
    configKey: 'COURSE_UNIT_PROGRESS_ENABLED',
    configTarget: 'config.yaml',
    category: 'course-features',
    title: 'Course Progress Bar',
    subtitle: 'Shows current position and marks completed units within a section',
    icon: '📈',
    valueType: 'boolean',
    defaultValue: true,
    price: 0,
    backendCost: 0,
    isIncludedInBase: true,
    isPremium: false,
    yamlPath: ['UI_COMPONENTS', 'COURSE_UNIT_PROGRESS_ENABLED'],
    previewAsset: 'course-progress.png',
  },
  {
    id: 'course_dropdown_nav',
    configKey: 'COURSE_DROPDOWN_NAVIGATION_ENABLED',
    configTarget: 'config.yaml',
    category: 'course-features',
    title: 'Dropdown Navigation',
    subtitle: 'Quick jump between verticals (sections) within a lesson',
    icon: '📋',
    valueType: 'boolean',
    defaultValue: true,
    price: 0,
    backendCost: 0,
    isIncludedInBase: true,
    isPremium: false,
    yamlPath: ['UI_COMPONENTS', 'COURSE_DROPDOWN_NAVIGATION_ENABLED'],
    previewAsset: 'course-dropdown-nav.png',
  },

  // ── Content Display ────────────────────────────────────
  {
    id: 'unknown_units_mode',
    configKey: 'UNKNOWN_UNITS_MODE',
    configTarget: 'config.yaml',
    category: 'content-support',
    title: 'Unsupported Content',
    subtitle: 'How to handle unit types not natively supported on mobile',
    icon: '📦',
    valueType: 'enum',
    defaultValue: 'block',
    options: [
      {
        value: 'block',
        label: 'Block',
        description: 'Show "Not available on mobile" message with an option to open in browser',
        previewAsset: 'unknown-block.png',
      },
      {
        value: 'webview',
        label: 'Show in WebView',
        description: 'Display content in embedded browser with an info banner about potential display issues',
        previewAsset: 'unknown-webview.png',
      },
    ],
    price: 0,
    backendCost: 0,
    isIncludedInBase: true,
    isPremium: false,
    yamlPath: ['UNKNOWN_UNITS_MODE'],
  },
]

export function getFeatureById(id: string): Feature | undefined {
  return features.find((f) => f.id === id)
}

export function getFeaturesByCategory(category: Feature['category']): Feature[] {
  return features.filter((f) => f.category === category)
}
