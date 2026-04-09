import { SectionTitle } from '@/components/common/SectionTitle'
import { FeatureCard } from '@/components/common/FeatureCard'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeaturesByCategory } from '@/data/features'
import { LoginScreen } from '@/components/screens'
import { useState } from 'react'
import { cn } from '@/utils/cn'
import { motion, AnimatePresence } from 'motion/react'

export function AuthenticationStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const authFeatures = getFeaturesByCategory('authentication')
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null)

  const ssoFeature = authFeatures.find((f) => f.id === 'sso_saml')!
  const socialFeatures = authFeatures.filter((f) => f.id !== 'sso_saml')

  const ssoEnabled = selections['sso_saml'] === true
  const ssoOnly = selections['sso_only'] === true
  const loginRegistrationEnabled = !ssoEnabled || !ssoOnly

  // App Store Review Guideline 4.8: if any third-party social login is enabled,
  // Apple Sign In must also be offered.
  const hasNonAppleSocial = ['social_google', 'social_facebook', 'social_microsoft']
    .some((id) => selections[id] === true)
  const appleRequired = hasNonAppleSocial

  return (
    <div className="flex h-full">
      <div className="flex max-w-xl flex-1 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle
          icon="🔑"
          title="Authentication"
          subtitle="How will users sign in?"
        />

        <div className="space-y-3">
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-surface-500">
              Enterprise SSO
            </h3>
            <FeatureCard
              feature={ssoFeature}
              enabled={ssoEnabled}
              onToggle={(val) => {
                setSelection('sso_saml', val)
                if (!val) setSelection('sso_only', false)
              }}
              onHover={() => setHoveredFeature('sso_saml')}
            />

            {/* SSO mode toggle — appears when SSO is enabled */}
            <AnimatePresence>
              {ssoEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 ml-10 flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-1">
                    {[
                      { value: false, label: 'SSO + Login' },
                      { value: true, label: 'SSO Only' },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          setSelection('sso_only', opt.value)
                          if (opt.value) {
                            // SSO Only — reset all social auth
                            for (const f of socialFeatures) {
                              setSelection(f.id, false)
                            }
                          }
                        }}
                        className={cn(
                          'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
                          ssoOnly === opt.value
                            ? 'bg-accent-500/20 text-accent-400 shadow-sm'
                            : 'text-surface-400 hover:text-surface-300',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 ml-10 text-xs text-surface-500">
                    {ssoOnly
                      ? 'Only SSO sign-in, no email/password form'
                      : 'SSO alongside standard email/password login'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {!ssoOnly && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 overflow-hidden"
              >
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-surface-500">
                  Social Sign-In
                </h3>
                {socialFeatures.map((feature) => {
                  const isApple = feature.id === 'social_apple'
                  const isLocked = isApple && appleRequired
                  return (
                    <FeatureCard
                      key={feature.id}
                      feature={feature}
                      enabled={isLocked || selections[feature.id] === true}
                      locked={isLocked}
                      lockedReason={isLocked ? 'Required by App Store (Guideline 4.8) when other social logins are enabled' : undefined}
                      onToggle={(val) => {
                        setSelection(feature.id, val)
                        // When enabling a non-Apple social, force Apple on
                        if (val && !isApple && !selections['social_apple']) {
                          setSelection('social_apple', true)
                        }
                      }}
                      onHover={() => setHoveredFeature(feature.id)}
                    />
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center border-l border-white/5 bg-white/[0.01]">
        <PhonePreview size="lg">
          <LoginScreen
            showGoogle={selections['social_google'] === true}
            showFacebook={selections['social_facebook'] === true}
            showMicrosoft={selections['social_microsoft'] === true}
            showApple={appleRequired || selections['social_apple'] === true}
            showSSO={ssoEnabled}
            loginRegistrationEnabled={loginRegistrationEnabled}
          />
        </PhonePreview>
      </div>
    </div>
  )
}
