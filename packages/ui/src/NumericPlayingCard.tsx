import { motion } from 'framer-motion'
import { CardBackGraphic, cardBackShellStyle } from './tableGraphics'

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
  void backDesign

  const sizeStyles = {
    small: { width: '64px', height: '96px', fontSize: '24px', cornerSize: '14px' },
    normal: { width: '80px', height: '112px', fontSize: '32px', cornerSize: '16px' },
    large: { width: '96px', height: '144px', fontSize: '48px', cornerSize: '18px' },
  }

  const variantColors = {
    emerald: { border: 'rgba(0,255,180,0.8)', accent: 'rgb(0,255,180)', glow: 'rgba(0,255,180,0.3)' },
    gold: { border: 'rgba(255,215,0,0.8)', accent: 'rgb(255,215,0)', glow: 'rgba(255,215,0,0.3)' },
    purple: { border: 'rgba(139,92,246,0.8)', accent: 'rgb(139,92,246)', glow: 'rgba(139,92,246,0.3)' },
    red: { border: 'rgba(255,68,68,0.8)', accent: 'rgb(255,68,68)', glow: 'rgba(255,68,68,0.3)' },
    blue: { border: 'rgba(59,130,246,0.8)', accent: 'rgb(59,130,246)', glow: 'rgba(59,130,246,0.3)' },
    cyan: { border: 'rgba(0,255,255,0.8)', accent: 'rgb(0,255,255)', glow: 'rgba(0,255,255,0.3)' },
    pink: { border: 'rgba(255,105,180,0.8)', accent: 'rgb(255,105,180)', glow: 'rgba(255,105,180,0.3)' },
    orange: { border: 'rgba(255,165,0,0.8)', accent: 'rgb(255,165,0)', glow: 'rgba(255,165,0,0.3)' },
    lime: { border: 'rgba(50,205,50,0.8)', accent: 'rgb(50,205,50)', glow: 'rgba(50,205,50,0.3)' },
    violet: { border: 'rgba(148,0,211,0.8)', accent: 'rgb(148,0,211)', glow: 'rgba(148,0,211,0.3)' },
  }

  const styles = sizeStyles[size]
  const colors = variantColors[variant]

  if (faceDown) {
    const CardRoot = animated ? motion.div : 'div'

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

  const getCardStyle = () => {
    const baseStyle = {
      width: styles.width,
      height: styles.height,
      borderRadius: '12px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      margin: '10px',
    }

    switch (style) {
      case 'solid':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${colors.accent}40, ${colors.accent}20)`,
          border: `3px solid ${colors.accent}`,
          boxShadow: `0 4px 12px ${colors.glow}`,
        }

      case 'gradient':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${colors.accent}60, ${colors.accent}30, ${colors.accent}10)`,
          border: `2px solid ${colors.accent}`,
          boxShadow: `0 6px 20px ${colors.glow}`,
        }

      case 'neon': {
        const neonVariants = {
          standard: {
            boxShadow: `0 0 20px ${colors.accent}, 0 0 40px ${colors.accent}40, inset 0 0 20px ${colors.accent}20`,
            animation: 'none',
          },
          pulse: {
            boxShadow: `0 0 20px ${colors.accent}, 0 0 40px ${colors.accent}40, inset 0 0 20px ${colors.accent}20`,
            animation: 'neon-pulse 2s ease-in-out infinite',
          },
          flicker: {
            boxShadow: `0 0 20px ${colors.accent}, 0 0 40px ${colors.accent}40, inset 0 0 20px ${colors.accent}20`,
            animation: 'neon-flicker 0.5s ease-in-out infinite',
          },
          rainbow: {
            boxShadow: `0 0 20px ${colors.accent}, 0 0 40px ${colors.accent}40, inset 0 0 20px ${colors.accent}20`,
            animation: 'neon-rainbow 3s linear infinite',
          },
          matrix: {
            boxShadow: `0 0 20px ${colors.accent}, 0 0 40px ${colors.accent}40, inset 0 0 20px ${colors.accent}20`,
            animation: 'neon-matrix 4s ease-in-out infinite',
          },
        }

        return {
          ...baseStyle,
          background: 'rgba(0,0,0,0.9)',
          border: `2px solid ${colors.accent}`,
          ...neonVariants[neonVariant],
        }
      }

      default:
        return {
          ...baseStyle,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          border: `2px solid ${colors.border}`,
          boxShadow: `0 4px 12px ${colors.glow}`,
        }
    }
  }

  const cardStyle = getCardStyle()

  const cornerStyle = {
    position: 'absolute' as const,
    fontWeight: 'bold' as const,
    color: colors.accent,
    zIndex: 10,
    fontSize: styles.cornerSize,
    textShadow: style === 'neon' ? `0 0 8px ${colors.accent}` : 'none',
  }

  const digitStyle = {
    position: 'absolute' as const,
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    fontSize: styles.fontSize,
    fontWeight: 'bold' as const,
    color: style === 'neon' ? colors.accent : 'black',
    zIndex: 10,
    textShadow: style === 'neon' ? `0 0 12px ${colors.accent}` : 'none',
  }

  const CardRoot = animated ? motion.div : 'div'

  return (
    <CardRoot
      style={cardStyle}
      initial={animated ? { rotateY: -10, opacity: 0 } : undefined}
      animate={animated ? { rotateY: 0, opacity: 1 } : undefined}
      transition={animated ? { type: 'spring', stiffness: 200, damping: 18 } : undefined}
      whileHover={animated ? { scale: 1.05 } : undefined}
    >
      <div style={{ ...cornerStyle, top: '4px', left: '4px' }}>{digit}</div>
      <div style={{ ...cornerStyle, bottom: '4px', right: '4px', transform: 'rotate(180deg)' }}>{digit}</div>
      <div style={digitStyle}>
        <span
          style={{
            background:
              style === 'neon'
                ? 'rgba(0,0,0,0.8)'
                : 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5))',
            padding: '8px 12px',
            borderRadius: '8px',
            boxShadow: style === 'neon' ? `0 0 8px ${colors.accent}` : '0 2px 4px rgba(0,0,0,0.1)',
            border: style === 'neon' ? `1px solid ${colors.accent}` : 'none',
          }}
        >
          {digit}
        </span>
      </div>
    </CardRoot>
  )
}
