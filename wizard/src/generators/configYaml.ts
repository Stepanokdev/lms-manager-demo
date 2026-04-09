import yaml from 'js-yaml'

export function generateConfigYaml(selections: Record<string, string | boolean | number>, companyName: string): string {
  const config: Record<string, unknown> = {
    API_HOST_URL: 'https://your-lms.example.com',
    SSO_URL: 'https://your-lms.example.com',
    SSO_FINISHED_URL: 'https://your-lms.example.com',
    OAUTH_CLIENT_ID: '',
    TOKEN_TYPE: 'JWT',
    ENVIRONMENT_DISPLAY_NAME: companyName || 'Production',
    FEEDBACK_EMAIL_ADDRESS: 'support@example.com',
    PLATFORM_NAME: companyName || 'OpenEdX',
    URI_SCHEME: 'openedx',

    PRE_LOGIN_EXPERIENCE_ENABLED: selections['pre_login_experience'] ?? false,
    DISCOVERY: {
      TYPE: selections['discovery_type'] ?? 'native',
    },

    DASHBOARD: {
      TYPE: selections['dashboard_type'] ?? 'gallery',
    },

    PROGRAM: selections['programs']
      ? {
          TYPE: 'webview',
          WEBVIEW: {
            BASE_URL: 'https://your-lms.example.com/dashboard/programs',
            PROGRAM_DETAIL_TEMPLATE: 'https://your-lms.example.com/programs/{path_id}',
            COURSE_DETAIL_TEMPLATE: 'https://your-lms.example.com/courses/{path_id}/about',
          },
        }
      : { TYPE: 'none' },

    GOOGLE: {
      ENABLED: selections['social_google'] ?? false,
      CLIENT_ID: '',
    },

    FACEBOOK: {
      ENABLED: selections['social_facebook'] ?? false,
      FACEBOOK_APP_ID: '',
      CLIENT_TOKEN: '',
    },

    MICROSOFT: {
      ENABLED: selections['social_microsoft'] ?? false,
      CLIENT_ID: '',
    },

    APPLE_SIGNIN: {
      ENABLED: !!(selections['social_apple'] || selections['social_google'] || selections['social_facebook'] || selections['social_microsoft']),
    },

    FIREBASE: {
      ENABLED: selections['firebase'] ?? false,
      ANALYTICS_SOURCE: 'firebase',
      CLOUD_MESSAGING_ENABLED: selections['firebase'] ?? false,
      API_KEY: '',
      BUNDLE_ID: '',
      CLIENT_ID: '',
      GCM_SENDER_ID: '',
      GOOGLE_APP_ID: '',
      PROJECT_ID: '',
      REVERSED_CLIENT_ID: '',
      STORAGE_BUCKET: '',
    },

    BRAZE: {
      ENABLED: selections['braze'] ?? false,
      PUSH_NOTIFICATIONS_ENABLED: selections['braze'] ?? false,
    },

    BRANCH: {
      ENABLED: selections['branch'] ?? false,
      KEY: '',
    },

    UI_COMPONENTS: {
      COURSE_DROPDOWN_NAVIGATION_ENABLED: selections['course_dropdown_nav'] ?? false,
      COURSE_UNIT_PROGRESS_ENABLED: selections['course_progress'] ?? false,
      LOGIN_REGISTRATION_ENABLED: !(selections['sso_saml'] && selections['sso_only']),
      SAML_SSO_LOGIN_ENABLED: selections['sso_saml'] ?? false,
      SAML_SSO_DEFAULT_LOGIN_BUTTON: selections['sso_saml'] ?? false,
    },

    THEME: {
      ROUNDED_CORNERS_STYLE: selections['rounded_corners'] ?? true,
      BUTTON_CORNERS_RADIUS: selections['button_radius'] ?? 8,
    },

    // TODO: Uncomment when official Open edX offline mode is released
    // EXPERIMENTAL_FEATURES: {
    //   APP_LEVEL_DOWNLOADS: {
    //     ENABLED: selections['app_level_downloads'] ?? false,
    //   },
    // },

    AGREEMENT_URLS: {
      PRIVACY_POLICY_URL: '',
      TOS_URL: '',
      COOKIE_POLICY_URL: '',
      DATA_SELL_CONSENT_URL: '',
      SUPPORTED_LANGUAGES: [],
    },

    SSO_BUTTON_TITLE: {
      en: 'Sign in with SSO',
    },
  }

  return yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    quotingType: "'",
  })
}
