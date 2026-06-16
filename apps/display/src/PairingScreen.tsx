import { connectDisplayAwaitingPairing } from '@qhe/net'
import { useEffect, useRef, useState } from 'react'
import { DISPLAY_TEXT_PRIMARY, DISPLAY_TEXT_SECONDARY } from './displayTypography'

export default function PairingScreen({ onPaired }: { onPaired: (venueCode: string) => void }) {
  const [code, setCode] = useState('')
  const keepSock = useRef(false)

  useEffect(() => {
    keepSock.current = false
    const teardown = connectDisplayAwaitingPairing("Quizz'em TV", {
      onPairingCode: setCode,
      onVenueAssigned: (venueCode) => {
        keepSock.current = true
        onPaired(venueCode)
      },
    })
    return () => teardown({ keepConnected: keepSock.current })
  }, [onPaired])

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#070d1f]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.38]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 18%, rgba(59, 130, 246, 0.12), transparent 52%),
            radial-gradient(circle at 82% 88%, rgba(99, 102, 241, 0.08), transparent 42%),
            radial-gradient(#ffffff 0.85px, transparent 0.85px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 28px 28px',
          backgroundPosition: '0 0, 0 0, 14px 14px',
        }}
      />

      <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col lg:flex-row lg:items-stretch">
        <section className="flex min-h-0 flex-1 flex-col justify-center border-b border-white/[0.08] px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:py-12">
          <p className={`font-bold uppercase tracking-[0.28em] text-white/45 ${DISPLAY_TEXT_SECONDARY}`}>
            Connect display
          </p>
          <h1 className={`mt-3 font-['Orbitron',sans-serif] font-black tracking-tight text-white ${DISPLAY_TEXT_PRIMARY}`}>
            Quizz&apos;em TV
          </h1>
          <p className={`mt-5 max-w-[40ch] leading-relaxed text-white/75 ${DISPLAY_TEXT_SECONDARY}`}>
            Enter this code in the host app (Venue &amp; roster, &quot;Public TVs&quot;) so this screen joins your event.
          </p>
        </section>

        <section className="flex min-h-0 flex-[1.15] items-center justify-center px-6 py-10 sm:px-12 lg:py-12">
          <div className="w-full max-w-none rounded-2xl border-[3px] border-sky-500/95 px-[clamp(1.5rem,6vw,4rem)] py-[clamp(1.25rem,5vh,3rem)] text-center shadow-[0_0_48px_rgba(56,189,248,0.38)]">
            {code.length === 4 ? (
              <span className={`inline-block select-none font-mono font-bold tracking-[0.22em] text-white ${DISPLAY_TEXT_PRIMARY}`}>
                {code}
              </span>
            ) : (
              <span className={`inline-block animate-pulse tracking-wide text-white/45 ${DISPLAY_TEXT_SECONDARY}`}>
                Connecting…
              </span>
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col justify-center border-t border-white/[0.08] px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:py-12">
          <p className={`leading-relaxed text-white/42 ${DISPLAY_TEXT_SECONDARY}`}>
            For a fixed bookmark (no pairing), load
          </p>
          <code
            className={`mt-3 inline-block rounded-lg bg-white/10 px-4 py-3 font-mono text-sky-200/90 ${DISPLAY_TEXT_SECONDARY}`}
          >
            /display?room=VENUE
          </code>
        </section>
      </div>
    </div>
  )
}
