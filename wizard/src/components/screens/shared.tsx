import type { ReactNode } from 'react'

import iconGoogle from '@/assets/icons/icon_google.png'
import iconApple from '@/assets/icons/icon_apple.png'
import iconFacebook from '@/assets/icons/icon_facebook.png'
import iconMicrosoft from '@/assets/icons/icon_microsoft.png'
import visibilityIcon from '@/assets/icons/visibility.svg'

// ─── Dynamic accent color ───
let _userAccent = '#42AAFF'
let _darkAccentCache: { input: string; output: string } = { input: '', output: '' }

export function setUserAccent(color: string) { _userAccent = color }
export function getUserAccent() { return _userAccent }

function adaptDarkAccent(base: string): string {
  if (_darkAccentCache.input === base) return _darkAccentCache.output
  const hexToRgb = (h: string) => { const n = parseInt(h.replace('#',''),16); return [(n>>16)&255,(n>>8)&255,n&255] as const }
  const srgbLin = (u: number) => { const v=u/255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4) }
  const relLum = (hex: string) => { const [r,g,b]=hexToRgb(hex); return 0.2126*srgbLin(r)+0.7152*srgbLin(g)+0.0722*srgbLin(b) }
  const clamp = (v: number,lo: number,hi: number) => Math.min(Math.max(v,lo),hi)
  const hexToHsl = (hex: string) => { const [r,g,b]=hexToRgb(hex).map(v=>v/255); const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let h=0,s=0; const l=(mx+mn)/2,d=mx-mn; if(d){s=d/(1-Math.abs(2*l-1)); if(mx===r)h=((g-b)/d+(g<b?6:0))*60; else if(mx===g)h=((b-r)/d+2)*60; else h=((r-g)/d+4)*60}; return{h,s,l} }
  const hslToHex = (h: number,s: number,l: number) => { const hue=((h%360)+360)%360,sat=clamp(s,0,1),li=clamp(l,0,1); const c=(1-Math.abs(2*li-1))*sat,x=c*(1-Math.abs((hue/60)%2-1)),m=li-c/2; let r=0,g=0,b=0; if(hue<60)[r,g,b]=[c,x,0]; else if(hue<120)[r,g,b]=[x,c,0]; else if(hue<180)[r,g,b]=[0,c,x]; else if(hue<240)[r,g,b]=[0,x,c]; else if(hue<300)[r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x]; return '#'+[r+m,g+m,b+m].map(v=>Math.max(0,Math.min(255,Math.round(v*255))).toString(16).padStart(2,'0')).join('') }
  const findL = (h: number,s: number,tgt: number) => { let lo=0,hi=1; for(let i=0;i<24;i++){const mid=(lo+hi)/2; relLum(hslToHex(h,s,mid))<tgt?lo=mid:hi=mid}; return(lo+hi)/2 }
  const bg='#19202D',tc=4.5,maxB=0.85,minS=0.4,maxS=0.8,dsF=0.6
  const lBg=relLum(bg),lFg=relLum(base),req=clamp(tc*(lBg+0.05)-0.05,0,1)
  const cr=(Math.max(lFg,lBg)+0.05)/(Math.min(lFg,lBg)+0.05)
  const{h,s}=hexToHsl(base),gs=s<=0.02
  if(cr>=tc&&lFg>=req&&lFg<=maxB&&(gs||(s<=maxS&&(s>=minS||s<=0.05)))){_darkAccentCache={input:base,output:base};return base}
  const tLum=clamp(lFg,req,maxB); let sat=s
  if(!gs){sat=Math.min(sat,maxS);if(tLum<0.4)sat*=dsF;if(sat<minS)sat=minS}
  const result = hslToHex(h,sat,findL(h,sat,tLum))
  _darkAccentCache = { input: base, output: result }
  return result
}

export function getDarkAccent() { return adaptDarkAccent(_userAccent) }

