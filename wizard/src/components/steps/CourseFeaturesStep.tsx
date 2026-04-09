import { SectionTitle } from '@/components/common/SectionTitle'
import { FeatureCard } from '@/components/common/FeatureCard'
import { PhonePreview } from '@/components/common/PhonePreview'
import { useWizardStore } from '@/store/useWizardStore'
import { getFeaturesByCategory } from '@/data/features'
import { CourseContentScreen } from '@/components/screens'

export function CourseFeaturesStep() {
  const selections = useWizardStore((s) => s.selections)
  const setSelection = useWizardStore((s) => s.setSelection)
  const courseFeatures = getFeaturesByCategory('course-features')

  return (
    <div className="flex h-full">
      <div className="flex max-w-xl flex-1 flex-col overflow-y-auto px-10 py-8">
        <SectionTitle icon="📚" title="Course Features" subtitle="Enhance the learning experience" />

        <div className="space-y-3">
          {courseFeatures.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              enabled={selections[feature.id] === true}
              onToggle={(val) => setSelection(feature.id, val)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center border-l border-white/5 bg-white/[0.01]">
        <PhonePreview size="lg">
          <CourseContentScreen
            showProgress={selections['course_progress'] === true}
            showDropdownNav={selections['course_dropdown_nav'] === true}
          />
        </PhonePreview>
      </div>
    </div>
  )
}
