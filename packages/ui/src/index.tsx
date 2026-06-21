import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { PokerChip } from './PokerChip';
import { CardBackGraphic, cardBackShellStyle } from './tableGraphics';

export function NeonButton({ 
  children, 
  className, 
  variant = 'emerald',
  size = 'normal',
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue';
  size?: 'small' | 'normal' | 'large';
}) {
  const variants = {
    emerald: 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,180,0.6)] hover:shadow-[0_0_30px_rgba(0,255,180,0.8)]',
    gold: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-[0_0_20px_rgba(255,215,0,0.6)] hover:shadow-[0_0_30px_rgba(255,215,0,0.8)]',
    purple: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:shadow-[0_0_30px_rgba(139,92,246,0.8)]',
    red: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-[0_0_20px_rgba(255,68,68,0.6)] hover:shadow-[0_0_30px_rgba(255,68,68,0.8)]',
    blue: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] hover:shadow-[0_0_30px_rgba(59,130,246,0.8)]',
  };

  const sizes = {
    small: 'px-4 py-2 text-sm font-semibold rounded-lg',
    normal: 'px-6 py-3 text-base font-bold rounded-xl',
    large: 'px-8 py-4 text-lg font-bold rounded-2xl',
  };

  return (
    <motion.button
      whileHover={{ 
        scale: 1.05, 
        boxShadow: '0 0 30px currentColor, 0 0 60px currentColor, 0 0 90px currentColor',
        filter: 'brightness(1.2)'
      }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'relative overflow-hidden transition-all duration-300 font-bold tracking-wide',
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
        variants[variant],
        sizes[size],
        className
      )}
      {...(props as any)}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}

export function Card({ 
  children, 
  className,
  variant = 'glass',
  hover = true
}: { 
  children: React.ReactNode; 
  className?: string;
  variant?: 'glass' | 'dark' | 'neon';
  hover?: boolean;
}) {
  const variants = {
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg',
    dark: 'bg-black/80 backdrop-blur-sm border border-white/5 shadow-lg',
    neon: 'bg-white/10 backdrop-blur-md border border-emerald-400/30 shadow-[0_0_20px_rgba(0,255,180,0.6)]',
  };

  return (
    <motion.div 
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300',
        variants[variant],
        hover && 'hover:shadow-xl hover:border-white/30',
        className
      )}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
    >
      {children}
    </motion.div>
  );
}

export function DigitChip({ 
  digit, 
  size = 'normal',
  variant = 'emerald',
  animated = true
}: { 
  digit: number; 
  size?: 'small' | 'normal' | 'large';
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue';
  animated?: boolean;
}) {
  const sizeClasses = {
    small: 'w-10 h-10 text-sm',
    normal: 'w-14 h-14 text-lg',
    large: 'w-20 h-20 text-2xl',
  };

  const variants = {
    emerald: 'bg-gradient-to-br from-emerald-400 to-cyan-400 shadow-[0_0_20px_rgba(0,255,180,0.6)]',
    gold: 'bg-gradient-to-br from-yellow-400 to-orange-400 shadow-[0_0_20px_rgba(255,215,0,0.6)]',
    purple: 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(139,92,246,0.6)]',
    red: 'bg-gradient-to-br from-red-500 to-pink-500 shadow-[0_0_20px_rgba(255,68,68,0.6)]',
    blue: 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]',
  };

  const ChipComponent = animated ? motion.div : 'div';

  return (
    <ChipComponent 
      className={clsx(
        "rounded-full text-black font-black grid place-items-center relative overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:to-transparent",
        "after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/20 after:to-transparent",
        sizeClasses[size],
        variants[variant]
      )}
      initial={animated ? { scale: 0, rotate: 180 } : undefined}
      animate={animated ? { scale: 1, rotate: 0 } : undefined}
      transition={animated ? { type: "spring", stiffness: 200, damping: 15 } : undefined}
      whileHover={animated ? { 
        scale: 1.1, 
        rotateY: 180,
        boxShadow: '0 0 40px currentColor, 0 0 80px currentColor, 0 0 120px currentColor'
      } : undefined}
    >
      <span className="relative z-10 drop-shadow-lg">{digit}</span>
    </ChipComponent>
  );
}

export function NeonText({ 
  children, 
  className,
  variant = 'emerald',
  size = 'normal',
  animated = true
}: { 
  children: React.ReactNode;
  className?: string;
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue';
  size?: 'small' | 'normal' | 'large';
  animated?: boolean;
}) {
  const variants = {
    emerald: 'text-emerald-400 drop-shadow-[0_0_10px_rgba(0,255,180,0.8)]',
    gold: 'text-yellow-400 drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]',
    purple: 'text-purple-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]',
    red: 'text-red-400 drop-shadow-[0_0_10px_rgba(255,68,68,0.8)]',
    blue: 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]',
  };

  const sizes = {
    small: 'text-lg font-bold',
    normal: 'text-2xl font-black',
    large: 'text-4xl font-black',
  };

  const TextComponent = animated ? motion.span : 'span';

  return (
    <TextComponent 
      className={clsx(
        'font-bold tracking-wide',
        variants[variant],
        sizes[size],
        animated && 'animate-glow',
        className
      )}
    >
      {children}
    </TextComponent>
  );
}

