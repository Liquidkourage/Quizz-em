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
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import { welcomeWallTableCount } from './venueWallModel'
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
  return `https://api.qrserver.com/v1/create-qr-code/?size=640x640&margin=4&data=${encodeURIComponent(joinUrl)}`
}

/** Panel shell — bordered surface with optional column tint. */
const WELCOME_PANEL_SURFACE_BASE =
  'welcome-panel-surface relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#060608]/94'

const WELCOME_PANEL_PAD =
  'px-[clamp(11px,min(1.22vmin,14px),14px)] pt-[clamp(12px,min(1.4vmin,18px),20px)] pb-[clamp(9px,min(1.05vmin,13px),13px)]'

/** Narrow strip below panel bottoms — room for baked floor reflection. */
const WELCOME_FLOOR_RESERVE = 'var(--welcome-floor-h, min(10vh, 108px))'

const WELCOME_PANEL_SHELL_QR =
  'welcome-panel-frame relative h-full min-h-0 w-full overflow-visible'

const WELCOME_PANEL_SHELL_MID = WELCOME_PANEL_SHELL_QR

/** Recessed LED readout — room code and player count share this well. */
const WELCOME_LED_WELL =
  'welcome-led-well welcome-led-readout-well isolate px-[clamp(11px,_1.45vmin,_18px)] py-[clamp(12px,_1.5vmin,_20px)]'

const WELCOME_PANEL_INNER =
  'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'

function WelcomeSectionTitle({
  ribbonClass,
  className,
  children,
}: {
  ribbonClass: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`welcome-section-title${className ? ` ${className}` : ''}`}>
      <span className={ribbonClass}>{children}</span>
      <div aria-hidden className="welcome-section-rule" />
    </div>
  )
}

function WelcomeLabelRule({ children }: { children: ReactNode }) {
  return (
    <div className="welcome-label-rule">
      <span className="welcome-label-rule-text">{children}</span>
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

/** Ornate gold corner brackets — bottom row reuses top positioning inside a Y-flipped wrapper. */
function WelcomePanelCornerBrackets() {
  const bracketClass = 'welcome-bracket-corner pointer-events-none absolute select-none'

  return (
    <>
      <img
        src={WELCOME_WALL_ASSETS.bracketCornerLeft}
        alt=""
        aria-hidden
        className={`${bracketClass} welcome-bracket-corner--tl`}
        decoding="async"
        draggable={false}
      />
      <img
        src={WELCOME_WALL_ASSETS.bracketCornerRight}
        alt=""
        aria-hidden
        className={`${bracketClass} welcome-bracket-corner--tr`}
        decoding="async"
        draggable={false}
      />
      <div className="welcome-panel-corners-bottom" aria-hidden>
        <img
          src={WELCOME_WALL_ASSETS.bracketCornerLeft}
          alt=""
          aria-hidden
          className={`${bracketClass} welcome-bracket-corner--tl`}
          decoding="async"
          draggable={false}
        />
        <img
          src={WELCOME_WALL_ASSETS.bracketCornerRight}
          alt=""
          aria-hidden
          className={`${bracketClass} welcome-bracket-corner--tr`}
          decoding="async"
          draggable={false}
        />
      </div>
    </>
  )
}

/** Reserves layout space for the baked floor band — panels sit directly above this. */
function WelcomeFloorSpacer() {
  return (
    <div
      aria-hidden
      className="welcome-floor-spacer w-full shrink-0 pb-[max(0px,env(safe-area-inset-bottom))]"
      style={{ height: WELCOME_FLOOR_RESERVE }}
    />
  )
}

/** Column glow over the baked floor — below panels, above backdrop. */
function WelcomeFloorReflectionOverlay() {
  return (
    <div
      aria-hidden
      className="welcome-floor-reflection-overlay pointer-events-none absolute inset-x-0 bottom-0 z-[5] overflow-hidden"
      style={{ height: WELCOME_FLOOR_RESERVE }}
    >
      <div className="welcome-floor-reflection-glow absolute inset-x-0 top-0 grid h-[78%] grid-cols-3 gap-x-[2.5%] px-[clamp(6px,_1.2vw,_40px)] lg:px-[clamp(10px,min(2.25vw,_48px),_48px)]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-full rounded-[clamp(10px,min(1.6vmin,_20px),_20px)] bg-gradient-to-b from-amber-300/32 via-amber-400/14 to-transparent blur-[clamp(6px,1.2vmin,14px)]"
          />
        ))}
      </div>
    </div>
  )
}

