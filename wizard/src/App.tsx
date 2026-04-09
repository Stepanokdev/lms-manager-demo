import { WizardShell } from '@/components/layout/WizardShell'
import { useWizardStore } from '@/store/useWizardStore'
import { useEffect, useState } from 'react'

export default function App() {
  const loadForEdit = useWizardStore((s) => s.loadForEdit)
  const editingLmsId = useWizardStore((s) => s.editingLmsId)
  const [loading, setLoading] = useState(false)

  const resetWizard = useWizardStore((s) => s.resetWizard)

  useEffect(() => {
    // Redirect to dashboard if not logged in
    if (!localStorage.getItem('token')) {
      window.location.href = '/dashboard'
      return
    }

    const params = new URLSearchParams(window.location.search)
    const editId = params.get('edit')
    if (!editId) {
      // New LMS — clear persisted state and reset
      sessionStorage.removeItem('openedx-wizard-state')
      resetWizard()
      return
    }

    const id = parseInt(editId, 10)
    if (isNaN(id) || id === editingLmsId) return

    setLoading(true)
    const token = localStorage.getItem('token')
    fetch(`/lms/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load LMS')
        return r.json()
      })
      .then((lms) => {
        loadForEdit(id, lms)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        alert('Failed to load LMS data. Check that you are logged in.')
        window.location.href = '/dashboard'
      })
  }, [])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-950 text-surface-400">
        <div className="text-center">
          <div className="text-4xl mb-3">Loading...</div>
          <div className="text-sm">Fetching LMS configuration</div>
        </div>
      </div>
    )
  }

  return <WizardShell />
}