export function JackpotDisplay({
  amount,
  className,
  variant = 'showcase',
}: {
  amount: number
  className?: string
  /** showcase = flashy public-TV style; control = same typography as host Game status rows */
  variant?: 'showcase' | 'control'
}) {
  if (variant === 'control') {
    return (
      <div className={clsx('text-center', className)}>
        <div className="text-lg text-white">Table pot:</div>
        <span className="text-casino-emerald font-bold text-xl tabular-nums">
          ${amount.toLocaleString()}
        </span>
      </div>
    )
  }

  return (
    <motion.div
      className={clsx(
        'relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-yellow-400 via-emerald-400 to-purple-500',
        'shadow-[0_0_20px_rgba(255,215,0,0.6)] border border-yellow-400/50',
        className,
      )}
      animate="jackpot"
      variants={{
        jackpot: {
          scale: [1, 1.05, 1.1, 1.05, 1],
          rotate: [0, 2, -2, 2, 0],
          filter: [
            'brightness(1)',
            'brightness(1.2)',
            'brightness(1.4)',
            'brightness(1.2)',
            'brightness(1)',
          ],
          transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        },
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
      <div className="relative z-10 text-center">
        <div className="text-sm text-black/70 font-semibold mb-1">JACKPOT</div>
        <div className="text-3xl font-black text-black drop-shadow-lg">
          ${amount.toLocaleString()}
        </div>
      </div>
    </motion.div>
  )
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,180,0.1),transparent_50%)] animate-pulse-slow" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,215,0,0.05),transparent_50%)] animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.05),transparent_50%)] animate-pulse-slow" style={{ animationDelay: '2s' }} />
    </div>
  );
}

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
  digit: number;
  size?: 'small' | 'normal' | 'large';
  variant?: 'emerald' | 'gold' | 'purple' | 'red' | 'blue' | 'cyan' | 'pink' | 'orange' | 'lime' | 'violet';
  faceDown?: boolean;
  animated?: boolean;
  style?: 'glass' | 'solid' | 'gradient' | 'neon';
  neonVariant?: 'standard' | 'pulse' | 'flicker' | 'rainbow' | 'matrix';
  backDesign?: 'spade' | 'diamond' | 'club' | 'heart' | 'star' | 'crown' | 'joker' | 'geometric' | 'circuit' | 'cosmic' | 'neon';
}) {
  const sizeStyles = {
    small: { width: '64px', height: '96px', fontSize: '24px', cornerSize: '14px' },
    normal: { width: '80px', height: '112px', fontSize: '32px', cornerSize: '16px' },
    large: { width: '96px', height: '144px', fontSize: '48px', cornerSize: '18px' },
  };

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
  };

  const styles = sizeStyles[size];
  const colors = variantColors[variant];

  // Card back — official artwork asset
  if (faceDown) {
    const CardRoot = animated ? motion.div : 'div';

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
    );
  }

  // Front card styles
  const getCardStyle = () => {
    const baseStyle = {
      width: styles.width,
      height: styles.height,
      borderRadius: '12px',
      position: 'relative' as const,
      overflow: 'hidden' as const,
      margin: '10px',
    };

    switch (style) {
      case 'solid':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${colors.accent}40, ${colors.accent}20)`,
          border: `3px solid ${colors.accent}`,
          boxShadow: `0 4px 12px ${colors.glow}`,
        };
      
      case 'gradient':
        return {
          ...baseStyle,
          background: `linear-gradient(135deg, ${colors.accent}60, ${colors.accent}30, ${colors.accent}10)`,
          border: `2px solid ${colors.accent}`,
          boxShadow: `0 6px 20px ${colors.glow}`,
        };
      
      case 'neon':
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
        };

        return {
          ...baseStyle,
          background: 'rgba(0,0,0,0.9)',
          border: `2px solid ${colors.accent}`,
          ...neonVariants[neonVariant],
        };
      
      default: // glass
        return {
          ...baseStyle,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          border: `2px solid ${colors.border}`,
          boxShadow: `0 4px 12px ${colors.glow}`,
        };
    }
  };

  const cardStyle = getCardStyle();

  const cornerStyle = {
    position: 'absolute' as const,
    fontWeight: 'bold' as const,
    color: colors.accent,
    zIndex: 10,
    fontSize: styles.cornerSize,
    textShadow: style === 'neon' ? `0 0 8px ${colors.accent}` : 'none',
  };

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
  };

  const CardRoot = animated ? motion.div : 'div';

  return (
    <CardRoot
      style={cardStyle}
      initial={animated ? { rotateY: -10, opacity: 0 } : undefined}
      animate={animated ? { rotateY: 0, opacity: 1 } : undefined}
      transition={animated ? { type: 'spring', stiffness: 200, damping: 18 } : undefined}
      whileHover={animated ? { scale: 1.05 } : undefined}
    >
      {/* Corners */}
      <div style={{ ...cornerStyle, top: '4px', left: '4px' }}>{digit}</div>
      <div style={{ ...cornerStyle, bottom: '4px', right: '4px', transform: 'rotate(180deg)' }}>{digit}</div>

      {/* Center Digit */}
      <div style={digitStyle}>
        <span style={{
          background: style === 'neon' 
            ? 'rgba(0,0,0,0.8)' 
            : 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.5))',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: style === 'neon' ? `0 0 8px ${colors.accent}` : '0 2px 4px rgba(0,0,0,0.1)',
          border: style === 'neon' ? `1px solid ${colors.accent}` : 'none',
        }}>
      {digit}
        </span>
      </div>
    </CardRoot>
  );
}

export { PokerChip };
export { QuizzEmWordmark, type QuizzEmWordmarkProps } from './QuizzEmWordmark';
export {
  PokerTableGraphic,
  CupholderGraphic,
  SeatCupholderMarker,
  CardBackGraphic,
  CARD_BACK_IMAGE_SRC,
  type SeatCupholderState,
} from './tableGraphics';
export default {};
