import { StatusBar, LogistrationBottomView, SearchField, ios } from './shared'
import logo from '@/assets/app/appLogo-theme.svg'

export function PreLoginScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />

      {/* Main content area (iOS: padding horizontal 24, top varies) */}
      <div className="flex-1" style={{ padding: '0 20px' }}>
        {/* Logo (iOS: maxWidth 189, maxHeight 89, colorMultiply accent, padding top 40, bottom 20) */}
        <div style={{ paddingTop: 28, paddingBottom: 14 }}>
          <img
            src={logo}
            alt="Logo"
            style={{
              maxWidth: 120,
              maxHeight: 36,
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Heading (iOS: titleLarge = 22pt bold, padding bottom 20) */}
        <h1
          className="font-bold leading-tight"
          style={{ fontSize: 16, color: ios.textPrimary, marginBottom: 14 }}
        >
          Courses and programs from the world's best universities in your pocket.
        </h1>

        {/* Search section */}
        {/* Search title (iOS: bodyLarge 16pt bold, padding top 24) */}
        <p
          className="font-bold"
          style={{ fontSize: 13, color: ios.textPrimary, marginTop: 16, marginBottom: 8 }}
        >
          Explore Courses
        </p>

        {/* Search field (iOS: minHeight 50, cornerRadius 8, magnifyingglass icon) */}
        <SearchField placeholder="Search courses..." />

        {/* Explore all courses link (iOS: bodyLarge 16pt, underline, infoColor, padding top 5) */}
        <button
          className="underline"
          style={{ fontSize: 12, color: ios.info, marginTop: 6, display: 'block' }}
        >
          Explore all courses
        </button>
      </div>

      {/* Bottom buttons (iOS: LogistrationBottomView) */}
      <LogistrationBottomView />
    </div>
  )
}
