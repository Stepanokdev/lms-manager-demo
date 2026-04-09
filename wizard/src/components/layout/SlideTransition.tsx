import { AnimatePresence, motion } from 'motion/react'
import { slideVariants, slideTransition } from '@/utils/animations'
import type { ReactNode } from 'react'

interface SlideTransitionProps {
  stepIndex: number
  direction: number
  children: ReactNode
}

export function SlideTransition({ stepIndex, direction, children }: SlideTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepIndex}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={slideTransition}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
