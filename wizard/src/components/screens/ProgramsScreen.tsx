import { StatusBar, TabBar, ios } from './shared'
import learn0 from '@/assets/app/learn0.png'
import learn1 from '@/assets/app/learn1.png'
import learn2 from '@/assets/app/learn2.png'

const programs = [
  {
    title: 'Data Science Professional',
    org: 'MITx',
    image: learn0,
    completed: 2,
    inProgress: 1,
    remaining: 3,
    type: 'MicroMasters',
  },
  {
    title: 'Computer Science Fundamentals',
    org: 'HarvardX',
    image: learn1,
    completed: 1,
    inProgress: 1,
    remaining: 2,
    type: 'XSeries',
  },
  {
    title: 'Business Administration',
    org: 'OpenEdX',
    image: learn2,
    completed: 0,
    inProgress: 1,
    remaining: 4,
    type: 'Professional Certificate',
  },
]

export function ProgramsScreen() {
  return (
    <div className="relative flex h-full w-full flex-col" style={{ backgroundColor: ios.bg }}>
      <StatusBar />

      {/* Header */}
      <div className="px-5 pt-1">
        <h1 className="text-[28px] font-bold" style={{ color: ios.textPrimary }}>
          Programs
        </h1>
      </div>

      {/* Program cards */}
      <div className="mt-3 flex-1 overflow-hidden px-5 space-y-3">
        {programs.map((program, i) => {
          const total = program.completed + program.inProgress + program.remaining
          const progressPercent = ((program.completed + program.inProgress * 0.5) / total) * 100
          return (
            <div
              key={i}
              className="overflow-hidden rounded-lg"
              style={{
                backgroundColor: ios.bgCard,
                boxShadow: `0 2px 6px ${ios.shadow}`,
              }}
            >
              {/* Banner */}
              <div className="relative h-[60px]">
                <img src={program.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span
                  className="absolute bottom-1.5 left-2.5 rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase"
                  style={{ backgroundColor: ios.accent, color: ios.white }}
                >
                  {program.type}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-[4px]" style={{ backgroundColor: ios.bgInput }}>
                <div
                  className="h-full"
                  style={{ width: `${progressPercent}%`, backgroundColor: ios.accent }}
                />
              </div>

              {/* Info */}
              <div className="px-2.5 pt-2 pb-2.5">
                <span className="text-[9px]" style={{ color: ios.textSecondaryLight }}>
                  {program.org}
                </span>
                <p
                  className="text-[13px] font-bold leading-tight"
                  style={{ color: ios.textPrimary }}
                >
                  {program.title}
                </p>

                {/* Stats */}
                <div className="mt-1.5 flex gap-3">
                  <span className="text-[9px]" style={{ color: ios.success }}>
                    {program.completed} completed
                  </span>
                  <span className="text-[9px]" style={{ color: ios.info }}>
                    {program.inProgress} in progress
                  </span>
                  <span className="text-[9px]" style={{ color: ios.textSecondary }}>
                    {program.remaining} remaining
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <TabBar active="programs" showPrograms />
    </div>
  )
}
