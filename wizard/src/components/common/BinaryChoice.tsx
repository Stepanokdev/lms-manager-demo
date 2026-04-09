import { motion } from 'motion/react'
import { PhonePreview } from './PhonePreview'
import { staggerContainer, fadeInUp } from '@/utils/animations'
import type { FeatureOption } from '@/types/features'
import type { ReactNode } from 'react'

interface BinaryChoiceProps {
  options: [FeatureOption, FeatureOption]
  value: string | boolean | number
  onChange: (value: string | boolean | number) => void
  renderScreen?: (optionValue: string | boolean | number) => ReactNode
}

export function BinaryChoice({ options, value, onChange, renderScreen }: BinaryChoiceProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-center gap-12"
    >
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <motion.div key={String(option.value)} variants={fadeInUp}>
            <PhonePreview
              selected={isSelected}
              onClick={() => onChange(option.value)}
              label={option.label}
            >
              {renderScreen ? (
                renderScreen(option.value)
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface-800 p-3">
                  <div className="text-center text-surface-400">
                    <div className="text-4xl">📱</div>
                    <div className="mt-2 text-sm font-medium">{option.label}</div>
                    <div className="mt-1 text-xs text-surface-500">{option.description}</div>
                  </div>
                </div>
              )}
            </PhonePreview>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
