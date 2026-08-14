import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import type { PublicConfig } from '@/lib/types'
import { Shell, PROVIDER_NAV } from '@/components/Shell'
import { Toasts } from '@/components/Toasts'
import { AuthView } from '@/views/AuthView'
import { OverviewView } from '@/views/OverviewView'
import { LMSView } from '@/views/LMSView'
import { ReportsView } from '@/views/ReportsView'
import { AdminsView } from '@/views/AdminsView'
import { OwnerView } from '@/views/OwnerView'
import { OrgsView } from '@/views/OrgsView'
import { ProviderView } from '@/views/ProviderView'
import { AppConfigView } from '@/views/AppConfigView'
import { OrgSettingsView } from '@/views/OrgSettingsView'
import { IconLayers } from '@/components/icons'

const POLL_MS = 20000

export default function App() {
  const authState = useStore((s) => s.authState)
  const view = useStore((s) => s.view)
  const user = useStore((s) => s.user)
  const org = useStore((s) => s.org)
  const bootstrap = useStore((s) => s.bootstrap)
  const refreshStats = useStore((s) => s.refreshStats)
  const [config, setConfig] = useState<PublicConfig | null>(null)

  const isAdmin = user?.role === 'admin'
  const isPortal = config?.directory_mode === 'portal'

  useEffect(() => {
    bootstrap()
    api.config().then(setConfig).catch(() => setConfig(null))
  }, [bootstrap])

  // Live polling for the complaints badge (admins only).
  useEffect(() => {
    if (authState !== 'authed' || !isAdmin) return
    const tick = () => {
      if (document.visibilityState === 'visible') refreshStats()
    }
    const interval = setInterval(tick, POLL_MS)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', tick)
    }
  }, [authState, isAdmin, refreshStats])

  if (authState === 'loading') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas text-muted">
        <span className="flex items-center gap-3">
          <span className="text-2xl text-brand-500">
            <IconLayers />
          </span>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand-500" />
        </span>
      </div>
    )
  }

  if (authState === 'anon') {
    return (
      <>
        <AuthView config={config} />
        <Toasts />
      </>
    )
  }

  // Portal mode: a provider account manages its own directory, and nothing else.
  // Their workspace is the shell too, because they have three sections to move
  // between — not the single-page owner view.
  if (isPortal && !isAdmin) {
    return (
      <>
        <Shell config={config} nav={PROVIDER_NAV} subtitle="Provider portal" brand={org?.name}>
          <AnimatePresence mode="wait">
            <motion.div key={view} {...viewTransition}>
              {view === 'appconfig' ? (
                <AppConfigView />
              ) : view === 'organization' ? (
                <OrgSettingsView />
              ) : (
                <ProviderView />
              )}
            </motion.div>
          </AnimatePresence>
        </Shell>
        <Toasts />
      </>
    )
  }

  // LMS owners get a focused view of their own instances; admins get the console.
  if (!isAdmin) {
    return (
      <>
        <OwnerView config={config} />
        <Toasts />
      </>
    )
  }

  return (
    <>
      <Shell config={config} subtitle={isPortal ? 'Registry operator' : undefined}>
        <AnimatePresence mode="wait">
          <motion.div key={view} {...viewTransition}>
            {view === 'overview' && <OverviewView config={config} />}
            {view === 'lms' && <LMSView config={config} />}
            {view === 'reports' && <ReportsView />}
            {view === 'admins' && <AdminsView />}
            {view === 'orgs' && <OrgsView />}
          </motion.div>
        </AnimatePresence>
      </Shell>
      <Toasts />
    </>
  )
}

const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}
