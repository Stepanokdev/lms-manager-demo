import notAvailableIcon from '@/assets/app/notAvailable.svg'
import { StatusBar, StyledButton, ios } from './shared'

/**
 * "Block" mode — mirrors NotAvailableOnMobileView.swift exactly:
 * VStack(spacing: 10) { Spacer; image; title(paddingTop 40); desc(paddingTop 12); button(paddingTop 40, width 215); Spacer }
 */
export function NotAvailableScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />
      {/* Nav bar */}
      <div className="relative flex items-center justify-center" style={{ padding: '4px 20px 8px' }}>
        <div className="absolute left-5 flex items-center gap-1">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none" stroke={ios.accent} strokeWidth="2"><path d="M8 2L2 8l6 6"/></svg>
          <span style={{ fontSize: 14, color: ios.accent }}>Back</span>
        </div>
        <span className="font-semibold" style={{ fontSize: 14, color: ios.textPrimary }}>Course Unit</span>
      </div>

      {/* Content — centered like Swift VStack with Spacers */}
      <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: 24 }}>
        {/* Icon — same SVG from CoreAssets.notAvaliable */}
        <img
          src={notAvailableIcon}
          alt=""
          style={{ width: 70, height: 70, opacity: 0.85, filter: 'invert(1)' }}
        />

        {/* Title — .titleLarge (22pt bold in iOS, ~16px at scale), multilineTextAlignment center, paddingTop 40 */}
        <p
          className="text-center font-bold"
          style={{ fontSize: 16, color: ios.textPrimary, marginTop: 28, lineHeight: 1.3 }}
        >
          This interactive component isn't available on mobile
        </p>

        {/* Description — .bodyLarge (16pt in iOS, ~12px at scale), paddingTop 12 */}
        <p
          className="text-center"
          style={{ fontSize: 11, color: ios.textSecondary, marginTop: 8, lineHeight: 1.5 }}
        >
          Explore other parts of this course or view this on web.
        </p>

        {/* Button — StyledButton, width 215pt (~153px at scale), paddingTop 40 */}
        <div style={{ marginTop: 28, width: 153 }}>
          <StyledButton label="Open in browser" />
        </div>
      </div>
    </div>
  )
}
