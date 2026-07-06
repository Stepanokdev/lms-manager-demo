import { motion, AnimatePresence } from 'motion/react'
import { useWizardStore } from '@/store/useWizardStore'
import { useState, useCallback } from 'react'

type ValidationState = 'idle' | 'validating' | 'success' | 'error'

export function WelcomeStep() {
  const clientInfo = useWizardStore((s) => s.clientInfo)
  const setClientInfo = useWizardStore((s) => s.setClientInfo)
  const nextStep = useWizardStore((s) => s.nextStep)
  const lmsValidated = useWizardStore((s) => s.lmsValidated)
  const setLmsValidated = useWizardStore((s) => s.setLmsValidated)

  const [urlState, setUrlState] = useState<ValidationState>(lmsValidated ? 'success' : 'idle')
  const [oauthState, setOauthState] = useState<ValidationState>(lmsValidated ? 'success' : 'idle')
  const [urlError, setUrlError] = useState('')
  const [oauthError, setOauthError] = useState('')

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-base text-white placeholder-surface-500 outline-none transition-colors focus:border-accent-500/50 focus:bg-white/[0.07]'

  const canValidate = clientInfo.baseUrl.startsWith('http') && clientInfo.oauthClientId.length > 5

  const validate = useCallback(async () => {
    if (!canValidate) return
    setUrlState('validating')
    setOauthState('idle')
    setUrlError('')
    setOauthError('')
    setLmsValidated(false)

    try {
      const res = await fetch('/validate-lms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: clientInfo.baseUrl,
          oauth_client_id: clientInfo.oauthClientId,
        }),
      })
      const data = await res.json()

      if (data.url_valid) {
        setUrlState('success')
      } else {
        setUrlState('error')
        setUrlError(data.url_error || 'Cannot reach this LMS')
        return
      }

      if (data.oauth_valid) {
        setOauthState('success')
        setLmsValidated(true)
      } else {
        setOauthState('error')
        setOauthError(data.oauth_error || 'Invalid OAuth Client ID')
      }
    } catch {
      setUrlState('error')
      setUrlError('Validation request failed. Please try again.')
    }
  }, [clientInfo.baseUrl, clientInfo.oauthClientId, canValidate])

  const handleNext = () => {
    if (lmsValidated) nextStep()
  }

  const stateIcon = (state: ValidationState) => {
    if (state === 'validating') return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent-400 border-t-transparent" />
    if (state === 'success') return <span className="text-emerald-400">&#10003;</span>
    if (state === 'error') return <span className="text-red-400">&#10007;</span>
    return null
  }

  // Reset validation when URL or OAuth changes
  const onUrlChange = (v: string) => {
    setClientInfo({ baseUrl: v })
    setLmsValidated(false)
    setUrlState('idle')
    setOauthState('idle')
  }
  const onOauthChange = (v: string) => {
    setClientInfo({ oauthClientId: v })
    setLmsValidated(false)
    setOauthState('idle')
  }

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-xl px-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-4 text-6xl text-center"
        >
          🏫
        </motion.div>

        <h1 className="text-4xl font-bold tracking-tight text-white text-center">
          Register your
          <span className="mt-1 block bg-gradient-to-r from-accent-400 to-primary-400 bg-clip-text text-transparent">
            LMS Instance
          </span>
        </h1>

        <p className="mx-auto mt-3 max-w-md text-lg text-surface-400 text-center">
          Configure how your Open edX instance appears in the Open X Project mobile app.
          <br />
          <span className="text-sm text-surface-500">Requires Open edX Ulmo or newer.</span>
        </p>

        <div className="mt-8 space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={clientInfo.lmsName}
              onChange={(e) => setClientInfo({ lmsName: e.target.value })}
              placeholder="LMS Instance Name"
              className={inputClass}
            />
            <input
              type="text"
              value={clientInfo.platformName}
              onChange={(e) => setClientInfo({ platformName: e.target.value })}
              placeholder="Platform Name"
              className={inputClass}
            />
          </div>

          {/* Base URL with validation indicator */}
          <div className="relative">
            <input
              type="url"
              value={clientInfo.baseUrl}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="Base URL (https://lms.example.com)"
              className={inputClass + (urlState === 'error' ? ' border-red-500/50' : urlState === 'success' ? ' border-emerald-500/50' : '')}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">{stateIcon(urlState)}</div>
          </div>
          <AnimatePresence>
            {urlError && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-red-400 -mt-2 px-1">
                {urlError}
              </motion.p>
            )}
          </AnimatePresence>

          {/* OAuth Client ID with validation indicator */}
          <div className="relative">
            <input
              type="text"
              value={clientInfo.oauthClientId}
              onChange={(e) => onOauthChange(e.target.value)}
              placeholder="OAuth Client ID"
              className={inputClass + (oauthState === 'error' ? ' border-red-500/50' : oauthState === 'success' ? ' border-emerald-500/50' : '')}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">{stateIcon(oauthState)}</div>
          </div>
          <div className="flex items-center justify-between -mt-2 px-1">
            <AnimatePresence>
              {oauthError ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-red-400">
                  {oauthError}
                </motion.p>
              ) : <span />}
            </AnimatePresence>
            <a href="https://openedx.atlassian.net/wiki/spaces/OEPM/pages/edit-v2/6140166146?draftShareId=09d453d6-94f5-4ef4-882d-02662905d278" target="_blank" rel="noopener noreferrer" className="text-xs text-accent-400 hover:text-accent-300 transition-colors shrink-0">
              How to get OAuth Client ID? &rarr;
            </a>
          </div>

          <input
            type="text"
            value={clientInfo.description}
            onChange={(e) => setClientInfo({ description: e.target.value })}
            placeholder="Description (optional)"
            className={inputClass}
          />

          <input
            type="email"
            value={clientInfo.feedbackEmail}
            onChange={(e) => setClientInfo({ feedbackEmail: e.target.value })}
            placeholder="Feedback email"
            className={inputClass}
          />

          {/* Validate + Next */}
          {!lmsValidated ? (
            <motion.button
              onClick={validate}
              disabled={!canValidate || urlState === 'validating'}
              whileHover={canValidate ? { scale: 1.02 } : {}}
              whileTap={canValidate ? { scale: 0.98 } : {}}
              className="w-full rounded-xl bg-white/10 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {urlState === 'validating' ? 'Checking connection...' : 'Verify LMS Connection'}
            </motion.button>
          ) : (
            <motion.button
              onClick={handleNext}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl bg-accent-500 px-8 py-4 text-lg font-semibold text-surface-950 transition-colors hover:bg-accent-400"
            >
              Next: Branding →
            </motion.button>
          )}

          {lmsValidated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 justify-center text-sm text-emerald-400"
            >
              <span>&#10003;</span> LMS verified successfully
            </motion.div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-surface-600">
          Use arrow keys ← → to navigate between steps
        </p>
      </motion.div>
    </div>
  )
}
