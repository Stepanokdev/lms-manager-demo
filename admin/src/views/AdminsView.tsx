import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { api, ApiError } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import { useStore } from '@/store'
import { timeAgo } from '@/lib/format'
import type { User } from '@/lib/types'
import { Card, Button, Pill, Field, Input, Skeleton, EmptyState } from '@/components/ui'
import { IconUsers, IconPlus, IconShield, IconRefresh } from '@/components/icons'

export function AdminsView() {
  const me = useStore((s) => s.user)
  const pushToast = useStore((s) => s.pushToast)
  const { data, loading, error, reload, setData } = useApiData<User[]>(() => api.listUsers())
  const [showAdd, setShowAdd] = useState(false)

  const admins = (data ?? []).filter((u) => u.role === 'admin')
  const owners = (data ?? []).filter((u) => u.role !== 'admin')

  const setRole = async (u: User, role: 'admin' | 'user') => {
    try {
      const updated = await api.setRole(u.id, role)
      setData((prev) => (prev ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev))
      pushToast({ kind: 'success', title: role === 'admin' ? `${u.name} is now an admin` : `${u.name} is now an owner` })
    } catch (e) {
      pushToast({ kind: 'error', title: 'Update failed', detail: (e as Error).message })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Team</h1>
          <p className="mt-1 text-sm text-muted">
            Administrators can moderate every LMS and act on complaints. Owners manage only their own.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reload}>
            <IconRefresh /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAdd((v) => !v)}>
            <IconPlus /> Add admin
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AddAdminForm
              onClose={() => setShowAdd(false)}
              onCreated={(u) => {
                setData((prev) => (prev ? [...prev, u] : [u]))
                pushToast({ kind: 'success', title: `${u.name} added as admin` })
                setShowAdd(false)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={<IconUsers />} title="Could not load the team" detail={error} action={<Button size="sm" onClick={reload}>Try again</Button>} />
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Administrators" count={admins.length}>
            {admins.map((u) => (
              <UserRow key={u.id} user={u} me={me?.id} onSetRole={setRole} />
            ))}
          </Section>
          {owners.length > 0 && (
            <Section title="LMS owners" count={owners.length}>
              {owners.map((u) => (
                <UserRow key={u.id} user={u} me={me?.id} onSetRole={setRole} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1 text-[13px] font-semibold uppercase tracking-wider text-muted">
        {title} <span className="tnum text-faint">{count}</span>
      </div>
      <Card className="divide-y divide-line p-0">{children}</Card>
    </div>
  )
}

function UserRow({ user, me, onSetRole }: { user: User; me?: number; onSetRole: (u: User, r: 'admin' | 'user') => void }) {
  const isMe = user.id === me
  const isAdmin = user.role === 'admin'
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50 text-sm font-bold text-brand-600">
        {user.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-[160px] flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{user.name}</span>
          {isMe && <span className="text-[11px] text-muted">(you)</span>}
        </div>
        <div className="text-[13px] text-muted">{user.email}</div>
      </div>
      <span className="text-[12px] text-faint">joined {timeAgo(user.created_at)}</span>
      {isAdmin ? (
        <Pill tone="sky">
          <IconShield /> Admin
        </Pill>
      ) : (
        <Pill tone="slate">Owner</Pill>
      )}
      {!isMe &&
        (isAdmin ? (
          <Button size="sm" variant="ghost" onClick={() => onSetRole(user, 'user')}>
            Revoke admin
          </Button>
        ) : (
          <Button size="sm" variant="subtle" onClick={() => onSetRole(user, 'admin')}>
            Make admin
          </Button>
        ))}
    </div>
  )
}

function AddAdminForm({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError('')
    setBusy(true)
    try {
      const u = await api.createAdmin(name.trim(), email.trim(), password)
      onCreated(u)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create admin')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy) submit()
        }}
      >
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Nakamura" autoComplete="off" />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@example.com" autoComplete="off" />
        </Field>
        <Field label="Temporary password" error={error || undefined}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
        </Field>
        <div className="flex justify-end gap-2 sm:col-span-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" loading={busy}>
            <IconShield /> Create administrator
          </Button>
        </div>
      </form>
    </Card>
  )
}
