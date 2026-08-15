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

/** How the app gets the list: from your address, or from a file inside the app. */
export type Delivery = 'hosted' | 'bundled'

export const DELIVERY_LABEL: Record<Delivery, string> = {
  hosted: 'Read from this address',
  bundled: 'Ship the file in the app',
}

export function configSnippet(
  platform: Platform,
  directoryUrl: string,
  delivery: Delivery = 'hosted',
): string {
  // iOS's config files are indented four spaces, Android's two. Matching each
  // repository's own convention means the block can be pasted without reflowing.
  const pad = platform === 'ios' ? '    ' : '  '
  const lines = ['LMS_DIRECTORY:', `${pad}ENABLED: true`]
  if (delivery === 'bundled') {
    lines.push(`${pad}DIRECTORY_URL: ""`)
    lines.push(`${pad}DIRECTORY_FILE: "lms_directory.json"`)
  } else {
    lines.push(`${pad}DIRECTORY_URL: "${directoryUrl}/directory.json"`)
    lines.push(`${pad}DIRECTORY_FILE: ""`)
  }
  return lines.join('\n')
}

export const KEY_NOTES: Record<Delivery, { key: string; what: string }[]> = {
  hosted: [
    {
      key: 'ENABLED',
      what: 'Turns the directory on. Left false, the app ignores everything below and behaves like a stock single-platform build.',
    },
    {
      key: 'DIRECTORY_URL',
      what: 'Your address, exactly as shown above — including the /p/… part and the /directory.json on the end. Point it at the bare site root and the app finds no list.',
    },
    {
      key: 'DIRECTORY_FILE',
      what: 'Left empty here. Set it and the app reads the file instead, ignoring the address above.',
    },
  ],
  bundled: [
    {
      key: 'ENABLED',
      what: 'Turns the directory on. Left false, the app ignores everything below and behaves like a stock single-platform build.',
    },
    {
      key: 'DIRECTORY_FILE',
      what: 'The file from the bundle you downloaded. Add it to the app target on iOS, or to app/src/main/assets on Android, together with the images beside it.',
    },
    {
      key: 'DIRECTORY_URL',
      what: 'Empty, so the app never asks the network for its list. It works on a device that has never been online.',
    },
  ],
}
