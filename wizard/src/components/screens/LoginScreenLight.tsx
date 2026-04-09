import headerImg from '@/assets/app/header-light.png'
import logo from '@/assets/app/appLogo-theme.svg'
import visibilityIcon from '@/assets/icons/visibility.svg'
import { iosLight, StatusBar } from './shared'

/** Input field using light palette — same layout as shared InputField */
function LightInputField({ label, placeholder, isSecure = false }: { label: string; placeholder: string; isSecure?: boolean }) {
  const t = iosLight
  return (
    <div>
      <span className="font-medium" style={{ fontSize: 12, color: t.textPrimary }}>{label}</span>
      <div className="mt-1 flex items-center" style={{ padding: '10px 12px', borderRadius: 8, backgroundColor: t.bgInput, border: `1px solid ${t.strokeInput}` }}>
        <span className="flex-1" style={{ fontSize: 12, color: t.textPlaceholder }}>{isSecure ? '••••••••' : placeholder}</span>
        {isSecure && <img src={visibilityIcon} alt="" style={{ width: 16, height: 16, opacity: 0.5 }} />}
      </div>
    </div>
  )
}

/** Button using light palette — same layout as shared StyledButton */
function LightStyledButton({ label }: { label: string }) {
  const t = iosLight
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 36, borderRadius: 8, backgroundColor: t.accent, border: '1px solid transparent' }}>
      <span className="font-medium" style={{ fontSize: 12, letterSpacing: 1.1, color: '#FFFFFF' }}>{label}</span>
    </div>
  )
}

/**
 * Light-mode login screen — identical layout to LoginScreen (dark),
 * but uses iosLight colors and header-light.png.
 */
interface LoginScreenLightProps {
  customLogo?: string
  customBackground?: string
}

export function LoginScreenLight({ customLogo, customBackground }: LoginScreenLightProps = {}) {
  const t = iosLight
  const bgSrc = customBackground || headerImg
  const logoSrc = customLogo || logo

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: t.bg }}>
      {/* Header background image */}
      <div className="absolute top-0 left-0 right-0" style={{ height: 155 }}>
        <img src={bgSrc} alt="" className="h-full w-full object-cover" />
      </div>

      {/* Status bar */}
      <div className="relative z-10">
        <StatusBar textColor={t.textPrimary} />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <img src={logoSrc} alt="Logo" className="drop-shadow-lg" style={{ maxWidth: 120, maxHeight: 50, objectFit: 'contain' }} />
      </div>

      {/* Content area — same border-radius, margins, shadows as dark LoginScreen */}
      <div
        className="relative z-20 flex flex-col overflow-hidden"
        style={{
          backgroundColor: t.bgLogin,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          marginTop: -4,
          height: 'calc(100% - 136px)',
          boxShadow: `0 -1px 0 ${t.cardStroke}`,
        }}
      >
        <div className="flex-1 overflow-y-auto" style={{ padding: `28px 20px ${t.safeAreaBottom}px` }}>
          {/* Title — same fontSize/weight as dark */}
          <h1 className="font-bold" style={{ fontSize: 22, color: t.textPrimary, lineHeight: 1.1 }}>Sign in</h1>
          <p className="font-medium" style={{ fontSize: 11, color: t.textPrimary, marginTop: 3, marginBottom: 16 }}>
            Welcome back! Sign in to access your courses.
          </p>

          {/* Email — same as InputField */}
          <LightInputField label="Email or username" placeholder="Email or username" />

          {/* Password — same as InputField isSecure */}
          <div style={{ marginTop: 14 }}>
            <LightInputField label="Password" placeholder="Password" isSecure />
          </div>

          {/* Links — same layout */}
          <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
            <span className="font-medium" style={{ fontSize: 11, color: t.accent }}>Register</span>
            <span style={{ fontSize: 11, color: t.info }}>Forgot password?</span>
          </div>

          {/* Button — same as StyledButton */}
          <div style={{ marginTop: 28 }}>
            <LightStyledButton label="Log In" />
          </div>
        </div>
      </div>
    </div>
  )
}
