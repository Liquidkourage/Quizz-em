import { motion } from 'framer-motion'
import { CardFaceGraphic } from './CardFaceGraphic'
import { CardBackGraphic, cardBackShellStyle } from './tableGraphics'

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
}: {
  digit: number
  size?: 'small' | 'normal' | 'large'
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue' | 'cyan' | 'pink' | 'orange' | 'lime' | 'violet'
  faceDown?: boolean
  animated?: boolean
  style?: 'glass' | 'solid' | 'gradient' | 'neon'
  neonVariant?: 'standard' | 'pulse' | 'flicker' | 'rainbow' | 'matrix'
  backDesign?: 'spade' | 'diamond' | 'club' | 'heart' | 'star' | 'crown' | 'joker' | 'geometric' | 'circuit' | 'cosmic' | 'neon'
}) {
  void variant
  void style
  void neonVariant
  void backDesign

  const styles = SIZE_STYLES[size]
  const CardRoot = animated ? motion.div : 'div'

  if (faceDown) {
    return (
      <CardRoot
        style={cardBackShellStyle(styles.width, styles.height)}
        initial={animated ? { rotateY: 180, opacity: 0 } : undefined}
        animate={animated ? { rotateY: 180, opacity: 1 } : undefined}
        transition={animated ? { type: 'spring', stiffness: 200, damping: 18 } : undefined}
        whileHover={animated ? { scale: 1.05 } : undefined}
      >
        <CardBackGraphic className="absolute inset-0" />
      </CardRoot>
    )
  }

  return (
    <CardRoot
      style={{
        width: styles.width,
        height: styles.height,
        margin: '10px',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.45)',
      }}
      initial={animated ? { rotateY: -10, opacity: 0 } : undefined}
      animate={animated ? { rotateY: 0, opacity: 1 } : undefined}
      transition={animated ? { type: 'spring', stiffness: 200, damping: 18 } : undefined}
      whileHover={animated ? { scale: 1.05 } : undefined}
    >
      <CardFaceGraphic digit={digit} className="absolute inset-0 h-full w-full" alt={`Card ${digit}`} />
    </CardRoot>
  )
}
