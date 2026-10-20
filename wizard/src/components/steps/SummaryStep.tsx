import { motion } from 'motion/react'
import { SectionTitle } from '@/components/common/SectionTitle'
import { useWizardStore } from '@/store/useWizardStore'
import { useSelectedFeaturesSummary } from '@/store/selectors'
import { useState } from 'react'

export function SummaryStep() {
  const clientInfo = useWizardStore((s) => s.clientInfo)
  const selections = useWizardStore((s) => s.selections)
  const editingLmsId = useWizardStore((s) => s.editingLmsId)
  const featuresSummary = useSelectedFeaturesSummary()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const markRegistered = useWizardStore((s) => s.markRegistered)
  const isEditing = editingLmsId !== null

  const enabledFeatures = featuresSummary.filter(
    (f) =>
      (f.feature.valueType === 'boolean' && f.value === true) ||
      f.feature.valueType !== 'boolean',
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      const token = localStorage.getItem('token')
      const body = {
        name: clientInfo.lmsName,
        base_url: clientInfo.baseUrl,
        platform_name: clientInfo.platformName || 'Open edX',
        oauth_client_id: clientInfo.oauthClientId,
        description: clientInfo.description,
        feedback_email: clientInfo.feedbackEmail,
        accent_color: clientInfo.accentColor || '#42AAFF',
        logo_url: clientInfo.logoUrl,
        login_background_url: clientInfo.loginBackgroundUrl,
        // The apps always open at sign-in, so there is nothing to ask and
        // nothing to choose: no pre-login browsing on either platform.
        pre_login_discovery: false,
        pre_login_experience: false,
        dashboard_type: (selections.dashboard_type as string) || 'gallery',
        course_unit_progress: !!selections.course_progress,
        course_dropdown_nav: !!selections.course_dropdown_nav,
        unknown_units_mode: (selections.unknown_units_mode as string) || 'block',
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      // Save through the owner's own route. It is the only one a provider or an
      // LMS owner can reach — /admin/lms/* is the registry operator's surface —
      // and it refuses the moderation fields, so an edit can never approve or
      // feature the instance it is editing. Admins editing someone else's
      // instance still fall back to the admin route.
      let res = isEditing
        ? await fetch(`/my/lms/${editingLmsId}`, { method: 'PUT', headers, body: JSON.stringify(body) })
        : await fetch('/lms', { method: 'POST', headers, body: JSON.stringify(body) })
      if (isEditing && res.status === 404) {
        res = await fetch(`/admin/lms/${editingLmsId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.detail === 'string' ? err.detail : `Error ${res.status}`)
      }
      const saved = await res.json().catch(() => ({}))
      const live = saved.status === 'approved'
      // From here on this wizard edits the platform it just created; the id is kept in
      // the persisted store, so going back a step or reloading can't create a copy.
      if (!isEditing && typeof saved.id === 'number') markRegistered(saved.id)
      setResult({
        ok: true,
        msg: isEditing
          ? live
            ? 'Saved. The app picks up the change the next time it opens.'
            : 'Saved.'
          : live
            ? 'Your platform is live. Close and reopen the mobile app to see it in the list.'
            : 'Submitted. It appears in the app once an administrator approves it.',
      })
    } catch (e: any) {
      setResult({ ok: false, msg: e.message || 'Failed to submit' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-12 py-8">
      <SectionTitle icon="📋" title={isEditing ? 'Review & Save' : 'Review & Submit'} subtitle={isEditing ? 'Review changes and save your LMS configuration' : 'Review your configuration and register your LMS'} />

      {clientInfo.lmsName && (
        <div className="mb-6 text-lg text-surface-400">
          {isEditing ? 'Editing' : 'Registering'} <span className="font-semibold text-white">{clientInfo.lmsName}</span>
          {clientInfo.baseUrl && (
            <span className="ml-2 text-sm text-surface-500">({clientInfo.baseUrl})</span>
          )}
        </div>
      )}

      {/* LMS Info summary */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {[
          ['Instance Name', clientInfo.lmsName],
          ['Base URL', clientInfo.baseUrl],
          ['Platform', clientInfo.platformName],
          ['OAuth Client ID', clientInfo.oauthClientId ? clientInfo.oauthClientId.substring(0, 20) + '...' : ''],
          ['Accent Color', clientInfo.accentColor],
          ['Feedback Email', clientInfo.feedbackEmail],
        ].map(([label, value], i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="text-xs font-medium text-surface-500 uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-sm font-medium text-white truncate">
              {label === 'Accent Color' ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded" style={{ background: value }}></span>
                  {value}
                </span>
              ) : (
                value || '—'
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Feature table */}
      <div className="mb-6 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left text-sm font-semibold text-surface-300">Feature</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-surface-300">Setting</th>
            </tr>
          </thead>
          <tbody>
            {enabledFeatures.map(({ feature, value }, i) => (
              <motion.tr
                key={feature.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b border-white/5"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{feature.icon}</span>
                    <span className="text-sm font-medium text-white">{feature.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-surface-400 capitalize">
                  {typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Submit button */}
      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={submitting || !clientInfo.lmsName || !clientInfo.baseUrl || !clientInfo.oauthClientId}
          className="rounded-xl bg-accent-500 px-8 py-3 text-sm font-semibold text-surface-950 transition-colors hover:bg-accent-400 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Register platform'}
        </motion.button>

        <a
          href="/dashboard"
          className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-surface-400 transition-colors hover:bg-white/5 hover:text-white inline-flex items-center"
        >
          Back to Dashboard
        </a>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
            result.ok
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {result.msg}
        </motion.div>
      )}
    </div>
  )
}
