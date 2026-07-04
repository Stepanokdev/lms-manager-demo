import { useState } from 'react'
import { motion } from 'motion/react'
import { useStore } from '@/store'
import { Button, Field, Input } from '@/components/ui'
import { IconLayers, IconServer, IconAlert, IconShield, IconEye, IconEyeOff } from '@/components/icons'
import { ApiError } from '@/lib/api'
import type { PublicConfig } from '@/lib/types'

export function AuthView({ config }: { config: PublicConfig | null }) {
  const login = useStore((s) => s.login)
  const register = useStore((s) => s.register)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(name.trim(), email.trim(), password)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const provider = config?.provider_name || 'Universal Open edX'

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 bg-surface-950 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — flat, editorial, no gradients or glows */}
      <div className="relative hidden flex-col justify-between border-r border-white/8 bg-surface-900/30 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04] text-xl text-accent-300">
            <IconLayers />
          </div>
          <div className="text-[15px] font-bold tracking-tight text-white">{provider}</div>
        </div>

        <div className="max-w-md">
          <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white">
            The registry behind one app for every platform
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-surface-400">
            Owners register their Open edX instance here. Admins keep the catalog safe and act on
            what learners report from the apps.
          </p>
          <ul className="mt-8 flex flex-col gap-3.5 text-sm text-surface-300">
            <Feature icon={<IconServer />} text="Every registered LMS in one searchable catalog" />
            <Feature icon={<IconAlert />} text="Learner complaints routed to a triage inbox" />
            <Feature icon={<IconShield />} text="Block a harmful instance in one click" />
          </ul>
        </div>

        <div className="text-xs text-surface-600">Open edX–approved pilot · operated independently</div>
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04] text-accent-300">
              <IconLayers />
            </div>
            <span className="text-sm font-bold text-white">{provider}</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-surface-400">
            {mode === 'login'
              ? 'Use your registry account. Owners land on their instances, admins on the console.'
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-surface-500 transition-colors hover:text-surface-200"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" loading={busy} className="mt-1 w-full py-3 text-base">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-surface-500">
            {mode === 'login' ? 'Own an LMS and need an account?' : 'Already have an account?'}{' '}
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
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-base text-accent-300">
        {icon}
      </span>
      {text}
    </li>
  )
}
