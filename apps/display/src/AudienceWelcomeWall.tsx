import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { QuizzEmWordmark } from '@qhe/ui'
import type { DisplayVenueWallSnapshot } from '@qhe/net'
import {
  DISPLAY_TEXT_WELCOME_DENSE_CQ,
  DISPLAY_TEXT_WELCOME_PRIMARY_CQ,
  DISPLAY_TEXT_WELCOME_SECONDARY_CQ,
  DISPLAY_TEXT_WELCOME_TIPS_CQ,
  DISPLAY_TEXT_WELCOME_URL_CQW,
} from './displayTypography'
import { QUIZZ_EM_WELCOME_HOW_IT_WORKS_STEPS } from './venueRulesWallContent'

export type AudienceWelcomeWallProps = {
  venueCode: string
  wall: DisplayVenueWallSnapshot | null
}

function playerJoinHref(): string {
  if (typeof window === 'undefined') return '/player/'
  return `${window.location.origin}/player/`
}

/** QR only — pre-fills venue code on the player join screen. */
function playerJoinHrefForQr(venueCode: string): string {
  const base = playerJoinHref()
  const code = venueCode.trim().toUpperCase()
  if (!code) return base
  return `${base}?room=${encodeURIComponent(code)}`
}

/** Shown on the join card only; QR uses {@link playerJoinHrefForQr} with room pre-filled.
 *  Inserts zero-width spaces after slashes so the line can wrap cleanly at path segments. */
function joinUrlForDisplay(url: string): string {
  const hostAndPath = url.replace(/^https:\/\//i, '').replace(/^http:\/\//i, '')
  return hostAndPath.replace(/\//g, '/\u200b')
}

/** Request a larger QR raster for sharp scaling. `margin` is module quiet zone in the PNG only (not the black pattern). */
function qrImgSrc(joinUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=3&data=${encodeURIComponent(joinUrl)}`
}

/** Shared outer shell — all three welcome columns use the same plaque depth. */
const WELCOME_PANEL_SHELL =
  'box-border flex min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border-[3px] border-amber-400/74 bg-gradient-to-b from-[#140818]/94 via-black/80 to-[#041510]/92 shadow-[inset_0_1px_0_rgba(253,246,178,0.26),inset_0_-32px_64px_-34px_rgba(124,58,237,0.22),inset_0_0_52px_-22px_rgba(234,179,8,0.1),0_0_88px_-6px_rgba(34,197,94,0.2),0_0_112px_-10px_rgba(234,179,8,0.22)] ring-2 ring-amber-600/48 backdrop-blur-[3px]'

const WELCOME_PANEL_SHELL_QR =
  `${WELCOME_PANEL_SHELL} h-full max-h-full flex-1 px-[clamp(6px,min(1.15vmin,_12px),_14px)] py-[clamp(6px,min(1.55vmin,_16px),_18px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:px-[clamp(6px,min(1.05vmin,_11px),_13px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:py-[clamp(6px,min(1.35vmin,_14px),_16px)]`

const WELCOME_PANEL_SHELL_MID =
  `${WELCOME_PANEL_SHELL} h-full min-h-0 flex-1 px-[clamp(6px,min(1.15vmin,_12px),_14px)] py-[clamp(6px,min(1.05vmin,_11px),_12px)] lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden`

function WelcomeSectionTitle({ ribbonClass, children }: { ribbonClass: string; children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-y-[clamp(3px,min(0.55vmin,_6px),_8px)]">
      <span className={ribbonClass}>{children}</span>
      <div
        aria-hidden
        className="h-[clamp(2px,min(0.32vmin,_3px),_3px)] w-[clamp(2.75rem,min(38%,6.5rem),_7rem)] rounded-full bg-gradient-to-r from-transparent via-amber-200/95 to-transparent shadow-[0_0_14px_rgba(251,191,36,0.65),0_0_28px_rgba(234,179,8,0.28)]"
      />
    </div>
  )
}

function WelcomeGlobeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[clamp(0.95rem,min(2.1vmin,_1.35rem),_1.35rem)] w-[clamp(0.95rem,min(2.1vmin,_1.35rem),_1.35rem)] shrink-0 text-emerald-300/90 drop-shadow-[0_0_8px_rgba(52,211,153,0.55)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 6 3.8 9s-1.3 6.2-3.8 9M12 3c-2.5 2.8-3.8 6-3.8 9s1.3 6.2 3.8 9" />
    </svg>
  )
}

/** Gold rail strokes at corners — long “┌” segments, not bordered squares (avoids checkbox look). */
function VegasCornerBrackets() {
  const inset = 'clamp(12px, 2vmin, 20px)'
  const arm = 'clamp(3.85rem, min(34vw, 26vh), 8.25rem)'
  const thickness = 'clamp(4px, 0.65vmin, 7px)'
  const common =
    'pointer-events-none absolute z-[2] rounded-full shadow-[0_0_24px_rgba(251,211,141,0.68),0_0_52px_rgba(234,179,8,0.28),0_0_80px_rgba(251,191,36,0.12)]'

  return (
    <>
      <span
        className={`${common} bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, left: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, left: inset, width: thickness, height: arm }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, right: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ top: inset, right: inset, width: thickness, height: arm }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, left: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-t from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, left: inset, width: thickness, height: arm }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-l from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, right: inset, width: arm, height: thickness }}
        aria-hidden
      />
      <span
        className={`${common} bg-gradient-to-t from-amber-200 via-yellow-300 to-amber-700/95`}
        style={{ bottom: inset, right: inset, width: thickness, height: arm }}
        aria-hidden
      />
    </>
  )
}

