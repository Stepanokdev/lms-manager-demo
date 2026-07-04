import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { Button, Field, Input } from '@/components/ui'
import { IconLayers, IconServer, IconAlert, IconShield } from '@/components/icons'
import { ApiError } from '@/lib/api'
import type { PublicConfig } from '@/lib/types'

export function AuthView({ config }: { config: PublicConfig | null }) {
  const login = useStore((s) => s.login)
  const register = useStore((s) => s.register)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(name.trim(), email.trim(), password)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Something went wrong. Try again.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const provider = config?.provider_name || 'Universal Open edX'

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-r border-white/8 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle,#06b6d4,transparent 65%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-48 -left-24 h-[30rem] w-[30rem] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle,#2563eb,transparent 65%)' }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/30 to-primary-500/30 text-2xl text-accent-300">
            <IconLayers />
          </div>
          <div className="text-[15px] font-bold tracking-tight text-white">{provider}</div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tighter text-white">
            The registry behind
            <span className="mt-1 block bg-gradient-to-r from-accent-400 to-primary-400 bg-clip-text text-transparent">
              one app, every platform
            </span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-surface-400">
            Approve the Open edX instances that reach learners, keep an eye on their health, and act
            on complaints the moment they land from the mobile apps.
          </p>
          <ul className="mt-8 flex flex-col gap-3.5 text-sm text-surface-300">
            <Feature icon={<IconServer />} text="Every registered LMS, searchable at a glance" />
            <Feature icon={<IconAlert />} text="Complaints routed straight to your triage inbox" />
            <Feature icon={<IconShield />} text="Recheck an instance the second something breaks" />
          </ul>
        </div>

        <div className="relative text-xs text-surface-600">
          Open edX–approved pilot · operated independently
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm"
        >
          <div className="mb-1 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/20 text-accent-300">
              <IconLayers />
            </div>
            <span className="text-sm font-bold text-white">{provider}</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Sign in to the console' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-surface-400">
            {mode === 'login'
              ? 'Administrators only. Use your registry credentials.'
              : 'Register an owner account to submit and manage your LMS.'}
          </p>

          <form
            className="mt-7 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!busy) submit()
            }}
          >
            {mode === 'register' && (
              <Field label="Name">
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
              <Input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>

            <Button type="submit" variant="primary" loading={busy} className="mt-1 w-full py-3 text-base">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-surface-500">
            {mode === 'login' ? "Own an LMS and need an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
              }}
              className="font-semibold text-accent-300 transition-colors hover:text-accent-200"
            >
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-base text-accent-300">
        {icon}
      </span>
      {text}
    </li>
  )
}
