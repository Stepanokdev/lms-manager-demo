import { StatusBar, TabBar, ios } from './shared'
import learn0 from '@/assets/app/learn0.png'
import learn1 from '@/assets/app/learn1.png'
import learn2 from '@/assets/app/learn2.png'

/*
 * Scale factor: 280px preview / 393pt iPhone ≈ 0.712
 *
 * iOS font mapping (pt → px):
 *   displaySmall  36pt Bold     → 26px
 *   titleLarge    22pt Bold     → 16px
 *   titleSmall    14pt Medium   → 10px
 *   labelMedium   12pt Regular  → 9px
 *   labelSmall    10pt Regular  → 8px
 *
 * iOS spacing mapping (pt → px):
 *   20pt → 14px,  16pt → 11px,  12pt → 9px,  10pt → 7px,  8pt → 6px,  3pt → 2px
 *
 * iOS dimension mapping (pt → px):
 *   140pt banner → 100px,  120pt card width → 85px,  90pt card image → 64px
 *   8pt corner radius → 6px,  24pt icon → 17px
 */

interface LearnScreenProps {
  variant?: 'gallery' | 'list'
  showProgress?: boolean
  showDropdownNav?: boolean
}

export function LearnScreen({ variant = 'gallery', showProgress = false, showDropdownNav = false }: LearnScreenProps) {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />

      {/* Header — iOS: displaySmall 36pt Bold, padding horizontal 20pt */}
      <div className="relative" style={{ padding: '2px 14px 0' }}>
        <h1 className="font-bold" style={{ fontSize: 26, lineHeight: 1.15, color: ios.textPrimary }}>
          {variant === 'gallery' ? 'Learn' : 'Courses'}
        </h1>
        {variant === 'list' && (
          <p style={{ fontSize: 10, color: ios.textSecondaryLight, marginTop: 2 }}>
            Welcome back. Let&apos;s start learning.
          </p>
        )}
        {/* Settings — iOS: icon-manage_accounts (person with gear), accentColor */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill={ios.accent} className="absolute" style={{ right: 14, top: 6 }}>
          <path d="M10.82 12.525c-.22-.01-.44-.02-.67-.02-2.42 0-4.68.67-6.61 1.82-.88.52-1.39 1.5-1.39 2.53v1.65c0 .55.45 1 1 1h8.26a6.97 6.97 0 01-1.26-4c0-1.07.25-2.07.67-2.98z"/>
          <path d="M10.15 11.505a4 4 0 100-8 4 4 0 000 8z"/>
          <path d="M20.9 15.505c0-.22-.03-.42-.06-.63l.84-.73c.18-.16.22-.42.1-.63l-.59-1.02c-.12-.21-.37-.3-.59-.22l-1.06.36a3.56 3.56 0 00-.78-.53l-.22-1.09a.49.49 0 00-.49-.37h-1.18c-.24 0-.44.17-.49.4l-.22 1.09c-.4.15-.76.36-1.08.63l-1.06-.36c-.23-.08-.47.02-.59.22l-.59 1.02c-.12.21-.08.47.1.63l.84.73c-.03.21-.06.41-.06.63s.03.42.06.63l-.84.73c-.18.16-.22.42-.1.63l.59 1.02c.12.21.37.3.59.22l1.06-.36c.32.27.68.48 1.08.63l.22 1.09c.05.23.25.4.49.4h1.18c.24 0 .44-.17.49-.4l.22-1.09c.4-.15.76-.36 1.08-.63l1.06.36c.23.08.47-.02.59-.22l.59-1.02c.12-.21.08-.47-.1-.63l-.84-.73c.03-.21.06-.41.06-.63zm-3.75 2c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
      </div>

      {variant === 'gallery' ? (
        <GalleryView showProgress={showProgress} showDropdownNav={showDropdownNav} />
      ) : (
        <ListView showProgress={showProgress} />
      )}

      <TabBar active="learn" />
    </div>
  )
}

/* ─── Gallery View (PrimaryCourseDashboardView — gallery mode) ─── */

