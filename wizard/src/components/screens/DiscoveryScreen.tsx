import { StatusBar, TabBar, SearchField, ios } from './shared'
import discovery0 from '@/assets/app/discovery0.png'
import discovery1 from '@/assets/app/discovery1.png'
import discovery2 from '@/assets/app/discovery2.png'

const courses = [
  { org: 'OpenEdX', title: 'Open edX Demo Course', image: discovery0 },
  { org: 'RG', title: 'AI For Beginners', image: discovery2 },
  { org: 'TesOrg40', title: 'Dev Course 40 for testing', image: discovery1 },
  { org: 'TestOrg11', title: 'Dev Course 11 for testing purposes', image: discovery2 },
]

interface DiscoveryScreenProps {
  variant?: 'native' | 'none'
}

export function DiscoveryScreen({ variant = 'native' }: DiscoveryScreenProps) {
  if (variant === 'none') {
    return (
      <div className="flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
        <StatusBar />
        <div className="flex flex-1 flex-col items-center justify-center px-8">
          {/* iOS: discover_inactive.svg with X overlay */}
          <svg width="48" height="48" viewBox="0 0 24 24" fill={ios.textSecondaryLight}>
            <path d="M15.755 14.255h-.79l-.28-.27a6.47 6.47 0 001.57-4.23 6.49 6.49 0 00-6.5-6.5 6.49 6.49 0 00-6.5 6.5 6.49 6.49 0 006.5 6.5c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99 1.49-1.49-5-5zm-6 0c-2.49 0-4.5-2.01-4.5-4.5s2.01-4.5 4.5-4.5 4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5z"/>
            <line x1="8" y1="8" x2="12" y2="12" stroke={ios.alert} strokeWidth="1.5" />
            <line x1="12" y1="8" x2="8" y2="12" stroke={ios.alert} strokeWidth="1.5" />
          </svg>
          <p className="mt-4 text-center text-[16px] font-semibold" style={{ color: ios.textPrimary }}>
            Discovery Disabled
          </p>
          <p className="mt-2 text-center text-[13px]" style={{ color: ios.textSecondary }}>
            Users will only see their enrolled courses
          </p>
        </div>
        <TabBar active="discover" />
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />

      {/* Search field (fake/tappable like iOS original) */}
      <div className="px-6 pt-2 pb-4">
        <SearchField placeholder="Search" />
      </div>

      {/* Title section */}
      <div className="px-6">
        <h1 className="text-[28px] font-bold" style={{ color: ios.textPrimary }}>
          Discover new
        </h1>
        <p className="mt-1 text-[14px]" style={{ color: ios.textSecondary }}>
          Let's find a new course for you.
        </p>
      </div>

      {/* Course list */}
      <div className="mt-5 flex-1 overflow-hidden px-6">
        {courses.map((course, i) => (
          <div key={i}>
            <div className="flex items-center gap-3 py-3">
              <img
                src={course.image}
                alt=""
                className="h-[68px] w-[68px] flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[12px]" style={{ color: ios.textSecondary }}>
                  {course.org}
                </span>
                <p className="mt-0.5 text-[14px] font-semibold leading-tight" style={{ color: ios.textPrimary }}>
                  {course.title}
                </p>
              </div>
            </div>
            {i < courses.length - 1 && (
              <div className="h-px" style={{ backgroundColor: ios.cardStroke }} />
            )}
          </div>
        ))}
      </div>

      <TabBar active="discover" />
    </div>
  )
}
