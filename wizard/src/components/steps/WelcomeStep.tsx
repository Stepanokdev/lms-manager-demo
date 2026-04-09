import { motion } from 'motion/react'
import { useWizardStore } from '@/store/useWizardStore'

export function WelcomeStep() {
  const clientInfo = useWizardStore((s) => s.clientInfo)
  const setClientInfo = useWizardStore((s) => s.setClientInfo)
  const nextStep = useWizardStore((s) => s.nextStep)

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-base text-white placeholder-surface-500 outline-none transition-colors focus:border-accent-500/50 focus:bg-white/[0.07]'

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
          Configure how your Open edX instance appears in the universal mobile app.
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

          <input
            type="url"
            value={clientInfo.baseUrl}
            onChange={(e) => setClientInfo({ baseUrl: e.target.value })}
            placeholder="Base URL (https://lms.example.com)"
            className={inputClass}
          />

          <input
            type="text"
            value={clientInfo.oauthClientId}
            onChange={(e) => setClientInfo({ oauthClientId: e.target.value })}
            placeholder="OAuth Client ID"
            className={inputClass}
          />

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

          <motion.button
            onClick={nextStep}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl bg-accent-500 px-8 py-4 text-lg font-semibold text-surface-950 transition-colors hover:bg-accent-400"
          >
            Next: Branding →
          </motion.button>
        </div>

        <p className="mt-4 text-center text-sm text-surface-600">
          Use arrow keys ← → to navigate between steps
        </p>
      </motion.div>
    </div>
  )
}
