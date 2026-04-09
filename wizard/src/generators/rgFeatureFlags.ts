import yaml from 'js-yaml'

export function generateRgFeatureFlags(selections: Record<string, string | boolean | number>): string {
  const flags: Record<string, unknown> = {
    LMS_SELECTION_ENABLED: selections['lms_selection'] ?? false,
    LOCAL_OFFLINE_MODE_ENABLED: selections['offline_mode'] ?? false,
    SMART_PUSH_NOTIFICATIONS_ENABLED: selections['smart_push'] ?? false,
    PDF_SUPPORT_ENABLED: selections['pdf_support'] ?? false,
    SCORM_SUPPORT_ENABLED: selections['scorm_support'] ?? false,
    AI_ASSIST_ENABLED: selections['ai_assistant'] ?? false,
  }

  if (selections['ai_assistant']) {
    flags['AI_ASSIST_BASE_URL'] = 'https://edx-ai.fly.dev'
  }

  return yaml.dump(flags, {
    indent: 2,
    quotingType: '"',
    sortKeys: false,
  })
}