function VegasAttentionPanel({
  showCorners,
  animateShimmer,
  className,
  innerFlexClassName,
  tint = 'join',
  children,
}: {
  showCorners: boolean
  animateShimmer: boolean
  className: string
  /** Overrides default inner flex wrapper (defaults to column flex + h-full). */
  innerFlexClassName?: string
  tint?: 'scan' | 'join' | 'tips'
  children: ReactNode
}) {
  const tintClass =
    tint === 'scan'
      ? 'welcome-panel-surface--scan'
      : tint === 'tips'
        ? 'welcome-panel-surface--tips'
        : 'welcome-panel-surface--join'

  const innerFlex =
    innerFlexClassName ??
    'relative z-[5] flex h-full min-h-0 min-w-0 flex-col'
  return (
    <div className={`@container/size welcome-panel-frame ${className}`}>
      <div className={`${WELCOME_PANEL_SURFACE_BASE} ${tintClass} ${WELCOME_PANEL_PAD}`}>
        {animateShimmer ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] opacity-[0.04] motion-reduce:opacity-[0.02]"
            style={{
              background:
                'radial-gradient(circle at 72% 10%, rgba(253,244,202,0.45) 0%, transparent 38%), radial-gradient(circle at 18% 92%, rgba(52,211,153,0.35) 0%, transparent 44%)',
            }}
          />
        ) : null}
        <div className={WELCOME_PANEL_INNER}>
          <div className={innerFlex}>{children}</div>
        </div>
      </div>
      {showCorners ? (
        <div className="welcome-panel-corners" aria-hidden>
          <WelcomePanelCornerBrackets />
        </div>
      ) : null}
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
    'relative flex h-full min-h-0 min-w-0 w-full max-w-full flex-1 flex-col items-stretch overflow-hidden justify-self-stretch lg:h-full lg:min-h-0 lg:max-h-full lg:flex-1'

  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full w-full flex-1 flex-col items-stretch justify-start gap-y-[clamp(3px,min(0.65vmin,_8px),_10px)] overflow-hidden'

  const aimClass = `${sectionRibbon} w-full block shrink-0 text-center [text-wrap:balance]`

  const midClass = 'welcome-qr-stage'

  const whiteTileBase = 'welcome-qr-tile'

  return (
    <section aria-label="Scan to join" className={sectionClass}>
      <VegasAttentionPanel
        showCorners
        tint="scan"
        animateShimmer={!reducedMotion}
        innerFlexClassName={panelInnerFlex}
        className={WELCOME_PANEL_SHELL_QR}
      >
        <WelcomeSectionTitle ribbonClass={aimClass}>Scan to join</WelcomeSectionTitle>
        {qrOk ? (
          <div className={midClass}>
            <div className="welcome-qr-tile-shell">
              <div className={whiteTileBase}>
                <img
                  src={qrImgSrc(qrJoinUrl)}
                  alt=""
                  width={640}
                  height={640}
                  className="welcome-qr-image block h-full w-full object-contain object-center leading-none"
                  referrerPolicy="no-referrer"
                  onError={() => setQrOk(false)}
                />
              </div>
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
type WelcomeLedCountSectionProps = {
  label: string
  syncingCounts: boolean
  count: number | null
  playerCountLabelClass: string
  statTile1080: string
  statDigitBase: string
  reducedMotion: boolean
  /** Strip | under join legacy | stacked inside middle band | full-width join panel | side-by-side join stat */
  layout: 'strip' | 'underJoin' | 'middle' | 'inPanel' | 'inPanelStat'
  className?: string
}

function WelcomeLedCountSection({
  label,
  syncingCounts,
  count,
  playerCountLabelClass,
  statTile1080,
  statDigitBase,
  reducedMotion,
  layout,
  className,
}: WelcomeLedCountSectionProps) {
  const display = syncingCounts ? '—' : String(count ?? 0)
  const prevCountRef = useRef<number | null>(null)
  const [justIncreased, setJustIncreased] = useState(false)

  useEffect(() => {
    if (syncingCounts || count == null) {
      prevCountRef.current = count
      return
    }
    if (prevCountRef.current != null && count > prevCountRef.current) {
      setJustIncreased(true)
      const id = window.setTimeout(() => setJustIncreased(false), 750)
      prevCountRef.current = count
      return () => window.clearTimeout(id)
    }
    prevCountRef.current = count
  }, [count, syncingCounts])

  const stripWrapClass =
    'relative z-[18] flex w-full min-h-0 shrink-0 justify-center [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:px-[clamp(12px,min(2.4vw,_48px),_56px)]'

  const underJoinWrapClass =
    'relative z-[18] isolate w-full max-w-[min(100%,38rem)] mx-auto min-h-0 shrink-0'

  const gridMiddleWrapClass = 'relative z-[18] isolate w-full min-h-0 shrink-0 mx-auto max-w-none'

  const inPanelWrapClass = 'relative z-[5] w-full min-h-0 shrink-0'
  const inPanelStatWrapClass = 'relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col'

  const tileShared =
    `${statTile1080} min-h-0 min-w-0 rounded-[clamp(10px,min(1.5vmin,_18px),_18px)] border-2 px-[clamp(8px,min(1.35vmin,_14px),_14px)] py-[clamp(8px,min(1.25vmin,_14px),_16px)] text-center backdrop-blur-sm border-amber-300/95 bg-gradient-to-br from-[#1a1208]/78 via-black/72 to-[#0a0614]/82 shadow-[inset_0_1px_0_rgba(254,249,231,0.2),inset_0_-20px_44px_-28px_rgba(124,58,237,0.16),0_0_48px_-4px_rgba(234,179,8,0.48),0_0_72px_-8px_rgba(52,211,153,0.12)] ring-2 ring-amber-500/70 [@media(max-height:1080px)_and_(min-width:1024px)_and_(orientation:landscape)]:shadow-[inset_0_1px_0_rgba(254,249,231,0.16),inset_0_-14px_36px_-22px_rgba(124,58,237,0.12),0_0_36px_-6px_rgba(234,179,8,0.38),0_0_54px_-10px_rgba(52,211,153,0.1)]`

  const stripTileClass = `${tileShared} w-full max-w-[min(100%,clamp(260px,38vw,440px))]`
  const underJoinTileClass = `${tileShared} w-full`
  const gridMiddleTileClass = `${tileShared} flex w-full min-h-0 flex-col justify-center`
  const inPanelTileClass =
    'welcome-players-well flex w-full min-h-0 flex-col items-stretch gap-y-[clamp(8px,min(1.05vmin,_12px),_14px)]'

  function wrapTileFor(layout: WelcomeLedCountSectionProps['layout']) {
    if (layout === 'strip') return { wrap: stripWrapClass, tile: stripTileClass }
    if (layout === 'underJoin') return { wrap: underJoinWrapClass, tile: underJoinTileClass }
    if (layout === 'inPanel') return { wrap: inPanelWrapClass, tile: inPanelTileClass }
    if (layout === 'inPanelStat') return { wrap: inPanelStatWrapClass, tile: inPanelTileClass }
    return { wrap: gridMiddleWrapClass, tile: gridMiddleTileClass }
  }

  const { wrap: wrapClass, tile: tileClass } = wrapTileFor(layout)

  const labelClass = playerCountLabelClass

  return (
    <section
      aria-label={label}
      className={`${wrapClass}${className ? ` ${className}` : ''}`}
    >
      <div className={tileClass}>
        {layout === 'inPanel' || layout === 'inPanelStat' ? (
          <WelcomeLabelRule>{label}</WelcomeLabelRule>
        ) : (
          <div className={labelClass}>{label}</div>
        )}
        {layout === 'inPanel' || layout === 'inPanelStat' ? (
          <motion.div
            className="welcome-players-count"
            animate={
              !reducedMotion && justIncreased
                ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.35)', 'brightness(1)'] }
                : undefined
            }
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className={`${statDigitBase} welcome-led-glyphs`}>{display}</div>
          </motion.div>
        ) : (
          <motion.div
            className={`${statDigitBase} welcome-led-glyphs tabular-nums`}
            animate={
              !reducedMotion && justIncreased
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
  tableCount,
  playerCountLabelClass,
  playerCountGlyphClass,
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
  tableCount: number | null
  playerCountLabelClass: string
  playerCountGlyphClass: string
}) {
  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full w-full flex-1 flex-col items-stretch justify-between gap-y-[clamp(6px,min(0.9vmin,_11px),_13px)] overflow-hidden'

  const ribbonClass = `${joinRibbonClass} w-full block shrink-0 text-center [text-wrap:balance]`

  return (
    <section aria-label="Join manually" className={className}>
      <VegasAttentionPanel
        showCorners
        tint="join"
        animateShimmer={false}
        innerFlexClassName={panelInnerFlex}
        className={WELCOME_PANEL_SHELL_MID}
      >
        <WelcomeSectionTitle ribbonClass={ribbonClass}>Join manually</WelcomeSectionTitle>

        <div className="welcome-join-body">
          <div className="welcome-join-info-well">
            <div className="welcome-join-url-row">
              <p
                className={`${joinUrlText} mx-auto w-full max-w-full min-w-0 text-center text-emerald-50/96 [text-shadow:0_0_12px_rgba(52,211,153,0.35),0_1px_0_rgba(0,0,0,0.9)]`}
                aria-label={joinUrl}
              >
                {joinUrlForDisplay(joinUrl)}
              </p>
            </div>

            <WelcomeLabelRule>Room code</WelcomeLabelRule>
            <WelcomeLedDisplay
              value={venueCode.trim().toUpperCase()}
              glyphClass={venueMono}
              reducedMotion={reducedMotion}
              pulse
            />
          </div>

          <div className="welcome-join-stats-row" aria-label="Venue stats">
            <WelcomeLedCountSection
              label="Players"
              layout="inPanelStat"
              syncingCounts={syncingCounts}
              count={enrolled}
              playerCountLabelClass={playerCountLabelClass}
              statTile1080=""
              statDigitBase={playerCountGlyphClass}
              reducedMotion={reducedMotion}
            />
            <WelcomeLedCountSection
              label="Tables"
              layout="inPanelStat"
              syncingCounts={syncingCounts}
              count={tableCount}
              playerCountLabelClass={playerCountLabelClass}
              statTile1080=""
              statDigitBase={playerCountGlyphClass}
              reducedMotion={reducedMotion}
            />
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
    `welcome-tips-step text-white/95 [text-shadow:0_2px_14px_rgba(0,0,0,_0.82)] ${DISPLAY_TEXT_WELCOME_TIPS_CQ}`

  const panelInnerFlex =
    'relative z-[5] flex min-h-0 min-w-0 max-h-full w-full flex-1 flex-col items-stretch overflow-hidden'

  const ribbonClass = `${sectionRibbon} w-full block shrink-0 text-center [text-wrap:balance]`

  return (
    <section aria-label="How it works" className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col self-stretch">
      <VegasAttentionPanel
        showCorners
        tint="tips"
        animateShimmer={!reducedMotion}
        innerFlexClassName={panelInnerFlex}
        className={`${WELCOME_PANEL_SHELL_MID} relative z-[1] h-full w-full flex-1`}
      >
        <WelcomeSectionTitle ribbonClass={ribbonClass} className="welcome-section-title--tips">
          How it works
        </WelcomeSectionTitle>

        <div className="welcome-tips-stage">
          <ul className="welcome-tips-list">
            {QUIZZ_EM_WELCOME_HOW_IT_WORKS_STEPS.map((step) => (
              <li key={step} className="welcome-tips-item">
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

function WelcomeWallHeader() {
  return (
    <div className="welcome-logo-region">
      <div className="welcome-wordmark-stage relative mx-auto aspect-[958/592] shrink-0 overflow-visible">
        <div aria-hidden className="welcome-wordmark-pool-glow pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[24%]" />
        <QuizzEmWordmark layout="fill" depth="hero" />
      </div>
    </div>
  )
}

export default function AudienceWelcomeWall({ venueCode, wall }: AudienceWelcomeWallProps) {
  const joinUrl = playerJoinHref()
  const qrJoinUrl = playerJoinHrefForQr(venueCode)
  const syncingCounts = wall == null
  const enrolled = syncingCounts ? null : (wall.lobbyPlayerCount ?? 0) + (wall.totalSeatedAtTables ?? 0)
  const tableCount =
    syncingCounts || enrolled == null ? null : welcomeWallTableCount(wall, enrolled)
  const [qrOk, setQrOk] = useState(true)
  const reducedMotion = useReducedMotion()

  /** Single literal strings — tailwind JIT must see full arbitrary class sequences.
   *  Prefer vw over vmin for headline sizes so zooming the browser scales more predictably
   *  (vmin balloons when the window is tall and crowded the vertical rhythm). */
  /** `min-w-0` + wrapping so wide tracking / long words cannot blow past grid tracks */
  const sectionRibbon =
    `welcome-card-heading min-w-0 font-black uppercase text-amber-50/98 break-words text-balance whitespace-normal ${DISPLAY_TEXT_WELCOME_SECONDARY_CQ} [text-shadow:0_0_36px_rgba(251,191,36,0.52),0_0_80px_rgba(239,68,68,0.16),0_2px_4px_rgba(0,0,0,_0.95)]`

  const playerCountLabelClass =
    `welcome-section-label min-w-0 break-words text-balance font-black uppercase text-amber-50/92 ${DISPLAY_TEXT_WELCOME_DENSE_CQ} [text-shadow:0_0_14px_rgba(253,224,138,0.28),0_2px_8px_rgba(0,0,0,.58)]`

  const venueMono =
    `welcome-room-code-glyphs welcome-led-glyphs welcome-led-glyphs--room max-w-full break-all text-center leading-none ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`

  const playerCountGlyphs =
    `welcome-player-count-glyphs welcome-led-glyphs welcome-led-glyphs--count tabular-nums leading-none ${DISPLAY_TEXT_WELCOME_PRIMARY_CQ}`

  const joinUrlText =
    `hyphens-none min-w-0 whitespace-normal break-words text-center font-orbitron font-bold tracking-[0.03em] ${DISPLAY_TEXT_WELCOME_URL_CQW}`

  return (
    <div
      role="main"
      aria-label="Join"
      className="welcome-screen relative h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-x-hidden overflow-y-hidden overscroll-y-none bg-[#050806] antialiased text-white selection:bg-yellow-400/35"
    >
      <DisplayWelcomeBackdrop showFloorBand />
      <WelcomeFloorReflectionOverlay />

      <motion.div
        className="welcome-screen-content relative z-10 mx-auto flex min-h-0 h-full max-h-full w-full max-w-none flex-col px-[clamp(10px,min(2.25vw,_48px),_48px)] pt-[clamp(4px,0.5vh,10px)] pb-0 overflow-visible"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <WelcomeWallHeader />

        <div className="welcome-panel-stage relative z-10 flex min-h-0 flex-1 flex-col w-full overflow-hidden">
          <div
            aria-label="Join"
            className="welcome-panel-grid grid min-h-0 flex-none grid-cols-1 gap-y-[clamp(10px,1.2vmin,14px)] overflow-hidden lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] lg:gap-x-[var(--welcome-card-gap)] lg:gap-y-0 lg:items-stretch"
          >
              <div className="welcome-panel-column flex min-h-0 min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0">
                <WelcomeQrColumn
                  sectionRibbon={sectionRibbon}
                  qrJoinUrl={qrJoinUrl}
                  qrOk={qrOk}
                  setQrOk={setQrOk}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
              <div className="welcome-panel-column flex min-h-0 min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0">
                <WelcomeJoinCard
                  className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col"
                  venueCode={venueCode}
                  joinUrl={joinUrl}
                  joinUrlText={joinUrlText}
                  venueMono={venueMono}
                  joinRibbonClass={sectionRibbon}
                  reducedMotion={Boolean(reducedMotion)}
                  syncingCounts={syncingCounts}
                  enrolled={enrolled}
                  tableCount={tableCount}
                  playerCountLabelClass={playerCountLabelClass}
                  playerCountGlyphClass={playerCountGlyphs}
                />
              </div>
              <div className="welcome-panel-column flex min-h-0 min-w-0 flex-col overflow-hidden lg:h-full lg:min-h-0 lg:w-full">
                <WelcomeHowItWorksPanel
                  sectionRibbon={sectionRibbon}
                  reducedMotion={Boolean(reducedMotion)}
                />
              </div>
            </div>
            <WelcomeFloorSpacer />
          </div>
      </motion.div>
    </div>
  )
}
