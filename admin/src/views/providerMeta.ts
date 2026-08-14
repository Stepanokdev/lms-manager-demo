/**
 * The exact configuration a provider pastes into their own mobile builds.
 *
 * Both apps read the same `LMS_DIRECTORY` block from `default_config/<env>/config.yaml`
 * — only the indentation convention of the two repositories differs. Keep these
 * strings in step with the LMS Directory feature branches:
 *   iOS      openedx/openedx-app-ios      Core/Core/Configuration/Config/LMSDirectoryConfig.swift
 *   Android  openedx/openedx-app-android  core/.../config/LMSDirectoryConfig.kt
 */

export type Platform = 'ios' | 'android'

export const PLATFORM_LABEL: Record<Platform, string> = {
  ios: 'iOS',
  android: 'Android',
}

export const PLATFORM_REPO: Record<Platform, string> = {
  ios: 'openedx-app-ios',
  android: 'openedx-app-android',
}

export const PLATFORM_FILE: Record<Platform, string> = {
  ios: 'default_config/prod/config.yaml',
  android: 'default_config/prod/config.yaml',
}

export function configSnippet(platform: Platform, directoryUrl: string): string {
  // iOS's config files are indented four spaces, Android's two. Matching each
  // repository's own convention means the block can be pasted without reflowing.
  const pad = platform === 'ios' ? '    ' : '  '
  return [
    'LMS_DIRECTORY:',
    `${pad}ENABLED: true`,
    `${pad}DIRECTORY_URL: "${directoryUrl}"`,
    `${pad}DIRECTORY_MODE: "curated"`,
  ].join('\n')
}

export const KEY_NOTES: { key: string; what: string }[] = [
  {
    key: 'ENABLED',
    what: 'Turns the directory on. Left false, the app ignores everything below and behaves like a stock single-platform build.',
  },
  {
    key: 'DIRECTORY_URL',
    what: 'Your address, exactly as shown above — including the /p/… part. Point it at the bare site root and the app finds no catalog.',
  },
  {
    key: 'DIRECTORY_MODE',
    what: 'Set it to "curated". The registry says the same thing, but this is what the app falls back on when it cannot reach the registry at all — without it, an offline start opens a search box over every public platform instead of yours.',
  },
]
