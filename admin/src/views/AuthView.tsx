import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { Button, Field, Input } from '@/components/ui'
import { IconLayers, IconServer, IconAlert, IconShield, IconEye, IconEyeOff, IconBook, IconLink } from '@/components/icons'
import { ApiError } from '@/lib/api'
import type { PublicConfig } from '@/lib/types'

export function AuthView({ config }: { config: PublicConfig | null }) {
  const login = useStore((s) => s.login)
  const register = useStore((s) => s.register)
  // A landing page can link straight to sign-up with /dashboard?mode=register.
  const [mode, setMode] = useState<'login' | 'register'>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login',
  )
  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const provider = config?.provider_name || 'Open X Project'
  // Curated (institution) registry: no public sign-up, no moderation framing.
  const isCurated = config?.directory_mode === 'curated'
  // Provider portal: signing up creates an organization, so the form asks for one.
  const isPortal = config?.directory_mode === 'portal'
  const isDemo = !!config?.shared_demo && !isPortal && !isCurated

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else if (isPortal) {
        await register(name.trim(), email.trim(), password, { name: orgName.trim() })
      } else await register(name.trim(), email.trim(), password)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — flat, editorial, no gradients or glows */}
      <div className="relative hidden flex-col justify-between border-r border-line bg-card p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas-2 text-xl text-link">
            <IconLayers />
          </div>
          <div className="text-[15px] font-bold tracking-tight text-ink">{provider}</div>
        </div>

        <div className="max-w-md">
          <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-tight text-ink">
            {isDemo
              ? 'Add your platform to the shared demo'
              : isPortal
              ? 'Your platforms, in your own app'
              : isCurated
                ? 'Your organization’s platforms, in one app'
                : 'The registry behind one app for every platform'}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            {isDemo
              ? 'Create an account, register your Open edX platform, and it appears in the demo iOS and Android apps next to everyone else’s. You can remove it at any time.'
              : isPortal
              ? 'Register your organization, add the Open edX platforms you run, and get one address to put in your own iOS and Android builds. Your app lists your platforms and nobody else’s.'
              : isCurated
                ? 'Manage the Open edX platforms your learners choose from in the app. Add a platform, brand it, and control which ones appear.'
                : 'Owners register their Open edX instance here. Admins keep the catalog safe and act on what learners report from the apps.'}
          </p>
          <ul className="mt-8 flex flex-col gap-3.5 text-sm text-ink-soft">
            {isDemo ? (
              <>
                <Feature icon={<IconServer />} text="One shared list, read by both demo apps" />
                <Feature icon={<IconLink />} text="Your address and OAuth client, checked live" />
                <Feature icon={<IconShield />} text="Only you can edit or remove your platform" />
              </>
            ) : isPortal ? (
              <>
                <Feature icon={<IconServer />} text="Add every platform you run, in the order you choose" />
                <Feature icon={<IconLink />} text="One address to paste into your app config" />
                <Feature icon={<IconShield />} text="Only you can change your list" />
              </>
            ) : isCurated ? (
              <>
                <Feature icon={<IconServer />} text="All your platforms in one place" />
                <Feature icon={<IconEye />} text="Show or hide each one in the app" />
                <Feature icon={<IconShield />} text="Brand the app to your organization" />
              </>
            ) : (
              <>
                <Feature icon={<IconServer />} text="Every registered LMS in one searchable catalog" />
                <Feature icon={<IconAlert />} text="Learner complaints routed to a triage inbox" />
                <Feature icon={<IconShield />} text="Block a harmful instance in one click" />
              </>
            )}
          </ul>
        </div>

        <div className="text-xs text-faint">
          {isDemo
            ? 'Public demo by Raccoon Gang · not an official Open edX service'
            : 'Open edX–approved pilot · operated independently'}
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas-2 text-link">
              <IconLayers />
            </div>
            <span className="text-sm font-bold text-ink">{provider}</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-ink">
            {mode === 'login'
              ? 'Sign in'
              : isPortal
                ? 'Register your organization'
                : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {mode === 'register'
              ? isPortal
                ? 'One account per organization. You’ll get your directory address as soon as you’re in.'
                : 'Register an owner account to submit and manage your LMS.'
              : isPortal
                ? 'Sign in to manage your organization’s platforms and app config.'
                : isCurated
                  ? 'Sign in to manage your organization’s platforms.'
                  : 'Use your registry account. Owners land on their instances, admins on the console.'}
          </p>

          <form
            className="mt-7 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!busy) submit()
            }}
          >
            {mode === 'register' && isPortal && (
              <Field
                label="Organization"
                hint="Your address is built from this name. It stays the same afterwards, even if you rename."
              >
                <Input
                  name="organization"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Northwind Education Group"
                  autoComplete="organization"
                  maxLength={120}
                />
              </Field>
            )}
            {mode === 'register' && (
              <Field label={isPortal ? 'Your name' : 'Name'}>
                <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Alvarez" autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <Input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password" error={error || undefined}>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted transition-colors hover:text-ink-soft"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" loading={busy} className="mt-1 w-full py-3 text-base">
              {mode === 'login' ? 'Sign in' : isPortal ? 'Create organization' : 'Create account'}
            </Button>
          </form>

          {/* No public sign-up in curated mode — admins are provisioned deliberately. */}
          {!isCurated && (
            <div className="mt-6 text-center text-sm text-muted">
              {mode === 'login'
                ? isPortal
                  ? 'Run Open edX platforms and want your own app?'
                  : 'Own an LMS and need an account?'
                : 'Already have an account?'}{' '}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError('')
                }}
                className="font-semibold text-link transition-colors hover:text-link-hover"
              >
                {mode === 'login' ? (isPortal ? 'Register your organization' : 'Create one') : 'Sign in'}
              </button>
            </div>
          )}

          <div className="mt-8 border-t border-line pt-5 text-center">
            <a
              href="/guide/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-link transition-colors hover:text-link-hover"
            >
              <IconBook /> How it works — read the documentation
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas-2 text-base text-link">
        {icon}
      </span>
      {text}
    </li>
  )
}
