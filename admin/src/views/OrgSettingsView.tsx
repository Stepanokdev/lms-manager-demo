import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { Button, Card, EmptyState, Field, Input, LogoBadge, Skeleton } from '@/components/ui'
import { CopyField } from '@/components/CopyField'
import { IconServer } from '@/components/icons'

/**
 * The provider's own details — the name and tagline their app shows above the
 * platform list, and the address it fetches from.
 */
export function OrgSettingsView() {
  const pushToast = useStore((s) => s.pushToast)
  const org = useStore((s) => s.org)
  const loadOrg = useStore((s) => s.loadOrg)
  const setOrg = useStore((s) => s.setOrg)

  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [contact, setContact] = useState('')
  const [logo, setLogo] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!org) {
      loadOrg()
      return
    }
    setName(org.name)
    setTagline(org.tagline)
    setContact(org.contact_email)
    setLogo(org.logo_url)
  }, [org, loadOrg])

  if (!org) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  const dirty =
    name.trim() !== org.name ||
    tagline !== org.tagline ||
    contact !== org.contact_email ||
    logo !== org.logo_url

  const save = async () => {
    if (!name.trim()) {
      setFormError('Your organization needs a name.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const updated = await api.updateMyOrg({
        name: name.trim(),
        tagline: tagline.trim(),
        contact_email: contact.trim(),
        logo_url: logo.trim(),
      })
      setOrg(updated)
      pushToast({
        kind: 'success',
        title: 'Organization updated',
        detail: 'Apps pick this up the next time they open.',
      })
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Organization</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          How your organization appears above the platform list in your app.
        </p>
      </header>

      <Card className="p-5 sm:p-6">
        <form
          className="flex max-w-xl flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!saving && dirty) save()
          }}
        >
          <div className="flex items-center gap-3.5">
            <LogoBadge name={name || org.name} logoUrl={logo || undefined} size={52} />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-ink">{name || org.name}</div>
              <div className="truncate text-[13px] text-muted">
                {tagline || 'No tagline yet'}
              </div>
            </div>
          </div>

          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Northwind Education Group"
              maxLength={120}
            />
          </Field>

          <Field
            label="Tagline"
            hint="One short line. Shown under the name when a learner opens your app."
          >
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Five campuses, one app"
              maxLength={200}
            />
          </Field>

          <Field label="Logo URL" hint="Leave empty to show your initials instead.">
            <Input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.edu/logo.png"
            />
          </Field>

          <Field
            label="Contact email"
            hint="Where the registry operator reaches you. Learners never see it."
            error={formError || undefined}
          >
            <Input
              type="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@example.edu"
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
              Save changes
            </Button>
            {dirty && !saving && (
              <span className="text-[13px] text-muted">Unsaved changes</span>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold text-ink">Your address</h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
          Fixed for the life of the organization. Your shipped apps read from it, so it
          cannot be changed here — renaming your organization above leaves it untouched.
          If you genuinely need a different one, ask the registry operator.
        </p>
        <div className="mt-4 max-w-xl">
          <CopyField value={org.directory_url} />
        </div>
      </Card>
    </div>
  )
}
