import { connectDisplayAwaitingPairing } from '@qhe/net'
import { useEffect, useRef, useState } from 'react'
import {
  DISPLAY_TEXT_PAIRING_BODY,
  DISPLAY_TEXT_PAIRING_CODE,
  DISPLAY_TEXT_PAIRING_LABEL,
  DISPLAY_TEXT_PAIRING_TITLE,
} from './displayTypography'

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
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-[#070d1f]">
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

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(1rem,4vw,3rem)] py-[clamp(1rem,3vh,2rem)]">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-black/55 px-[clamp(1.25rem,3vw,2.5rem)] py-[clamp(1.5rem,3.5vh,2.5rem)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:max-w-lg">
          <p
            className={`text-center font-bold uppercase tracking-[0.28em] text-white/45 ${DISPLAY_TEXT_PAIRING_LABEL}`}
          >
            Connect display
          </p>
          <h1
            className={`mt-2 text-center font-['Orbitron',sans-serif] font-black tracking-tight text-white ${DISPLAY_TEXT_PAIRING_TITLE}`}
          >
            Quizz&apos;em TV
          </h1>
          <p
            className={`mx-auto mt-4 max-w-sm text-center text-white/75 ${DISPLAY_TEXT_PAIRING_BODY}`}
          >
            Enter this code in the host app (Venue &amp; roster, &quot;Public TVs&quot;) so this screen joins
            your event.
          </p>

          <div className="mt-6 flex justify-center sm:mt-8">
            <div className="min-w-[10rem] rounded-xl border-[3px] border-sky-500/95 px-6 py-3 text-center shadow-[0_0_32px_rgba(56,189,248,0.38)] sm:px-7 sm:py-4">
              {code.length === 4 ? (
                <span
                  className={`inline-block select-none font-mono font-bold tracking-[0.18em] text-white ${DISPLAY_TEXT_PAIRING_CODE}`}
                >
                  {code}
                </span>
              ) : (
                <span
                  className={`inline-block animate-pulse tracking-wide text-white/45 ${DISPLAY_TEXT_PAIRING_BODY}`}
                >
                  Connecting…
                </span>
              )}
            </div>
          </div>

          <p className={`mt-6 text-center text-white/42 sm:mt-8 ${DISPLAY_TEXT_PAIRING_BODY}`}>
            For a fixed bookmark (no pairing), load{' '}
            <code className={`rounded bg-white/10 px-1.5 py-0.5 font-mono text-sky-200/90 ${DISPLAY_TEXT_PAIRING_LABEL}`}>
              /display?room=VENUE
            </code>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
