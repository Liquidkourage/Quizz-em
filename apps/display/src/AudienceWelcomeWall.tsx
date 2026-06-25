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
import { WELCOME_WALL_ASSETS } from './welcomeWallAssets'

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

/** Shared outer shell — mockup dark glass + thin gold edge. */
const WELCOME_PANEL_SHELL =
  'box-border flex min-h-0 min-w-0 w-full flex-col overflow-visible rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] border border-amber-400/58 bg-[#060608]/90 shadow-[inset_0_1px_0_rgba(253,246,178,0.14),inset_0_0_72px_rgba(0,0,0,0.55),0_0_48px_-6px_rgba(234,179,8,0.38)] backdrop-blur-[1px]'

/** Recessed LED readout — room code and player count share this well. */
const WELCOME_LED_WELL =
  'welcome-led-well isolate rounded-[clamp(8px,_1.25vmin,_12px)] border border-amber-400/78 bg-[#050403] px-[clamp(14px,_1.85vmin,_24px)] py-[clamp(10px,_1.35vmin,_16px)] shadow-[inset_0_3px_14px_rgba(0,0,0,0.94),inset_0_-1px_0_rgba(251,211,141,0.1),0_0_24px_rgba(234,179,8,0.28)]'

const WELCOME_PANEL_INNER =
  'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[inherit]'

const WELCOME_PANEL_SHELL_QR =
  `${WELCOME_PANEL_SHELL} h-full max-h-full flex-1 px-[clamp(6px,min(1.15vmin,_12px),_14px)] py-[clamp(6px,min(1.55vmin,_16px),_18px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:px-[clamp(6px,min(1.05vmin,_11px),_13px)] [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)_and_(max-width:1279px)]:py-[clamp(6px,min(1.35vmin,_14px),_16px)]`

const WELCOME_PANEL_SHELL_MID =
  `${WELCOME_PANEL_SHELL} h-full min-h-0 flex-1 px-[clamp(6px,min(1.15vmin,_12px),_14px)] py-[clamp(6px,min(1.05vmin,_11px),_12px)] lg:h-full lg:min-h-0 lg:flex-1`

function WelcomeSectionTitle({ ribbonClass, children }: { ribbonClass: string; children: ReactNode }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-y-[clamp(3px,min(0.55vmin,_6px),_8px)]">
      <span className={ribbonClass}>{children}</span>
      <div aria-hidden className="welcome-section-rule" />
    </div>
  )
}