// ─── iOS Open edX Theme Colors (Dark Mode) ───
export const ios: Record<string, any> = {
  bg: '#19202D',
  bgLogin: '#18202E',
  bgCard: '#232D3F',
  bgInput: '#273346',
  bgInputUnfocused: '#232D3F',
  strokeInput: '#4E5A6F',
  strokeInputUnfocused: '#3A4458',
  get accent() { return adaptDarkAccent(_userAccent) },
  get accentDark() { return adaptDarkAccent(_userAccent) },
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9AAF',
  textSecondaryLight: '#79879F',
  textTertiary: '#636B7F',
  textPlaceholder: '#5A6478',
  cardStroke: '#2F3B4E',
  white: '#FFFFFF',
  alert: '#FF3C70',
  warning: '#FFC247',
  warningText: '#FFC84D',
  success: '#34C759',
  get info() { return adaptDarkAccent(_userAccent) },
  shadow: 'rgba(0,0,0,0.25)',
  /** Bottom safe area inset (px) — clearance above the home indicator */
  safeAreaBottom: 24,
}

// ─── Light Mode Colors ───
export const iosLight: Record<string, any> = {
  bg: '#F5F5F5',
  bgLogin: '#FAFAFA',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  bgInputUnfocused: '#F5F5F5',
  strokeInput: '#CCD3DF',
  strokeInputUnfocused: '#E0E4EA',
  get accent() { return _userAccent },
  get accentDark() { return adaptDarkAccent(_userAccent) },
  textPrimary: '#19212F',
  textSecondary: '#6B7B95',
  textSecondaryLight: '#97A5BB',
  textTertiary: '#A0AABA',
  textPlaceholder: '#B0B8C4',
  cardStroke: '#E8ECF0',
  white: '#FFFFFF',
  alert: '#FF3C70',
  warning: '#FFC247',
  warningText: '#B8860B',
  success: '#34C759',
  get info() { return _userAccent },
  shadow: 'rgba(0,0,0,0.08)',
  safeAreaBottom: 24,
}

// ─── Status Bar (iOS 17 style) ───
// Positioned to flank the Dynamic Island: time on the left, icons on the right.
// Island (md): top ~10px, h 26px, w 90px → center at y=23px
// Status bar content is vertically centered at the same y as the island center.
export function StatusBar({ textColor }: { textColor?: string } = {}) {
  const c = textColor || 'white'
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: '14px 20px 14px' }}
    >
      <span
        className="font-semibold"
        style={{ fontSize: 9, fontFeatureSettings: '"tnum"', color: c }}
      >
        9:41
      </span>
      <div className="flex items-center gap-[3px]" style={{ color: c }}>
        {/* Cellular signal */}
        <svg width="12" height="9" viewBox="0 0 17 12" fill="none">
          <rect x="0" y="8" width="3" height="4" rx="0.7" fill="currentColor" fillOpacity="0.35" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.7" fill="currentColor" fillOpacity="0.35" />
          <rect x="9" y="3" width="3" height="9" rx="0.7" fill="currentColor" fillOpacity="0.6" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.7" fill="currentColor" />
        </svg>
        {/* Wi-Fi */}
        <svg width="11" height="9" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 11.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" />
          <path d="M5.17 8.33a4 4 0 015.66 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M2.93 6.1a7 7 0 0110.14 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M.7 3.87A10 10 0 0115.3 3.87" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {/* Battery */}
        <svg width="18" height="9" viewBox="0 0 27 12" fill="none">
          <rect x="0.5" y="0.5" width="22" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.35" />
          <rect x="2" y="2" width="19" height="8" rx="1.5" fill="currentColor" />
          <path d="M24 4v4a2 2 0 000-4z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  )
}

