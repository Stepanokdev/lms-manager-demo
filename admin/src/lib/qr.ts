import QRCode from 'qrcode'
import type { LMS } from '@/lib/types'

/**
 * Build a high-resolution QR of the LMS address as a PNG data URL. Shown in the QR
 * dialog so anyone can scan it in the app's "Find your LMS" reader (or right-click →
 * save). Shared by the owner workspace and the admin console so both show the same code.
 */
export function makeLmsQrDataUrl(lms: Pick<LMS, 'base_url'>): Promise<string> {
  return makeQrDataUrl(lms.base_url)
}

/** The same code for any URL — used for a provider's directory address too. */
export function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 720,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0A3055', light: '#FFFFFF' },
  })
}