function WelcomeLedDisplay({
  value,
  glyphClass,
  reducedMotion,
  pulse,
}: {
  value: string
  glyphClass: string
  reducedMotion: boolean
  pulse?: boolean
}) {
  return (
    <motion.div
      className={WELCOME_LED_WELL}
      animate={
        pulse && !reducedMotion
          ? {
              boxShadow: [
                'inset 0 3px 14px rgba(0,0,0,0.94), inset 0 -1px 0 rgba(251,211,141,0.1), 0 0 22px rgba(234,179,8,0.28)',
                'inset 0 3px 14px rgba(0,0,0,0.94), inset 0 -1px 0 rgba(251,211,141,0.14), 0 0 34px rgba(234,179,8,0.42)',
                'inset 0 3px 14px rgba(0,0,0,0.94), inset 0 -1px 0 rgba(251,211,141,0.1), 0 0 22px rgba(234,179,8,0.28)',
              ],
            }
          : undefined
      }
      transition={{ duration: 2.85, repeat: pulse ? Infinity : 0, ease: 'easeInOut' }}
    >
      <div className={`${glyphClass} welcome-led-glyphs`}>{value}</div>
    </motion.div>
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

/** Ornate gold corner brackets — PNG art (transparent), overlaid on panel corners. */
function WelcomePanelCornerBrackets() {
  const size = 'clamp(2.35rem, min(13cqw, 10cqh), 5.25rem)'
  const corners: { className: string; transform?: string }[] = [
    { className: '-left-[0.08rem] -top-[0.08rem]' },
    { className: '-right-[0.08rem] -top-[0.08rem]', transform: 'scaleX(-1)' },
    { className: '-left-[0.08rem] -bottom-[0.08rem]', transform: 'scaleY(-1)' },
    { className: '-right-[0.08rem] -bottom-[0.08rem]', transform: 'scaleX(-1) scaleY(-1)' },
  ]

  return (
    <>
      {corners.map(({ className, transform }) => (
        <img
          key={className}
          src={WELCOME_WALL_ASSETS.bracketCorner}
          alt=""
          aria-hidden
          className={`welcome-bracket-corner pointer-events-none absolute z-[9] h-auto max-w-[46%] select-none ${className}`}
          style={{ width: size, transform }}
          decoding="async"
          draggable={false}
        />
      ))}
    </>
  )
}

/** Full-viewport background plate (felt + floor baked in). */
function WelcomeWallBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050806]">
      <img
        src={WELCOME_WALL_ASSETS.backgroundPlate}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        decoding="async"
        draggable={false}
      />
    </div>
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
  const innerFlex =
    innerFlexClassName ??
    'relative z-[5] flex h-full min-h-0 min-w-0 flex-col'
  return (
    <div className={`@container/size relative isolate overflow-visible rounded-[inherit] ${className}`}>
      {showCorners ? <WelcomePanelCornerBrackets /> : null}
      <div className={WELCOME_PANEL_INNER}>
        {animateShimmer ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] opacity-[0.035] motion-reduce:opacity-[0.02]"
            style={{
              background:
                'radial-gradient(circle at 72% 10%, rgba(253,244,202,0.45) 0%, transparent 38%), radial-gradient(circle at 18% 92%, rgba(52,211,153,0.35) 0%, transparent 44%)',
            }}
          />
        ) : null}
        <div className={innerFlex}>{children}</div>
      </div>
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
    'box-border grid min-h-[120px] min-w-0 w-max max-w-full place-items-center overflow-hidden rounded-2xl border-2 border-amber-200/95 bg-white px-[clamp(1px,min(0.22vmin,_2px),_3px)] py-[clamp(1px,min(0.38vmin,_3px),_4px)] shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_0_48px_rgba(234,179,8,0.35),0_20px_64px_-16px_rgba(234,179,8,0.48)] ring-2 ring-amber-400/22 max-[height:880px]:shadow-[inset_0_0_0_2px_rgba(254,249,231,1),0_0_40px_rgba(234,179,8,0.32),0_16px_56px_-14px_rgba(234,179,8,0.42)] mx-auto'

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
  /** Strip | under join legacy | stacked inside middle band | footer inside join panel */
  layout: 'strip' | 'underJoin' | 'middle' | 'inPanel'
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

  const inPanelWrapClass = 'relative z-[5] w-full min-h-0 shrink-0'

  const tileShared =
    `${statTile1080} min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(8px,min(1.35vmin,_14px),_14px)] py-[clamp(8px,min(1.25vmin,_14px),_16px)] text-center backdrop-blur-sm border-amber-300/95 bg-gradient-to-br from-[#1a1208]/78 via-black/72 to-[#0a0614]/82 shadow-[inset_0_1px_0_rgba(254,249,231,0.2),inset_0_-20px_44px_-28px_rgba(124,58,237,0.16),0_0_48px_-4px_rgba(234,179,8,0.48),0_0_72px_-8px_rgba(52,211,153,0.12)] ring-2 ring-amber-500/70 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:shadow-[inset_0_1px_0_rgba(254,249,231,0.16),inset_0_-14px_36px_-22px_rgba(124,58,237,0.12),0_0_36px_-6px_rgba(234,179,8,0.38),0_0_54px_-10px_rgba(52,211,153,0.1)]`

  const stripTileClass = `${tileShared} w-full max-w-[min(100%,clamp(260px,38vw,440px))]`
  const underJoinTileClass = `${tileShared} w-full`
  const gridMiddleTileClass = `${tileShared} flex w-full min-h-0 flex-col justify-center`
  const inPanelTileClass =
    'flex w-full min-h-0 flex-col items-center justify-center border-t border-amber-500/38 px-[clamp(10px,min(1.5vmin,_18px),_22px)] pb-[clamp(8px,min(1.15vmin,_14px),_16px)] pt-[clamp(10px,min(1.35vmin,_16px),_18px)]'

  function wrapTileFor(layout: AttendanceSectionProps['layout']) {
    if (layout === 'strip') return { wrap: stripWrapClass, tile: stripTileClass }
    if (layout === 'underJoin') return { wrap: underJoinWrapClass, tile: underJoinTileClass }
    if (layout === 'inPanel') return { wrap: inPanelWrapClass, tile: inPanelTileClass }
    return { wrap: gridMiddleWrapClass, tile: gridMiddleTileClass }
  }

  const { wrap: wrapClass, tile: tileClass } = wrapTileFor(layout)

  const labelClass =
    layout === 'inPanel'
      ? `min-w-0 font-black uppercase tracking-[0.14em] text-amber-50/88 ${DISPLAY_TEXT_WELCOME_DENSE_CQ} mb-[clamp(3px,min(0.55vmin,_5px),_6px)]`
      : playerCountLabelClass

  const digitWrapClass = layout === 'inPanel' ? WELCOME_LED_WELL : undefined

  return (
    <section
      aria-label="Players"
      className={`${wrapClass}${className ? ` ${className}` : ''}`}
    >
      <div className={tileClass}>
        <div className={labelClass}>Players</div>
        {layout === 'inPanel' ? (
          <motion.div
            animate={
              !reducedMotion && justJoined
                ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)'] }
                : undefined
            }
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <WelcomeLedDisplay
              value={display}
              glyphClass={statDigitBase}
              reducedMotion={reducedMotion}
            />
          </motion.div>
        ) : (
          <motion.div
            className={`${statDigitBase} welcome-led-glyphs tabular-nums${digitWrapClass ? ` ${digitWrapClass}` : ''}`}
            animate={
              !reducedMotion && justJoined
                ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)'] }
                : undefined
            }
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            {display}
          </motion.div>
        )}
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
  syncingCounts,
  enrolled,
  playerCountLabelClass,
  statDigitBase,
}: {
  className: string
  venueCode: string
  joinUrl: string
  joinUrlText: string
  venueMono: string
  joinRibbonClass: string
  reducedMotion: boolean
  syncingCounts: boolean
  enrolled: number | null
  playerCountLabelClass: string
  statDigitBase: string
}) {
  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full w-full flex-1 flex-col items-stretch justify-between overflow-hidden'

  const ribbonClass = `${joinRibbonClass} w-full block text-center leading-[1.08] px-[clamp(10px,min(2vmin,_22px),_28px)] pb-[clamp(6px,min(1vmin,_12px),_14px)] pt-[clamp(2px,min(0.35vmin,_4px),_6px)] [text-wrap:balance]`

  const roomCodeLabelClass =
    `min-w-0 font-black uppercase tracking-[0.14em] text-amber-50/88 ${DISPLAY_TEXT_WELCOME_DENSE_CQ}`

  const urlChipClass =
    'flex w-full min-w-0 flex-col items-center justify-center gap-y-[clamp(4px,min(0.65vmin,_6px),_8px)] rounded-[clamp(8px,min(1.2vmin,_12px),_14px)] border border-white/30 bg-black/52 px-[clamp(10px,min(1.45vmin,_18px),_22px)] py-[clamp(8px,min(1.15vmin,_12px),_14px)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'

  return (
    <section aria-label="Join manually" className={className}>
      <VegasAttentionPanel
        showCorners
        animateShimmer={false}
        innerFlexClassName={panelInnerFlex}
        className={WELCOME_PANEL_SHELL_MID}
      >
        <WelcomeSectionTitle ribbonClass={ribbonClass}>Join manually</WelcomeSectionTitle>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-y-[clamp(8px,min(1.15vmin,_14px),_16px)] px-[clamp(10px,min(1.5vmin,_18px),_22px)] py-[clamp(6px,min(1vmin,_12px),_14px)]">
          <div className={urlChipClass}>
            <WelcomeGlobeIcon />
            <p
              className={`${joinUrlText} mx-auto w-full max-w-full min-w-0 text-amber-50/96 lg:whitespace-nowrap lg:text-[clamp(0.82rem,min(1.85vmin,2.8cqw),1.35rem)] [text-shadow:0_0_12px_rgba(251,191,36,0.22),0_1px_0_rgba(0,0,0,0.9)]`}
              aria-label={joinUrl}
            >
              {joinUrlForDisplay(joinUrl)}
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col items-center gap-y-[clamp(6px,min(1vmin,_12px),_14px)] border-t border-amber-500/35 pt-[clamp(8px,min(1.15vmin,_14px),_16px)]">
            <p className={`${roomCodeLabelClass} text-center`}>Room code</p>
            <WelcomeLedDisplay
              value={venueCode}
              glyphClass={venueMono}
              reducedMotion={reducedMotion}
              pulse
            />
          </div>
        </div>

        <AttendanceSection
          layout="inPanel"
          syncingCounts={syncingCounts}
          enrolled={enrolled}
          playerCountLabelClass={playerCountLabelClass}
          statTile1080=""
          statDigitBase={statDigitBase}
          reducedMotion={reducedMotion}
        />
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
        className={`${WELCOME_PANEL_SHELL_MID} relative z-[1] min-h-0 h-full w-full flex-1 py-[clamp(8px,min(1.45vmin,_15px),_16px)] lg:min-h-0 lg:h-full lg:flex-1`}
      >
        <WelcomeSectionTitle ribbonClass={ribbonClass}>How it works</WelcomeSectionTitle>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[clamp(4px,min(0.85vmin,_10px),_12px)] py-[clamp(2px,min(0.45vmin,_4px),_6px)]">
          <ul className="m-0 flex min-h-0 w-fit max-w-[min(100%,24rem)] list-none flex-col justify-center gap-[clamp(0.22rem,0.48vmin,0.42rem)] p-0 pl-[clamp(0.4rem,0.85vmin,0.72rem)]">
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
      <div className="welcome-wordmark-stage relative mx-auto aspect-[958/592] w-full max-w-[min(480px,calc(88vw_*_0.58),calc((100vw_-_28px)_*_0.58))] shrink-0 overflow-visible lg:w-auto lg:max-h-[min(26vh,280px)] lg:max-w-[min(520px,calc(92vw_*_0.58),calc((100vw_-_36px)_*_0.58))]">
        <div aria-hidden className="welcome-wordmark-pool-glow pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[24%]" />
        <QuizzEmWordmark layout="fill" depth="hero" />
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
    `max-w-full break-all text-center font-mono font-black leading-none tracking-[0.04em] uppercase ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`

  /** Player count uses the same LED scale as room code on the welcome wall. */
  const playerCountGlyphs =
    `tabular-nums leading-none font-black tracking-[0.04em] ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`

  /** Join card URL — goldilocks scale: capped so long hosts fit, large enough for the room. */
  const joinUrlText =
    `hyphens-none min-w-0 whitespace-normal break-words text-center font-orbitron font-bold tracking-[0.03em] text-emerald-50/96 ${DISPLAY_TEXT_WELCOME_URL_CQW} [text-shadow:0_0_18px_rgba(167,243,208,0.42),0_0_42px_rgba(52,211,153,0.28),0_1px_0_rgba(0,0,0,0.9)]`

  /** Slightly taller digits limited on short viewports; default keeps large-TV punch. */
  const statDigitBase = playerCountGlyphs

  return (
    <div
      role="main"
      aria-label="Join"
      className="relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-hidden overscroll-y-none bg-[#050806] antialiased text-white selection:bg-yellow-400/35 [--welcome-floor-h:min(22vh,226px)] lg:[--welcome-floor-h:min(22vh,226px)]"
    >
      <WelcomeWallBackdrop />

      <motion.div
        className="relative z-10 mx-auto flex min-h-0 h-full max-h-full w-full max-w-none flex-col gap-y-[clamp(2px,_0.5vmin,_7px)] max-[height:920px]:gap-y-[clamp(4px,_0.85vmin,_9px)] px-[clamp(6px,_1.2vw,_40px)] py-[clamp(2px,_0.4vh,_8px)] max-[height:920px]:py-[clamp(3px,_0.48vh,_8px)] [@media(max-height:720px)]:gap-y-1 [@media(max-height:720px)]:py-1 [@media(max-height:720px)]:px-2 lg:gap-y-[clamp(2px,_0.55vmin,_8px)] lg:px-[clamp(10px,min(2.25vw,_48px),_48px)] lg:pb-[max(8px,env(safe-area-inset-bottom))] lg:pt-[max(4px,min(0.35vh,_6px))] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-y-[clamp(1px,_0.35vmin,_4px)] max-[height:920px]:gap-y-[clamp(2px,_0.55vmin,_6px)] overflow-hidden lg:gap-y-[2px]">
          <WelcomeWallHeader reducedMotion={Boolean(reducedMotion)} taglineClass={taglineCredit} />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col w-full overflow-hidden pb-[var(--welcome-floor-h)]">
            <div
              aria-label="Join"
              className="flex min-h-0 flex-1 flex-col gap-y-[clamp(4px,min(0.85vmin,_10px),_12px)] max-[height:920px]:gap-y-[clamp(4px,min(0.95vmin,_11px),_12px)] overflow-hidden lg:grid lg:max-h-full lg:min-h-0 lg:grid-cols-3 lg:grid-rows-1 lg:gap-x-[2.5%] lg:gap-y-0 lg:items-stretch"
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
              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0 lg:flex-1">
                <WelcomeJoinCard
                  className="flex min-h-0 min-w-0 w-full flex-1 flex-col lg:h-full lg:min-h-0"
                  venueCode={venueCode}
                  joinUrl={joinUrl}
                  joinUrlText={joinUrlText}
                  venueMono={venueMono}
                  joinRibbonClass={sectionRibbon}
                  reducedMotion={Boolean(reducedMotion)}
                  syncingCounts={syncingCounts}
                  enrolled={enrolled}
                  playerCountLabelClass={playerCountLabelClass}
                  statDigitBase={statDigitBase}
                />
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