// ─── Tab Bar (iOS style — real asset paths from openedx-app-ios) ───
export function TabBar({ active = 'learn', showPrograms = false }: { active?: 'learn' | 'programs' | 'discover' | 'profile'; showPrograms?: boolean }) {
  const ac = ios.accent
  const inac = ios.textSecondaryLight
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-end justify-around pt-2"
      style={{
        paddingBottom: ios.safeAreaBottom,
        backgroundColor: ios.bg,
        borderTop: `0.5px solid ${ios.cardStroke}`,
      }}
    >
      {/* Learn — iOS: learn_active.svg (filled) / learn_inactive.svg (stroked) */}
      <TabItem label="Learn" active={active === 'learn'} icon={
        active === 'learn' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M21.81 5.71c.02.06.04.12.04.18 0 .04.02.11.02.11V18.99c0 .01 0 .02 0 .03 0 .05-.01.1-.03.16l-.06.15c-.02.04-.02.05-.02.07l-.13.17-.01.01c-.08.08-.16.13-.25.17l-.07.03c-.1.04-.2.06-.3.06-.1 0-.2-.02-.3-.06l-.07-.03-.06-.03c-2.46-1.42-5.65-1.42-8.12 0-.01.01-.03.02-.04.02-.01 0-.01 0-.02.01-.19.07-.4.07-.6 0l-.07-.03-.06-.03c-2.46-1.42-5.65-1.42-8.12 0-.02.02-.03.02-.05.02a.73.73 0 01-.12.04c-.02.01-.04.01-.07.01h-.05c-.02 0-.04-.01-.06-.01-.06 0-.12-.01-.17-.03-.06-.02-.11-.05-.16-.08l-.05-.03c-.03-.01-.05-.02-.07-.04-.04-.03-.07-.06-.09-.1-.01-.02-.02-.03-.03-.04-.01-.02-.02-.03-.04-.04-.02-.02-.02-.03-.02-.05a.45.45 0 01-.06-.16c0-.02-.01-.04-.01-.06-.01-.02-.01-.06-.01-.06V6c0-.02 0-.04.01-.06 0-.06.01-.12.03-.18.02-.05.04-.1.07-.15.01-.01.02-.03.02-.04.03-.04.05-.06.09-.1.04-.04.08-.07.12-.1.01-.01.02-.02.04-.04.01-.01.03-.02.04-.03.02-.01.03-.02.04-.03C5.51 3.59 9.12 3.51 12.01 4.99c2.9-1.48 6.5-1.4 9.34.19.01.01.03.02.04.03.02.01.03.02.04.03.02.01.03.02.04.04.02.02.04.03.05.04.03.04.05.06.07.08.02.02.03.04.05.07.03.05.05.1.07.15zm-10.31 1.41c0-.28.22-.5.5-.5s.5.22.5.5v10.28c0 .28-.22.5-.5.5s-.5-.22-.5-.5V7.12z" fill={ac} />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 19C4.368 18.21 5.92 17.794 7.5 17.794 9.08 17.794 10.632 18.21 12 19c1.368-.79 2.92-1.206 4.5-1.206 1.58 0 3.132.416 4.5 1.206" stroke={inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6C4.368 5.21 5.92 4.794 7.5 4.794 9.08 4.794 10.632 5.21 12 6c1.368-.79 2.92-1.206 4.5-1.206 1.58 0 3.132.416 4.5 1.206" stroke={inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6V19" stroke={inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 6V19" stroke={inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 6V19" stroke={inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      } />
      {/* Programs — iOS: programs.imageset (stroked book, template-rendered) */}
      {showPrograms && (
        <TabItem label="Programs" active={active === 'programs'} icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 19C4.368 18.21 5.92 17.794 7.5 17.794 9.08 17.794 10.632 18.21 12 19c1.368-.79 2.92-1.206 4.5-1.206 1.58 0 3.132.416 4.5 1.206" stroke={active === 'programs' ? ac : inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6C4.368 5.21 5.92 4.794 7.5 4.794 9.08 4.794 10.632 5.21 12 6c1.368-.79 2.92-1.206 4.5-1.206 1.58 0 3.132.416 4.5 1.206" stroke={active === 'programs' ? ac : inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 6V19" stroke={active === 'programs' ? ac : inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 6V19" stroke={active === 'programs' ? ac : inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 6V19" stroke={active === 'programs' ? ac : inac} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        } />
      )}
      {/* Discover — iOS: discover_active.svg (filled) / discover_inactive.svg (filled outline) */}
      <TabItem label="Discover" active={active === 'discover'} icon={
        active === 'discover' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15.75 14.26h-.79l-.28-.27A6.47 6.47 0 0016.25 9.76 6.49 6.49 0 009.75 3.26a6.49 6.49 0 00-6.5 6.5 6.49 6.49 0 006.5 6.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-5-5z" fill={ac}/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15.755 14.255h-.79l-.28-.27a6.47 6.47 0 001.57-4.23 6.49 6.49 0 00-6.5-6.5 6.49 6.49 0 00-6.5 6.5 6.49 6.49 0 006.5 6.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-5-5zm-6 0c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z" fill={inac}/>
          </svg>
        )
      } />
      {/* Profile — iOS: profile_active.svg (filled) / profile_inactive.svg (filled outline) */}
      <TabItem label="Profile" active={active === 'profile'} icon={
        active === 'profile' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z" fill={ac}/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7.35 18.5C8.66 17.56 10.26 17 12 17s3.34.56 4.65 1.5C15.34 19.44 13.74 20 12 20s-3.34-.56-4.65-1.5zm10.79-1.38C16.45 15.8 14.32 15 12 15s-4.45.8-6.14 2.12A8 8 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8a8 8 0 01-1.86 5.12z" fill={inac}/>
            <path d="M12 6c-1.93 0-3.5 1.57-3.5 3.5S10.07 13 12 13s3.5-1.57 3.5-3.5S13.93 6 12 6zm0 5c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11z" fill={inac}/>
          </svg>
        )
      } />
    </div>
  )
}

function TabItem({ icon, label, active }: { icon: ReactNode; label: string; active: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      {icon}
      <span
        style={{ fontSize: 8, fontWeight: 500, color: active ? ios.accent : ios.textSecondaryLight }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Home Indicator ───
export function HomeIndicator() {
  return (
    <div className="absolute bottom-1.5 left-1/2 h-[5px] w-[100px] -translate-x-1/2 rounded-full bg-white/20" />
  )
}

// ─── Settings Icon (iOS: icon-manage_accounts — person with gear) ───
export function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={ios.accent} className="absolute right-5 top-0.5">
      <path d="M10.82 12.525c-.22-.01-.44-.02-.67-.02-2.42 0-4.68.67-6.61 1.82-.88.52-1.39 1.5-1.39 2.53v1.65c0 .55.45 1 1 1h8.26a6.97 6.97 0 01-1.26-4c0-1.07.25-2.07.67-2.98z"/>
      <path d="M10.15 11.505a4 4 0 100-8 4 4 0 000 8z"/>
      <path d="M20.9 15.505c0-.22-.03-.42-.06-.63l.84-.73c.18-.16.22-.42.1-.63l-.59-1.02c-.12-.21-.37-.3-.59-.22l-1.06.36a3.56 3.56 0 00-.78-.53l-.22-1.09a.49.49 0 00-.49-.37h-1.18c-.24 0-.44.17-.49.4l-.22 1.09c-.4.15-.76.36-1.08.63l-1.06-.36c-.23-.08-.47.02-.59.22l-.59 1.02c-.12.21-.08.47.1.63l.84.73c-.03.21-.06.41-.06.63s.03.42.06.63l-.84.73c-.18.16-.22.42-.1.63l.59 1.02c.12.21.37.3.59.22l1.06-.36c.32.27.68.48 1.08.63l.22 1.09c.05.23.25.4.49.4h1.18c.24 0 .44-.17.49-.4l.22-1.09c.4-.15.76-.36 1.08-.63l1.06.36c.23.08.47-.02.59-.22l.59-1.02c.12-.21.08-.47-.1-.63l-.84-.73c.03-.21.06-.41.06-.63zm-3.75 2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
    </svg>
  )
}

// ─── Navigation Bar with Back Button ───
export function NavBar({
  title,
  showBack = true,
}: {
  title: string
  showBack?: boolean
}) {
  return (
    <div className="relative flex items-center justify-center px-5 py-2">
      {showBack && (
        <div className="absolute left-5 flex items-center gap-1">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke={ios.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L2 8l6 6" />
          </svg>
          <span className="text-[14px] font-normal" style={{ color: ios.accent }}>Back</span>
        </div>
      )}
      <span className="text-[14px] font-semibold" style={{ color: ios.textPrimary }}>{title}</span>
    </div>
  )
}

// ─── Styled Button (iOS Open edX) ───
// iOS: minHeight 42pt, cornerRadius 8pt, font 14pt medium, letterSpacing 1.3
export function StyledButton({
  label,
  variant = 'primary',
  className = '',
  color,
  textColor,
  borderColor,
}: {
  label: string
  variant?: 'primary' | 'secondary'
  className?: string
  color?: string
  textColor?: string
  borderColor?: string
}) {
  const isPrimary = variant === 'primary'
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        minHeight: 36,
        borderRadius: 8,
        backgroundColor: color ?? (isPrimary ? ios.accent : 'transparent'),
        border: `1px solid ${borderColor ?? (isPrimary ? 'transparent' : ios.accent)}`,
      }}
    >
      <span
        className="font-medium"
        style={{
          fontSize: 12,
          letterSpacing: 1.1,
          color: textColor ?? (isPrimary ? ios.white : ios.accent),
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Logistration Bottom View (Sign In / Register buttons) ───
// iOS: HStack spacing 24, Sign In width 100pt, Register flex, SSO width 100pt
export function LogistrationBottomView({ ssoEnabled = false }: { ssoEnabled?: boolean }) {
  return (
    <div className="px-5 pt-2" style={{ paddingBottom: ios.safeAreaBottom, borderTop: `0.5px solid ${ios.cardStroke}` }}>
      <div className="flex" style={{ gap: 16 }}>
        <StyledButton
          label="Log In"
          variant="secondary"
          className="w-[70px]"
          borderColor={ios.strokeInput}
        />
        <StyledButton label="Register" className="flex-1" />
        {ssoEnabled && (
          <StyledButton
            label="SSO"
            variant="secondary"
            className="w-[70px]"
            color={ios.white}
            textColor={ios.accent}
            borderColor={ios.strokeInput}
          />
        )}
      </div>
    </div>
  )
}

// ─── Social Auth Buttons ───
// iOS: VStack spacing 16, buttons 42x42, cornerRadius 8, stroke 1pt socialAuthColor
export function SocialAuthButtons({
  showGoogle = false,
  showFacebook = false,
  showMicrosoft = false,
  showApple = false,
}: {
  showGoogle?: boolean
  showFacebook?: boolean
  showMicrosoft?: boolean
  showApple?: boolean
}) {
  const buttons = [
    { show: showGoogle, icon: iconGoogle, label: 'Google', size: 18 },
    { show: showApple, icon: iconApple, label: 'Apple', size: 16 },
    { show: showFacebook, icon: iconFacebook, label: 'Facebook', size: 22 },
    { show: showMicrosoft, icon: iconMicrosoft, label: 'Microsoft', size: 18 },
  ].filter((b) => b.show)

  if (buttons.length === 0) return null

  return (
    <div>
      <span style={{ fontSize: 11, color: ios.textSecondary }}>Continue with:</span>
      <div className="mt-2 flex gap-2" style={{ height: 36 }}>
        {buttons.map((btn) => (
          <div
            key={btn.label}
            className="flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: `1px solid ${ios.strokeInput}`,
              overflow: 'hidden',
            }}
          >
            <img
              src={btn.icon}
              alt={btn.label}
              style={{
                width: btn.size,
                height: btn.size,
                objectFit: 'contain',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Input Field ───
// iOS: padding 14pt, cornerRadius 8pt, stroke 1pt, label 14pt medium, input 16pt regular
// SecureInputView: eye toggle trailing 32pt, icon height 23pt
export function InputField({
  label,
  placeholder,
  isSecure = false,
}: {
  label: string
  placeholder: string
  isSecure?: boolean
}) {
  return (
    <div>
      <span className="font-medium" style={{ fontSize: 12, color: ios.textPrimary }}>
        {label}
      </span>
      <div
        className="mt-1 flex items-center"
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          backgroundColor: ios.bgInput,
          border: `1px solid ${ios.strokeInput}`,
        }}
      >
        <span className="flex-1" style={{ fontSize: 12, color: ios.textPlaceholder }}>
          {isSecure ? '••••••••' : placeholder}
        </span>
        {isSecure && (
          <img
            src={visibilityIcon}
            alt="Show password"
            style={{
              width: 16,
              height: 16,
              opacity: 0.5,
              filter: 'invert(1)',
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Search Field (Fake/tappable) ───
// iOS: minHeight 50pt, cornerRadius 8pt, magnifyingglass leading 16pt, spacing 11pt
export function SearchField({ placeholder = 'Search' }: { placeholder?: string }) {
  return (
    <div
      className="flex items-center"
      style={{
        minHeight: 40,
        borderRadius: 8,
        backgroundColor: ios.bgInput,
        border: `1px solid ${ios.strokeInput}`,
        paddingLeft: 14,
        paddingRight: 14,
        gap: 10,
      }}
    >
      {/* iOS: discover_inactive.svg as search magnifier */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill={ios.textSecondary}>
        <path d="M15.755 14.255h-.79l-.28-.27a6.47 6.47 0 001.57-4.23 6.49 6.49 0 00-6.5-6.5 6.49 6.49 0 00-6.5 6.5 6.49 6.49 0 006.5 6.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-5-5zm-6 0c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/>
      </svg>
      <span style={{ fontSize: 12, color: ios.textPlaceholder }}>{placeholder}</span>
    </div>
  )
}
