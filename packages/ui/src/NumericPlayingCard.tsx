import { motion } from 'framer-motion'
import { CardBackSvg } from './CardBackSvg'
import { CardFaceGraphic } from './CardFaceGraphic'

const SIZE_STYLES = {
  small: { width: '64px', height: '96px' },
  normal: { width: '80px', height: '112px' },
  large: { width: '96px', height: '144px' },
} as const

export function NumericPlayingCard({
  digit,
  size = 'normal',
  variant = 'cyan',
  faceDown = false,
  animated = true,
  style = 'neon',
  neonVariant = 'matrix',
  backDesign = 'star',
  compact = false,
}: {
  digit: number
  size?: 'small' | 'normal' | 'large'
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue' | 'cyan' | 'pink' | 'orange' | 'lime' | 'violet'
  faceDown?: boolean
  animated?: boolean
  style?: 'glass' | 'solid' | 'gradient' | 'neon'
  neonVariant?: 'standard' | 'pulse' | 'flicker' | 'rainbow' | 'matrix'
  backDesign?: 'spade' | 'diamond' | 'club' | 'heart' | 'star' | 'crown' | 'joker' | 'geometric' | 'circuit' | 'cosmic' | 'neon'
  /** Drop outer margin — use on felt / scaled hole-card pairs. */
  compact?: boolean
}) {
  void variant
  void style
  void neonVariant
  void backDesign

  const styles = SIZE_STYLES[size]
  const CardRoot = animated ? motion.div : 'div'

  const shellStyle = compact
    ? { width: styles.width, height: styles.height, margin: 0, borderRadius: '12px', position: 'relative' as const, overflow: 'hidden' as const, boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }
    : { width: styles.width, height: styles.height, margin: '10px', borderRadius: '12px', position: 'relative' as const, overflow: 'hidden' as const, boxShadow: '0 4px 16px rgba(0,0,0,0.45)' }

  if (faceDown) {
    const backStyle = compact ? shellStyle : { ...shellStyle, margin: '10px' }
    return (
      <CardRoot
        style={backStyle}
        initial={animated ? { rotateY: 180, opacity: 0 } : undefined}
        animate={animated ? { rotateY: 180, opacity: 1 } : undefined}
        transition={animated ? { type: 'spring', stiffness: 200, damping: 18 } : undefined}
        whileHover={animated ? { scale: 1.05 } : undefined}
      >
        <CardBackSvg className="absolute inset-0 h-full w-full" />
      </CardRoot>
    )
  }

  return (
    <CardRoot
      style={shellStyle}
      initial={animated ? { rotateY: -10, opacity: 0 } : undefined}
      animate={animated ? { rotateY: 0, opacity: 1 } : undefined}
      transition={animated ? { type: 'spring', stiffness: 200, damping: 18 } : undefined}
      whileHover={animated ? { scale: 1.05 } : undefined}
    >
      <CardFaceGraphic digit={digit} className="absolute inset-0 h-full w-full" alt={`Card ${digit}`} />
    </CardRoot>
  )
}
