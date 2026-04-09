import { motion } from 'motion/react'
import { fadeInUp } from '@/utils/animations'

interface SectionTitleProps {
  title: string
  subtitle: string
  icon?: string
}

export function SectionTitle({ title, subtitle, icon }: SectionTitleProps) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <h2 className="text-4xl font-bold tracking-tight text-white">
        {icon && <span className="mr-3">{icon}</span>}
        {title}
      </h2>
      <p className="mt-2 text-xl text-surface-400">{subtitle}</p>
    </motion.div>
  )
}
