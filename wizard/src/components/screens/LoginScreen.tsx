import headerImg from '@/assets/app/header-dark.png'
import logo from '@/assets/app/appLogo-theme.svg'
import { StatusBar, SocialAuthButtons, InputField, StyledButton, ios } from './shared'

interface LoginScreenProps {
  showGoogle?: boolean
  showFacebook?: boolean
  showMicrosoft?: boolean
  showApple?: boolean
  showSSO?: boolean
  /** When false and SSO is on → email/password form is hidden (SSO-only mode) */
  loginRegistrationEnabled?: boolean
  customLogo?: string
  customBackground?: string
}

export function LoginScreen({
  showGoogle = false,
  showFacebook = false,
  showMicrosoft = false,
  showApple = false,
  showSSO = false,
  loginRegistrationEnabled = true,
  customLogo,
  customBackground,
}: LoginScreenProps) {
  const hasSocial = showGoogle || showFacebook || showMicrosoft || showApple
  const ssoOnly = !loginRegistrationEnabled && showSSO
  const bgSrc = customBackground || headerImg
  const logoSrc = customLogo || logo

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: ios.bg }}>
      {/* ── Header background image ── */}
      <div className="absolute top-0 left-0 right-0" style={{ height: 155 }}>
        <img src={bgSrc} alt="" className="h-full w-full object-cover" />
      </div>

      {/* ── Status bar ── */}
      <div className="relative z-10">
        <StatusBar />
      </div>

      {/* ── Logo ── */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ paddingTop: 28, paddingBottom: 28 }}
      >
        <img
          src={logoSrc}
          alt="Logo"
          className="drop-shadow-lg"
          style={{ maxWidth: 120, maxHeight: 50, objectFit: 'contain' }}
        />
      </div>

      {/* ── Rounded content area (iOS: roundedBackground, cornerRadius 24, offset y:2) ── */}
      <div
        className="relative z-20 flex flex-col overflow-hidden"
        style={{
          backgroundColor: ios.bgLogin,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          marginTop: -4,
          height: 'calc(100% - 136px)',
          boxShadow: `0 -1px 0 ${ios.cardStroke}`,
        }}
      >
        {/* ── Scrollable content (iOS: ScrollView, padding horizontal 24, top 50) ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: `28px 20px ${ios.safeAreaBottom}px` }}>

          {/* ══════════════════════════════════════════════
              Scenario: loginRegistrationEnabled = true
              Full login form (email, password, social, etc.)
             ══════════════════════════════════════════════ */}
          {loginRegistrationEnabled && (
            <>
              {/* Title (iOS: displaySmall = 36pt bold) */}
              <h1 className="font-bold" style={{ fontSize: 22, color: ios.textPrimary, lineHeight: 1.1 }}>
                Sign in
              </h1>

              {/* Subtitle (iOS: titleSmall = 14pt medium, padding-bottom 20) */}
              <p
                className="font-medium"
                style={{ fontSize: 11, color: ios.textPrimary, marginTop: 3, marginBottom: 16 }}
              >
                Welcome back! Sign in to access your courses.
              </p>

              {/* Social auth (iOS: padding top 22, bottom 16) */}
              {hasSocial && (
                <div style={{ marginBottom: 14 }}>
                  <SocialAuthButtons
                    showGoogle={showGoogle}
                    showFacebook={showFacebook}
                    showMicrosoft={showMicrosoft}
                    showApple={showApple}
                  />
                </div>
              )}

              {/* Email field (iOS: labelLarge 14pt medium for label) */}
              <InputField label="Email or username" placeholder="Email or username" />

              {/* Password field (iOS: padding top 18 on label) */}
              <div style={{ marginTop: 14 }}>
                <InputField label="Password" placeholder="Password" isSecure />
              </div>

              {/* Links row (iOS: Register + Forgot password?) */}
              <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                <span className="font-medium" style={{ fontSize: 11, color: ios.accent }}>
                  Register
                </span>
                <span style={{ fontSize: 11, color: ios.info }}>
                  Forgot password?
                </span>
              </div>

              {/* Sign in button (iOS: padding top 40, StyledButton) */}
              <div style={{ marginTop: 28 }}>
                <StyledButton label="Log In" />
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              SSO section (iOS: samlSSOLoginEnabled)
             ══════════════════════════════════════════════ */}
          {showSSO && (
            <>
              {/* SSO-only heading + subtitle (iOS: shown only when loginRegistrationEnabled=false) */}
              {ssoOnly && (
                <div className="flex flex-col items-center" style={{ marginBottom: 16 }}>
                  <p
                    className="text-center font-semibold"
                    style={{ fontSize: 13, color: ios.textPrimary, marginBottom: 12, paddingInline: 12 }}
                  >
                    Start today to build your career with confidence
                  </p>

                  <div style={{ width: '100%', height: 1, backgroundColor: ios.cardStroke }} />

                  <p
                    className="text-center font-semibold"
                    style={{ fontSize: 15, color: ios.textPrimary, marginTop: 16, marginBottom: 8, paddingInline: 12 }}
                  >
                    Sign in
                  </p>

                  <p
                    className="text-center"
                    style={{ fontSize: 12, color: ios.textSecondaryLight, paddingInline: 12 }}
                  >
                    Log in through the national unified sign-on service
                  </p>
                </div>
              )}

              {/* SSO button — primary style when SSO-only, secondary when alongside regular login */}
              <div style={{ marginTop: ssoOnly ? 16 : 8 }}>
                <StyledButton
                  label="Sign in with SSO"
                  variant={ssoOnly ? 'primary' : 'secondary'}
                  color={ssoOnly ? ios.white : undefined}
                  textColor={ssoOnly ? ios.accent : undefined}
                />
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