/** Swept marquee light along the divider under the title. */
function VegasPulseDivider({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="relative mt-0 max-[height:900px]:mt-px h-[clamp(3px,_0.52vmin,_6px)] max-[height:900px]:h-[clamp(3px,_0.48vmin,_5px)] w-full max-w-none shrink-0 overflow-hidden rounded-full border border-amber-400/55 bg-black/75 shadow-[0_0_28px_rgba(251,191,36,0.28),inset_0_1px_0_rgba(255,255,255,0.1)]"
    >
      <div
        className="absolute inset-0 opacity-95"
        style={{
          background:
            'linear-gradient(90deg,rgba(239,68,68,0.22)_0%,rgba(251,211,141,0.55)_43%,rgba(52,211,153,0.26)_73%,rgba(124,58,237,0.18)_100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/22 to-transparent" />
      {active && (
        <motion.div
          className="absolute inset-y-[-40%] w-[42%]"
          initial={false}
          style={{
            background:
              'linear-gradient(70deg,rgba(255,255,255,0)_0%,rgba(255,253,240,0.92)_52%,rgba(255,255,255,0)_100%)',
            filter: 'blur(6px)',
            opacity: 0.92,
          }}
          animate={{ x: ['-100%', '320%'] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'linear',
            repeatDelay: 0.15,
          }}
        />
      )}
    </div>
  )
}

function VegasAttentionPanel({
  showCorners,
  animateShimmer,
  className,
  innerFlexClassName,
  children,
}: {
  showCorners: boolean
  animateShimmer: boolean
  className: string
  /** Overrides default inner flex wrapper (defaults to column flex + h-full). */
  innerFlexClassName?: string
  children: ReactNode
}) {
  const overlayBase =
    'pointer-events-none absolute inset-0 z-[1] rounded-[inherit] motion-reduce:transition-none motion-reduce:animate-none motion-reduce:opacity-[0.05]'
  const overlayLive =
    'animate-vegas-shimmer-cards mix-blend-soft-light opacity-[0.06] md:opacity-[0.098]'
  const innerFlex =
    innerFlexClassName ??
    'relative z-[5] flex h-full min-h-0 min-w-0 flex-col'
  return (
    <div className={`@container/size relative isolate overflow-hidden rounded-[inherit] ${className}`}>
      {showCorners ? <VegasCornerBrackets /> : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[3px] z-[1] rounded-[inherit] border border-amber-100/14 shadow-[inset_0_0_28px_rgba(251,191,36,0.07),inset_0_1px_0_rgba(253,246,178,0.12)]"
      />
      {animateShimmer ? (
        <div
          aria-hidden
          className={`${overlayBase} ${overlayLive}`}
          style={{
            background:
              'radial-gradient(circle_at_72%_10%,rgba(253,244,202,0.65)_0%,transparent_36%), radial-gradient(circle_at_18%_92%,rgba(52,211,153,0.55)_0%,transparent_42%), radial-gradient(circle_at_50%_50%,rgba(192,132,252,0.45)_0%,transparent_58%)',
          }}
        />
      ) : (
        <div
          aria-hidden
          className={`${overlayBase} opacity-[0.045] md:opacity-[0.06]`}
          style={{
            background:
              'radial-gradient(circle at 72% 10%,rgba(253,244,202,0.5)_0%,transparent 38%), radial-gradient(circle at 18% 92%,rgba(52,211,153,0.4)_0%,transparent 44%)',
          }}
        />
      )}
      <div className={innerFlex}>{children}</div>
    </div>
  )
}

/** Scan-to-join column — narrow viewports stack full-width; `lg` fits the left ~30% band of the wall row (see parent grid). */
function WelcomeQrColumn({
  sectionRibbon,
  qrJoinUrl,
  qrOk,
  setQrOk,
  reducedMotion,
}: {
  sectionRibbon: string
  qrJoinUrl: string
  qrOk: boolean
  setQrOk: (ok: boolean) => void
  reducedMotion: boolean
}) {
  const sectionClass =
    'relative flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col items-center overflow-hidden justify-self-center lg:h-full lg:max-h-full lg:flex-1 lg:justify-start'

  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full flex-1 flex-col justify-between gap-y-[clamp(4px,min(0.85vmin,_10px),_14px)] items-stretch overflow-hidden'

  const aimClass =
    `${sectionRibbon} w-full block text-center leading-[1.08] pb-0 px-[clamp(10px,min(2vmin,_22px),_28px)] [text-wrap:balance] lg:mb-0 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:relative [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:z-[46]`

  const midClass =
    'relative flex min-h-0 max-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden min-w-0 px-[clamp(2px,min(0.42vmin,_4px),_5px)] lg:px-[clamp(5px,min(1.1vmin,_8px),_10px)] lg:py-[clamp(2px,min(0.48vmin,_4px),_6px)]'

  const whiteTileBase =
    'box-border grid min-h-[120px] min-w-0 w-max max-w-full place-items-center overflow-hidden rounded-2xl border-[3px] border-amber-200/98 bg-white px-[clamp(1px,min(0.22vmin,_2px),_3px)] py-[clamp(1px,min(0.38vmin,_3px),_4px)] shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_0_72px_rgba(234,179,8,0.42),0_28px_96px_-16px_rgba(234,179,8,0.62),0_0_88px_rgba(255,255,255,0.1)] ring-[3px] ring-amber-400/30 max-[height:880px]:shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_0_56px_rgba(234,179,8,0.38),0_20px_72px_-14px_rgba(234,179,8,0.5),0_0_64px_rgba(255,255,255,0.08)] mx-auto'

  const whiteClass =
    `${whiteTileBase} aspect-square max-h-full w-auto max-w-[min(100%,min(76vw,min(48dvh,480px)))] shrink-0 max-[height:880px]:max-w-[min(100%,min(74vw,min(44dvh,420px)))] lg:mx-auto lg:aspect-square lg:h-auto lg:max-h-[min(100%,38dvh)] lg:w-full lg:max-w-[94%] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:max-h-[min(29vmin,29dvh,290px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:max-w-[min(29vmin,29dvh,290px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!py-[2px] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:!px-[2px] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:shadow-[0_8px_48px_-6px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(254,249,231,1),0_0_40px_rgba(234,179,8,0.35)]`

  return (
    <section aria-label="Scan to join" className={sectionClass}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        innerFlexClassName={panelInnerFlex}
        className={WELCOME_PANEL_SHELL_QR}
      >
        <WelcomeSectionTitle ribbonClass={aimClass}>Scan to join</WelcomeSectionTitle>
        {qrOk ? (
          <div className={midClass}>
            <div className={whiteClass}>
              <img
                src={qrImgSrc(qrJoinUrl)}
                alt=""
                width={640}
                height={640}
                className="block h-auto max-h-[min(93%,42dvh)] w-full max-w-full min-h-0 min-w-0 rounded-sm object-contain object-center leading-none lg:max-h-[min(92%,42dvh)]"
                referrerPolicy="no-referrer"
                onError={() => setQrOk(false)}
              />
            </div>
          </div>
        ) : (
          <div className={`flex min-h-0 flex-1 items-center rounded-xl border-2 border-dashed border-white/35 bg-white/[0.04] px-4 py-6 text-center font-semibold leading-snug text-amber-200 ${DISPLAY_TEXT_WELCOME_SECONDARY_CQ}`}>
            QR unavailable
          </div>
        )}
      </VegasAttentionPanel>
    </section>
  )
}

/**
 * Venue join wall: header, then three equal bands on `lg+` — QR, join & players, how it works.
 */
type AttendanceSectionProps = {
  syncingCounts: boolean
  /** Total human players in the venue (lobby + seated). */
  enrolled: number | null
  playerCountLabelClass: string
  statTile1080: string
  statDigitBase: string
  reducedMotion: boolean
  /** Strip | under join legacy | stacked inside middle band with join card */
  layout: 'strip' | 'underJoin' | 'middle'
  className?: string
}

function AttendanceSection({
  syncingCounts,
  enrolled,
  playerCountLabelClass,
  statTile1080,
  statDigitBase,
  reducedMotion,
  layout,
  className,
}: AttendanceSectionProps) {
  const display = syncingCounts ? '—' : String(enrolled ?? 0)
  const prevEnrolledRef = useRef<number | null>(null)
  const [justJoined, setJustJoined] = useState(false)

  useEffect(() => {
    if (syncingCounts || enrolled == null) {
      prevEnrolledRef.current = enrolled
      return
    }
    if (prevEnrolledRef.current != null && enrolled > prevEnrolledRef.current) {
      setJustJoined(true)
      const id = window.setTimeout(() => setJustJoined(false), 750)
      prevEnrolledRef.current = enrolled
      return () => window.clearTimeout(id)
    }
    prevEnrolledRef.current = enrolled
  }, [enrolled, syncingCounts])

  const stripWrapClass =
    'relative z-[18] flex w-full min-h-0 shrink-0 justify-center [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:px-[clamp(12px,min(2.4vw,_48px),_56px)]'

  const underJoinWrapClass =
    'relative z-[18] isolate w-full max-w-[min(100%,38rem)] mx-auto min-h-0 shrink-0'

  const gridMiddleWrapClass = 'relative z-[18] isolate w-full min-h-0 shrink-0 mx-auto max-w-none'

  const tileShared =
    `${statTile1080} min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(8px,min(1.35vmin,_14px),_14px)] py-[clamp(8px,min(1.25vmin,_14px),_16px)] text-center backdrop-blur-sm border-amber-300/95 bg-gradient-to-br from-[#1a1208]/78 via-black/72 to-[#0a0614]/82 shadow-[inset_0_1px_0_rgba(254,249,231,0.2),inset_0_-20px_44px_-28px_rgba(124,58,237,0.16),0_0_48px_-4px_rgba(234,179,8,0.48),0_0_72px_-8px_rgba(52,211,153,0.12)] ring-2 ring-amber-500/70 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:shadow-[inset_0_1px_0_rgba(254,249,231,0.16),inset_0_-14px_36px_-22px_rgba(124,58,237,0.12),0_0_36px_-6px_rgba(234,179,8,0.38),0_0_54px_-10px_rgba(52,211,153,0.1)]`

  const stripTileClass = `${tileShared} w-full max-w-[min(100%,clamp(260px,38vw,440px))]`
  const underJoinTileClass = `${tileShared} w-full`
  const gridMiddleTileClass = `${tileShared} flex w-full min-h-0 flex-col justify-center`

  function wrapTileFor(layout: AttendanceSectionProps['layout']) {
    if (layout === 'strip') return { wrap: stripWrapClass, tile: stripTileClass }
    if (layout === 'underJoin') return { wrap: underJoinWrapClass, tile: underJoinTileClass }
    return { wrap: gridMiddleWrapClass, tile: gridMiddleTileClass }
  }

  const { wrap: wrapClass, tile: tileClass } = wrapTileFor(layout)

  return (
    <section
      aria-label="Players"
      className={`${wrapClass}${className ? ` ${className}` : ''}`}
    >
      <div className={tileClass}>
        <div className={playerCountLabelClass}>Players</div>
        <motion.div
          className={`${statDigitBase} welcome-led-glyphs tabular-nums`}
          animate={
            !reducedMotion && justJoined
              ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)'] }
              : undefined
          }
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {display}
        </motion.div>
      </div>
    </section>
  )
}

function WelcomeJoinCard({
  className,
  venueCode,
  joinUrl,
  joinUrlText,
  venueMono,
  joinRibbonClass,
  reducedMotion,
}: {
  className: string
  venueCode: string
  joinUrl: string
  joinUrlText: string
  venueMono: string
  joinRibbonClass: string
  reducedMotion: boolean
}) {
  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full w-full flex-1 flex-col items-stretch overflow-hidden'

  const ribbonClass = `${joinRibbonClass} w-full block text-center leading-[1.08] px-[clamp(10px,min(2vmin,_22px),_28px)] pb-[clamp(6px,min(1vmin,_12px),_14px)] pt-[clamp(2px,min(0.35vmin,_4px),_6px)] [text-wrap:balance]`

  const roomCodeLabelClass =
    `min-w-0 font-black uppercase tracking-[0.14em] text-amber-50/88 ${DISPLAY_TEXT_WELCOME_DENSE_CQ}`

  const insetPanelClass =
    'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[clamp(8px,min(1.35vmin,_16px),_18px)] border-2 border-amber-500/52 bg-gradient-to-b from-black/84 to-[#07050a]/90 shadow-[inset_0_2px_0_rgba(251,211,141,0.12),inset_0_0_36px_rgba(0,0,0,0.48)]'

  const urlChipClass =
    'flex w-full min-w-0 items-center justify-center gap-x-[clamp(6px,min(1vmin,_10px),_12px)] rounded-[clamp(8px,min(1.2vmin,_12px),_14px)] border-2 border-emerald-400/58 bg-black/62 px-[clamp(10px,min(1.45vmin,_18px),_22px)] py-[clamp(8px,min(1.15vmin,_12px),_14px)] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2),0_0_36px_-8px_rgba(16,185,129,0.38)]'

  return (
    <section aria-label="Join manually" className={className}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={false}
        innerFlexClassName={panelInnerFlex}
        className={WELCOME_PANEL_SHELL_MID}
      >
        <div className={insetPanelClass}>
          <WelcomeSectionTitle ribbonClass={ribbonClass}>Join manually</WelcomeSectionTitle>

          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-y-[clamp(10px,min(1.35vmin,_16px),_20px)] px-[clamp(10px,min(1.5vmin,_18px),_22px)] py-[clamp(10px,min(1.35vmin,_16px),_20px)]">
            <div className={urlChipClass}>
              <WelcomeGlobeIcon />
              <p
                className={`${joinUrlText} mx-auto w-full max-w-full min-w-0`}
                aria-label={joinUrl}
              >
                {joinUrlForDisplay(joinUrl)}
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-col items-center gap-y-[clamp(6px,min(1vmin,_12px),_14px)] border-t border-amber-500/35 pt-[clamp(10px,min(1.25vmin,_15px),_18px)]">
              <p className={`${roomCodeLabelClass} text-center`}>Room code</p>
              <motion.div
                className="isolate inline-block w-max max-w-full rounded-[clamp(8px,_1.25vmin,_12px)] border-2 border-amber-400/82 bg-[#050403] px-[clamp(12px,_1.65vmin,_20px)] py-[clamp(8px,_1.2vmin,_14px)] shadow-[inset_0_3px_14px_rgba(0,0,0,0.94),inset_0_-1px_0_rgba(251,211,141,0.1),0_0_28px_rgba(234,179,8,0.32)]"
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        boxShadow: [
                          'inset 0 3px 14px rgba(0,0,0,0.94), inset 0 -1px 0 rgba(251,211,141,0.1), 0 0 22px rgba(234,179,8,0.28)',
                          'inset 0 3px 14px rgba(0,0,0,0.94), inset 0 -1px 0 rgba(251,211,141,0.14), 0 0 36px rgba(234,179,8,0.48)',
                          'inset 0 3px 14px rgba(0,0,0,0.94), inset 0 -1px 0 rgba(251,211,141,0.1), 0 0 22px rgba(234,179,8,0.28)',
                        ],
                      }
                }
                transition={{ duration: 2.85, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className={`${venueMono} welcome-led-glyphs`}>{venueCode}</div>
              </motion.div>
            </div>
          </div>
        </div>
      </VegasAttentionPanel>
    </section>
  )
}

function WelcomeHowItWorksPanel({
  sectionRibbon,
  reducedMotion,
}: {
  sectionRibbon: string
  reducedMotion: boolean
}) {
  const bulletClass =
    `text-pretty font-semibold text-amber-50/96 [text-shadow:0_2px_14px_rgba(0,0,0,_0.82)] ${DISPLAY_TEXT_WELCOME_TIPS_CQ}`

  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full w-full flex-1 flex-col justify-between gap-y-[clamp(6px,min(1.1vmin,_12px),_14px)] items-stretch overflow-hidden'

  const ribbonClass = `${sectionRibbon} w-full block text-center leading-[1.08] px-[clamp(10px,min(2vmin,_22px),_28px)] [text-wrap:balance]`

  return (
    <section aria-label="How it works" className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col">
      <VegasAttentionPanel
        showCorners
        animateShimmer={!reducedMotion}
        innerFlexClassName={panelInnerFlex}
        className={`${WELCOME_PANEL_SHELL_MID} min-h-0 h-full w-full flex-1 py-[clamp(8px,min(1.45vmin,_15px),_16px)] lg:min-h-0 lg:h-full lg:flex-1`}
      >
        <WelcomeSectionTitle ribbonClass={ribbonClass}>How it works</WelcomeSectionTitle>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly px-[clamp(4px,min(0.85vmin,_10px),_12px)]">
          <ul className="m-0 flex min-h-0 w-fit max-w-[min(100%,24rem)] list-none flex-col justify-evenly gap-[clamp(0.35rem,0.75vmin,0.65rem)] p-0 pl-[clamp(0.45rem,1vmin,0.8rem)]">
            {QUIZZ_EM_WELCOME_HOW_IT_WORKS_STEPS.map((step) => (
              <li key={step} className="flex gap-[clamp(0.4rem,0.75vmin,0.65rem)] text-left">
                <span className="welcome-gold-bullet" aria-hidden />
                <span className={`${bulletClass} block`}>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </VegasAttentionPanel>
    </section>
  )
}

function WelcomeWallHeader({
  reducedMotion,
  taglineClass,
}: {
  reducedMotion: boolean
  taglineClass: string
}) {
  return (
    <header className="@container/size flex w-full max-w-full min-w-0 shrink-0 flex-col items-stretch px-0 sm:px-[clamp(2px,_0.45vw,_10px)]">
      <div className="relative mx-auto aspect-[958/592] w-full max-w-[min(552px,calc(92vw_*_0.6),calc((100vw_-_28px)_*_0.6))] shrink-0 overflow-visible lg:w-auto lg:max-h-[min(33.6vh,432px)] lg:max-w-[min(576px,calc(96vw_*_0.6),calc((100vw_-_36px)_*_0.6))]">
        <QuizzEmWordmark layout="fill" />
      </div>
      <p className={`${taglineClass} sr-only`}>By Liquid Kourage Entertainment</p>
      <VegasPulseDivider active={!reducedMotion} />
    </header>
  )
}

export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const qrJoinUrl = playerJoinHrefForQr(venueCode)
  const syncingCounts = wall == null
  const enrolled = syncingCounts ? null : (wall.lobbyPlayerCount ?? 0) + (wall.totalSeatedAtTables ?? 0)
  const [qrOk, setQrOk] = useState(true)
  const reducedMotion = useReducedMotion()

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences.
   *  Prefer vw over vmin for headline sizes so zooming the browser scales more predictably
   *  (vmin balloons when the window is tall and crowded the vertical rhythm). */
  /** `min-w-0` + wrapping so wide tracking / long words cannot blow past grid tracks */
  const sectionRibbon =
    `min-w-0 font-black uppercase tracking-[0.18em] text-amber-50/98 break-words text-balance whitespace-normal ${DISPLAY_TEXT_WELCOME_SECONDARY_CQ} [text-shadow:0_0_36px_rgba(251,191,36,0.52),0_0_80px_rgba(239,68,68,0.16),0_2px_4px_rgba(0,0,0,_0.95)]`

  /** Credit under the wordmark — readable title case, subtler than headline chrome. */
  const taglineCredit =
    `min-w-0 break-words text-balance font-semibold tracking-[0.04em] text-amber-50/92 ${DISPLAY_TEXT_WELCOME_DENSE_CQ} [text-shadow:0_0_14px_rgba(253,224,138,0.38),0_2px_8px_rgba(0,0,0,_0.88)]`

  /** “Players” label above the total count tile */
  const playerCountLabelClass =
    `min-w-0 break-words text-balance font-black tracking-[0.12em] uppercase text-emerald-50/94 ${DISPLAY_TEXT_WELCOME_SECONDARY_CQ} [text-shadow:0_0_18px_rgba(167,243,208,0.28),0_2px_8px_rgba(0,0,0,.58)] mb-[clamp(3px,min(0.55vmin,_5px),_6px)]`
  const venueMono =
    `max-w-full break-all text-center font-mono font-black leading-none tracking-[0.06em] uppercase ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`

  /** Join card URL — goldilocks scale: capped so long hosts fit, large enough for the room. */
  const joinUrlText =
    `hyphens-none min-w-0 whitespace-normal break-words text-center font-orbitron font-bold tracking-[0.03em] text-emerald-50/96 ${DISPLAY_TEXT_WELCOME_URL_CQW} [text-shadow:0_0_18px_rgba(167,243,208,0.42),0_0_42px_rgba(52,211,153,0.28),0_1px_0_rgba(0,0,0,0.9)]`

  /** Tighter attendance strip on landscape 1080p-class TVs (≥1024 wide, ≤1080 tall); skips narrow/portrait. */
  const statTile1080 =
    '[@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:rounded-[clamp(8px,min(1.25vmin,_15px),_15px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:px-[clamp(5px,min(1.05vmin,_10px),_11px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:py-[clamp(3px,min(0.95vmin,_8px),_9px)]'

  /** Slightly taller digits limited on short viewports; default keeps large-TV punch. */
  const statDigitBase =
    `py-[clamp(3px,min(0.95vmin,_8px),_8px)] tabular-nums tracking-tight leading-none font-black ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`

  return (
    <div
      role="main"
      aria-label="Join"
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-hidden overscroll-y-none bg-[#05030c] antialiased text-white selection:bg-yellow-400/35"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Base felt + velvet house lights */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/82 via-[#06483c] to-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-purple-950/52" />
        {/* Gold chandeliers — twin pools */}
        <motion.div
          className="absolute -left-[8%] -top-[28%] h-[72vmin] w-[72vmin] rounded-full blur-[72px]"
          aria-hidden
          style={{
            background: 'radial-gradient(circle,rgba(250,230,154,0.32)_0%,rgba(251,191,36,0.06)_42%,transparent_70%)',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.14, 0.26, 0.14] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -right-[12%] -top-[22%] h-[62vmin] w-[62vmin] rounded-full blur-[64px]"
          aria-hidden
          style={{
            background: 'radial-gradient(circle,rgba(251,218,146,0.26)_0%,rgba(234,179,8,0.05)_46%,transparent_72%)',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.1, 0.22, 0.1] }}
          transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
        />
        {/* Red ramp light (subtle stakes) */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            background: 'radial-gradient(ellipse 90% 60% at 50% 100%,rgba(239,68,68,0.35)_0%,transparent 55%)',
          }}
        />
        {/* Bright felt bank — emerald wash from footer */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.21]"
          style={{
            background: 'radial-gradient(ellipse 98% 78% at 50% 108%,rgba(16,185,129,0.42)_0%,transparent 60%)',
          }}
        />
        {/* Drifting “confetti sparks” */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-screen opacity-[0.035] sm:opacity-[0.052]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center,rgba(254,249,231,1)_0.55px,transparent 0.65px)',
            backgroundSize: '36px 33px',
          }}
          animate={reducedMotion ? undefined : { backgroundPosition: ['0% 0%', '100% 100%'] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        />
        {/* Air / haze sparkle */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 mix-blend-overlay ${reducedMotion ? 'bg-white/[0.03]' : 'motion-safe:animate-vegas-twinkle-field bg-white/[0.055]'}`}
        />
        {/* Cinema vignette — leave center open so felt reads */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 84% 70% at 50% 44%, transparent 44%, rgba(0, 0, 0, 0.38) 72%, rgba(0, 0, 0, 0.78) 100%)',
          }}
        />
        {/* Suit watermarks — subtle felt emboss */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[3%] top-[36%] select-none font-serif leading-none text-white/[0.034]"
          style={{ fontSize: 'clamp(7rem, 21vmin, 15rem)' }}
        >
          ♣
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute right-[4%] top-[40%] select-none font-serif leading-none text-red-200/[0.028]"
          style={{ fontSize: 'clamp(6.5rem, 19vmin, 14rem)' }}
        >
          ♦
        </div>
        {/* Felt texture AFTER vignette (otherwise grain/rail disappears) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.52] mix-blend-soft-light md:opacity-[0.62]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 40% 35%, rgba(214, 245, 225, 0.55) 1.4px, transparent 2.1px), radial-gradient(circle at 50% 50%, rgba(15, 78, 58, 0.55) 1.1px, transparent 1.75px)',
            backgroundSize: '6px 6px, 5px 5px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.72] mix-blend-soft-light md:opacity-[0.82]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              "<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='5' stitchTiles='stitch' result='n'/><feColorMatrix type='saturate' values='0' in='n'/></filter><rect width='100%' height='100%' filter='url(#f)' fill='%23042f28'/></svg>"
            )}")`,
            backgroundSize: 'min(120px, 18vmin) min(120px, 18vmin)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.62] mix-blend-overlay md:opacity-[0.72]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg,
                transparent 0px,
                transparent 24px,
                rgba(253,246,226,0.16) 25px,
                rgba(253,246,226,0.16) 27px,
                transparent 28px,
                transparent 60px),
              repeating-linear-gradient(-45deg,
                transparent 0px,
                transparent 24px,
                rgba(3, 44, 36, 0.38) 25px,
                rgba(3, 44, 36, 0.38) 27px,
                transparent 28px,
                transparent 60px),
              radial-gradient(ellipse 92% 80% at 50% 40%, rgba(224, 246, 229, 0.28) 0%, transparent 58%),
              linear-gradient(108deg, rgba(255, 255, 255, 0.2) 0%, transparent 34%, transparent 66%, rgba(0, 0, 0, 0.14) 100%)
            `,
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-[0.14] md:opacity-[0.18]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(173deg,rgba(255,255,255,0)_0px,rgba(255,255,255,0)_5px,rgba(255,255,255,.14)_6px,rgba(255,255,255,.14)_8px,rgba(255,255,255,0)_9px,rgba(255,255,255,0)_15px)',
            backgroundSize: '100% 100%',
          }}
          animate={reducedMotion ? undefined : { opacity: [0.12, 0.26, 0.13] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Wood rail + gold bounce at floor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[20vh] opacity-80"
          style={{
            background:
              'linear-gradient(to top, rgba(14,8,5,0.94) 0%, rgba(38,24,12,0.58) 32%, transparent 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[14vh] opacity-50"
          style={{
            background: 'linear-gradient(to top, rgba(251,191,36,0.14) 0%, transparent 70%)',
          }}
        />
      </div>

      <motion.div
        className="relative z-10 mx-auto flex min-h-0 h-full max-h-full w-full max-w-none flex-col gap-y-[clamp(2px,_0.5vmin,_7px)] max-[height:920px]:gap-y-[clamp(4px,_0.85vmin,_9px)] px-[clamp(6px,_1.2vw,_40px)] py-[clamp(2px,_0.4vh,_8px)] max-[height:920px]:py-[clamp(3px,_0.48vh,_8px)] [@media(max-height:720px)]:gap-y-1 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:px-2 lg:gap-y-[clamp(2px,_0.55vmin,_8px)] lg:px-[clamp(10px,min(2.25vw,_48px),_48px)] lg:pb-[max(8px,env(safe-area-inset-bottom))] lg:pt-[max(4px,min(0.35vh,_6px))] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-y-[clamp(1px,_0.35vmin,_4px)] max-[height:920px]:gap-y-[clamp(2px,_0.55vmin,_6px)] overflow-hidden lg:gap-y-[2px]">
          <WelcomeWallHeader reducedMotion={Boolean(reducedMotion)} taglineClass={taglineCredit} />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col w-full overflow-hidden pb-[clamp(2px,min(0.5vmin,_8px),_8px)] max-[height:920px]:pb-[clamp(4px,min(0.85vmin,_10px),_11px)] lg:pb-0">
            <div
              aria-label="Join"
              className="flex min-h-0 flex-1 flex-col gap-y-[clamp(4px,min(0.85vmin,_10px),_12px)] max-[height:920px]:gap-y-[clamp(4px,min(0.95vmin,_11px),_12px)] overflow-hidden lg:grid lg:grid-cols-3 lg:gap-x-[2.5%] lg:gap-y-0 lg:items-stretch"
            >
              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0 lg:max-h-full">
                <WelcomeQrColumn
                  sectionRibbon={sectionRibbon}
                  qrJoinUrl={qrJoinUrl}
                  qrOk={qrOk}
                  setQrOk={setQrOk}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
              <div className="flex min-h-0 min-w-0 flex-col justify-start gap-y-[clamp(6px,min(1vmin,_12px),_14px)] overflow-hidden lg:box-border lg:h-full lg:min-h-0 lg:flex-1 lg:gap-y-[clamp(6px,min(1vmin,_12px),_14px)]">
                <WelcomeJoinCard
                  className="flex min-h-0 min-w-0 w-full flex-col max-lg:shrink-0 lg:min-h-0 lg:flex-1"
                  venueCode={venueCode}
                  joinUrl={joinUrl}
                  joinUrlText={joinUrlText}
                  venueMono={venueMono}
                  joinRibbonClass={sectionRibbon}
                  reducedMotion={Boolean(reducedMotion)}
                />
                <div className="mt-0 w-full min-w-0 shrink-0 lg:mt-auto">
                  <AttendanceSection
                    layout="middle"
                    syncingCounts={syncingCounts}
                    enrolled={enrolled}
                    playerCountLabelClass={playerCountLabelClass}
                    statTile1080={statTile1080}
                    statDigitBase={statDigitBase}
                    reducedMotion={Boolean(reducedMotion)}
                  />
                </div>
              </div>
              <div className="flex min-h-0 min-w-0 shrink-0 flex-col max-lg:min-h-[26vh] max-lg:max-h-[38vh] lg:h-full lg:min-h-0 lg:max-h-full lg:w-full lg:flex-col">
                <WelcomeHowItWorksPanel
                  sectionRibbon={sectionRibbon}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
