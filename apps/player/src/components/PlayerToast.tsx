import { AnimatePresence, motion } from 'framer-motion'

type PlayerToastProps = {
  message: string | null
}

export default function PlayerToast({ message }: PlayerToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          className="fixed z-50 max-w-[min(92vw,22rem)] rounded-xl border border-white/20 bg-glass-gradient p-3 text-sm text-white shadow-lg backdrop-blur-md sm:p-4 sm:text-base"
          style={{
            top: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            right: 'max(0.75rem, env(safe-area-inset-right, 0px))',
          }}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
