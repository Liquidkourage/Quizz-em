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

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(2rem,8vw,6rem)] py-[clamp(2rem,6vh,4rem)]">
        <div className="w-full max-w-[min(56rem,94vw)] rounded-[1.25rem] border border-white/[0.08] bg-black/55 px-[clamp(2.5rem,6vw,5rem)] py-[clamp(3rem,7vh,5rem)] shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <p
            className={`text-center font-bold uppercase tracking-[0.28em] text-white/45 ${DISPLAY_TEXT_PAIRING_LABEL}`}
          >
            Connect display
          </p>
          <h1
            className={`mt-4 text-center font-['Orbitron',sans-serif] font-black tracking-tight text-white ${DISPLAY_TEXT_PAIRING_TITLE}`}
          >
            Quizz&apos;em TV
          </h1>
          <p
            className={`mx-auto mt-8 max-w-[min(48rem,88vw)] text-center text-white/75 ${DISPLAY_TEXT_PAIRING_BODY}`}
          >
            Enter this code in the host app (Venue &amp; roster, &quot;Public TVs&quot;) so this screen joins
            your event.
          </p>

          <div className="mt-[3rem] flex justify-center">
            <div className="min-w-[20rem] rounded-2xl border-[3px] border-sky-500/95 px-[clamp(1.8rem,3.2vw,3.5rem)] py-[clamp(0.9rem,2vh,2rem)] text-center shadow-[0_0_32px_rgba(56,189,248,0.38)]">
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

          <p className={`mt-[3rem] text-center text-white/42 ${DISPLAY_TEXT_PAIRING_BODY}`}>
            For a fixed bookmark (no pairing), load{' '}
            <code className={`rounded bg-white/10 px-[0.375rem] py-[0.125rem] font-mono text-sky-200/90 ${DISPLAY_TEXT_PAIRING_LABEL}`}>
              /display?room=VENUE
            </code>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
