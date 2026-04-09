import { SectionTitle } from '@/components/common/SectionTitle'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { LoginScreen, LoginScreenLight } from '@/components/screens'
import { useRef, useState } from 'react'
import { getUserAccent, getDarkAccent } from '@/components/screens/shared'

export function BrandingStep() {
  const clientInfo = useWizardStore((s) => s.clientInfo)
  const setClientInfo = useWizardStore((s) => s.setClientInfo)
  const fileInputLogo = useRef<HTMLInputElement>(null)
  const fileInputBg = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(clientInfo.logoUrl || null)
  const [bgPreview, setBgPreview] = useState<string | null>(clientInfo.loginBackgroundUrl || null)

  const accent = getUserAccent()
  const darkAccent = getDarkAccent()

  const handleFileUpload = async (file: File, type: 'logo' | 'bg') => {
    const token = localStorage.getItem('token')
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/uploads', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      if (type === 'logo') { setClientInfo({ logoUrl: data.url }); setLogoPreview(data.url) }
      else { setClientInfo({ loginBackgroundUrl: data.url }); setBgPreview(data.url) }
    } catch { alert('Upload failed') }
  }

  return (
    <div className="flex h-full">
      {/* Form */}
      <div className="flex w-[380px] flex-shrink-0 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle icon="🎨" title="Branding" subtitle="Customize colors, logo, and login screen" />

        {/* Accent Color */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-surface-500">Accent Color</h3>
          <div className="flex items-center gap-3">
            <input type="color" value={accent} onChange={(e) => setClientInfo({ accentColor: e.target.value })} className="h-12 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
            <input type="text" value={accent} onChange={(e) => setClientInfo({ accentColor: e.target.value })} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-accent-500/50" placeholder="#42AAFF" />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg border border-white/10" style={{ background: accent }} />
              <span className="text-xs text-surface-400">Light</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg border border-white/10" style={{ background: darkAccent }} />
              <span className="text-xs text-surface-400">Dark (auto)</span>
            </div>
          </div>
        </div>

        {/* Logo */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-surface-500">Logo</h3>
          <div className="flex gap-3">
            <input type="url" value={clientInfo.logoUrl} onChange={(e) => { setClientInfo({ logoUrl: e.target.value }); setLogoPreview(e.target.value) }} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-surface-500 outline-none focus:border-accent-500/50" placeholder="https://example.com/logo.png" />
            <button onClick={() => fileInputLogo.current?.click()} className="rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-sm text-surface-400 transition-colors hover:border-accent-500/50 hover:text-white">Upload</button>
            <input ref={fileInputLogo} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'logo') }} />
          </div>
          {logoPreview && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <img src={logoPreview} alt="Logo" className="h-10 max-w-[120px] object-contain" />
              <span className="text-xs text-surface-400">Logo preview</span>
            </div>
          )}
        </div>

        {/* Login Background */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-surface-500">Login Background</h3>
          <button onClick={() => fileInputBg.current?.click()} className="w-full rounded-xl border border-dashed border-white/20 px-4 py-6 text-center text-sm text-surface-400 transition-colors hover:border-accent-500/50 hover:text-white">
            {bgPreview ? 'Replace image' : 'Click to upload background image'}
          </button>
          <input ref={fileInputBg} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'bg') }} />
          {bgPreview && (
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
              <img src={bgPreview} alt="Background" className="h-20 w-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* Two phone previews — Light & Dark */}
      <div className="flex flex-1 items-center justify-center gap-12 border-l border-white/5 bg-white/[0.01]">
        <PhonePreview label="Light">
          <LoginScreenLight customLogo={logoPreview || undefined} customBackground={bgPreview || undefined} />
        </PhonePreview>
        <PhonePreview label="Dark">
          <LoginScreen showGoogle={false} showFacebook={false} showMicrosoft={false} showApple={false} showSSO={false} loginRegistrationEnabled={true} customLogo={logoPreview || undefined} customBackground={bgPreview || undefined} />
        </PhonePreview>
      </div>
    </div>
  )
}