function GalleryView({ showProgress, showDropdownNav }: { showProgress: boolean; showDropdownNav: boolean }) {
  return (
    <div className="flex-1 overflow-hidden" style={{ padding: '6px 14px 0' }}>
      {/* ── Primary Course Card ──
          iOS: padding 20pt, cornerRadius 8pt, shadow(4pt, y:3), courseCardBackground */}
      <div
        className="overflow-hidden"
        style={{
          borderRadius: 6,
          backgroundColor: '#1C2636',
          boxShadow: '0 2px 3px rgba(0,0,0,0.4)',
        }}
      >
        {/* Banner — iOS: 140pt height, aspectRatio fill */}
        <div className="relative" style={{ height: 100 }}>
          <img src={learn0} alt="" className="h-full w-full object-cover" />
        </div>

        {/* Progress line — iOS: 8pt height, primaryCardProgressBG track, accentButtonColor fill */}
        {showProgress && (
          <div style={{ height: 6, backgroundColor: '#4E5A6F' }}>
            <div className="h-full" style={{ width: '40%', backgroundColor: ios.accent }} />
          </div>
        )}

        {/* Course info — iOS: VStack spacing 3pt, padding(top:10, h:12, bottom:16) */}
        <div style={{ padding: '7px 9px 11px' }}>
          <span style={{ fontSize: 9, color: ios.textSecondaryLight, display: 'block', lineHeight: 1.3 }}>
            RG
          </span>
          <p
            className="font-bold"
            style={{ fontSize: 16, lineHeight: 1.2, color: ios.textPrimary, marginTop: 2 }}
          >
            AI For Beginners
          </p>
          <span
            style={{ fontSize: 9, color: ios.textSecondaryLight, display: 'block', marginTop: 2, lineHeight: 1.3 }}
          >
            January 1, 2024 — February 10, 2024
          </span>
        </div>

        {/* ── Assignment Buttons ──
            iOS: HStack spacing 0, icon 24x24 padding(12), text VStack spacing 6pt,
            chevron padding(8), divider 1pt cardViewStroke */}

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: ios.cardStroke }} />

        {/* Past Due Assignment — iOS: primaryCardCautionBG (transparent dark) */}
        <div className="flex items-center" style={{ padding: '6px 0' }}>
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 28 }}>
            {/* iOS: icon-warning.svg — filled triangle */}
            <svg width="17" height="17" viewBox="0 0 177 177" fill={ios.warning}>
              <path d="M32.97 151.22h111.07c11.36 0 18.44-12.32 12.76-22.13L101.26 33.14c-5.68-9.81-19.84-9.81-25.52 0L20.21 129.09c-5.68 9.81 1.4 22.13 12.76 22.13zM88.5 99.59c-4.06 0-7.38-3.32-7.38-7.38V77.47c0-4.06 3.32-7.38 7.38-7.38 4.06 0 7.38 3.32 7.38 7.38v14.75c0 4.06-3.32 7.38-7.38 7.38zm7.38 29.5H81.13v-14.75h14.75v14.75z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0" style={{ paddingTop: 1 }}>
            <span style={{ fontSize: 8, color: ios.textSecondaryLight, display: 'block', lineHeight: 1.2 }}>
              1 Past Due Assignment
            </span>
            <p className="font-medium" style={{ fontSize: 10, color: ios.textPrimary, lineHeight: 1.2, marginTop: 3 }}>
              Homework
            </p>
          </div>
          <div className="flex-shrink-0" style={{ padding: '0 9px 0 4px' }}>
            {/* iOS: chevron_right.svg */}
            <svg width="6" height="10" viewBox="0 0 24 24" fill={ios.textSecondary}>
              <path d="M9.4 18L8 16.6 12.6 12 8 7.4 9.4 6l6 6-6 6z"/>
            </svg>
          </div>
        </div>

        {/* Resume Button — iOS: accentButtonColor background, white text */}
        <div
          className="flex items-center"
          style={{ padding: '6px 0', backgroundColor: ios.accent }}
        >
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 28 }}>
            {/* iOS: resumeCourse.svg — mortarboard/graduation cap */}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
              <path d="M4.453 13.176v2.81c0 .73.4 1.41 1.04 1.76l5-2.27c.6.33 1.32.33 1.92 0l5 2.27c.64-.35 1.04-1.03 1.04-1.76v-2.81l-6.04 3.3c-.6.33-1.32.33-1.92 0l-6.04-3.3zm6.04-9.66l-8.43 4.6c-.69.38-.69 1.38 0 1.76l8.43 4.6c.6.33 1.32.33 1.92 0l8.04-4.39v5.91c0 .55.45 1 1 1s1-.45 1-1V9.586c0-.37-.2-.7-.52-.88l-9.52-5.19c-.72-.32-1.44-.32-1.92 0z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0" style={{ paddingTop: 1 }}>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1.2 }}>
              Resume Course
            </span>
            <p className="font-medium" style={{ fontSize: 10, color: '#FFFFFF', lineHeight: 1.2, marginTop: 3 }}>
              Welcome Message
            </p>
          </div>
          <div className="flex-shrink-0" style={{ padding: '0 9px 0 4px' }}>
            {/* iOS: chevron_right.svg */}
            <svg width="6" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M9.4 18L8 16.6 12.6 12 8 7.4 9.4 6l6 6-6 6z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Dropdown navigation (course_dropdown_nav feature) */}
      {showDropdownNav && (
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: 8,
            padding: '6px 10px',
            borderRadius: 6,
            backgroundColor: ios.accent + '15',
            border: `1px solid ${ios.accent}30`,
          }}
        >
          <span className="font-medium" style={{ fontSize: 9, color: ios.textPrimary }}>
            Section 1: Introduction
          </span>
          <span style={{ fontSize: 10, color: ios.accent }}>▾</span>
        </div>
      )}

      {/* ── View All Courses ──
          iOS: HStack, titleSmall 14pt Medium, textPrimary, padding(.horizontal, 16) */}
      <div
        className="flex items-center justify-between"
        style={{ marginTop: 10, padding: '0 2px' }}
      >
        <span className="font-medium" style={{ fontSize: 10, color: ios.textPrimary }}>
          View All Courses (40)
        </span>
        {/* iOS: chevron_right.svg */}
        <svg width="8" height="8" viewBox="0 0 24 24" fill={ios.textPrimary}>
          <path d="M9.4 18L8 16.6 12.6 12 8 7.4 9.4 6l6 6-6 6z"/>
        </svg>
      </div>

      {/* ── Secondary Course Cards ──
          iOS: HStack spacing 16pt, card width 120pt, cornerRadius 8pt,
          shadow(6pt, x:2, y:2), image 90-100pt, progress 4pt */}
      <div className="flex overflow-hidden" style={{ marginTop: 8, gap: 11 }}>
        {secondaryCourses.map((course, i) => (
          <div
            key={i}
            className="flex-shrink-0 overflow-hidden"
            style={{
              width: 85,
              borderRadius: 6,
              backgroundColor: '#1C2636',
              boxShadow: '1.5px 1.5px 4px rgba(0,0,0,0.4)',
            }}
          >
            {/* Card image — iOS: 90-100pt height */}
            <img src={course.img} alt="" className="w-full object-cover" style={{ height: 64 }} />

            {/* Progress bar — iOS: 4pt height */}
            {showProgress && (
              <div style={{ height: 3, backgroundColor: '#4E5A6F' }}>
                <div className="h-full" style={{ width: `${course.progress}%`, backgroundColor: ios.accent }} />
              </div>
            )}

            {/* Card info — iOS: padding(top:10, h:12, bottom:16), VStack spacing 3pt
                labelSmall date + labelMedium title 2-line limit */}
            <div style={{ padding: '6px 7px 9px' }}>
              <span style={{ fontSize: 7, color: ios.textSecondaryLight, display: 'block', lineHeight: 1.3 }}>
                {course.date}
              </span>
              <p
                className="line-clamp-2"
                style={{ fontSize: 9, color: ios.textPrimary, lineHeight: 1.25, marginTop: 2 }}
              >
                {course.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const secondaryCourses = [
  { img: learn1, title: 'Open edX Demo Course', date: 'Feb 2024', progress: 75 },
  { img: learn2, title: 'Data Science 101', date: 'Mar 2024', progress: 10 },
  { img: learn0, title: 'Machine Learning Basics', date: 'Apr 2024', progress: 0 },
]

/* ─── List View (ListDashboardView) ─── */

const listCourses = [
  { title: 'AI For Beginners', org: 'RG', image: learn0, progress: 40 },
  { title: 'Open edX Demo Course', org: 'OpenEdX', image: learn1, progress: 75 },
  { title: 'Data Science 101', org: 'MIT', image: learn2, progress: 10 },
]

function ListView({ showProgress }: { showProgress: boolean }) {
  return (
    <div className="flex-1 overflow-hidden" style={{ padding: '10px 14px 0' }}>
      {listCourses.map((course, i) => (
        <div key={i}>
          <div className="flex items-center" style={{ gap: 10, padding: '8px 0' }}>
            {/* Course image — iOS: cornerRadius 8pt */}
            <div
              className="relative flex-shrink-0 overflow-hidden"
              style={{ width: 52, height: 52, borderRadius: 6 }}
            >
              <img src={course.image} alt="" className="h-full w-full object-cover" />
              {/* Progress bar overlay */}
              {showProgress && (
                <div
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: 3, backgroundColor: '#4E5A6F' }}
                >
                  <div
                    className="h-full"
                    style={{ width: `${course.progress}%`, backgroundColor: ios.accent }}
                  />
                </div>
              )}
            </div>

            {/* Course info */}
            <div className="min-w-0 flex-1">
              <span style={{ fontSize: 9, color: ios.textSecondaryLight, display: 'block', lineHeight: 1.3 }}>
                {course.org}
              </span>
              <p
                className="font-semibold"
                style={{ fontSize: 10, color: ios.textPrimary, lineHeight: 1.3, marginTop: 1 }}
              >
                {course.title}
              </p>
            </div>

            {/* Chevron */}
            {/* iOS: chevron_right.svg */}
            <svg width="6" height="10" viewBox="0 0 24 24" fill={ios.accent} className="flex-shrink-0">
              <path d="M9.4 18L8 16.6 12.6 12 8 7.4 9.4 6l6 6-6 6z"/>
            </svg>
          </div>

          {/* Divider — iOS: cardViewStroke */}
          {i < listCourses.length - 1 && (
            <div style={{ height: 0.5, backgroundColor: ios.cardStroke }} />
          )}
        </div>
      ))}
    </div>
  )
}
