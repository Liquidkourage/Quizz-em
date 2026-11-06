import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CardFaceGraphic,
  digitsAscending,
  ChipMark,
  ChipText,
  SidePotMark,
  sidePotColor,
  FeltHoleCardPair,
  PokerTableGraphic,
  QuizzEmWordmark,
  SeatCupholderMarker,
  STADIUM_BLIND_BADGE_RADIAL,
  STADIUM_CHIP_STACK_RADIAL,
  STADIUM_CUPHOLDER_RADIAL,
  STADIUM_HOLE_CARDS_RADIAL,
  stadiumCupholderSizePx,
  stadiumHoleCardScale,
  stadiumMosaicCupholderSizePx,
  stadiumMosaicHoleCardScale,
  stadiumMosaicHoleCardWidthPx,
  stadiumMosaicHoleCardHeightPx,
  stadiumMosaicHoleCardOverlapPx,
  stadiumSeatPointPx,
  type StadiumMosaicDensity,
} from '@qhe/ui'
import { disambiguatePublicNames, livePotLayers, type LiveSidePot } from '@qhe/core'
import {
  mosaicSeatRail,
  mosaicSidePotAmountFontPx,
  mosaicSidePotOverflowLabel,
  mosaicCornerDockPx,
  mosaicFeltFillWidthPx,
  mosaicFeltReservePx,
  mosaicReadablePlaqueMetrics,
  mosaicSidePotCornerPlan,
  mosaicSidePotsThatFit,
  mosaicTileFrame,
  type MosaicPlaqueMetrics,
  type MosaicSeatRail,
} from './mosaicTileLayout'
import {
  mosaicSeatDotPct,
  mosaicSeatHoleLayout,
  mosaicSeatLabelPct,
  mosaicSeatChipInwardFrac,
  mosaicSeatHoleInwardFrac,
  broadcastBlindMarkerPct,
  broadcastFeltAssetAnchors,
  broadcastRimStackPct,
  broadcastRimStackOffsetPx,
  broadcastRimLabelMaxWidthPx,
  broadcastRimLabelTransform,
  type BroadcastDensity,
  MOSAIC_HOLE_CARD_FAN_DEG,
  soloBroadcastHoleCardSplay,
} from './venueMosaicSeatGeometry'
import {
  broadcastFeltScale,
  DUAL_BROADCAST_HOLE_INWARD_FRAC,
  dualBroadcastHoleCardBoxPx,
} from './venueBroadcastLayout'
import {
  formatTriviaNumber,
  isVenueTileWageringPaused,
  venueTileActingSeatIndex,
} from '@qhe/core'
import type { DisplayVenueTileSnapshot, DisplayVenueWallSnapshot, SeatBettingAction } from '@qhe/net'

import seatChipStackImg from './assets/seat-chip-stack.png'
import {
  MosaicSeatStackAmount,
  MOSAIC_HOLE_CARD_LAYER,
  MOSAIC_SEAT_INITIAL_LAYER,
  mosaicHoleClearOfInitialsFrac,
  mosaicSeatInitialFontPx,
  mosaicSeatInitialLabel,
  mosaicSeatInitialShiftXPx,
  publicFeltDrawsSeat,
  publicSeatShowsHoleCards,
  mosaicSeatStackClearPx,
  mosaicSeatStackFontForAmount,
  mosaicSeatStackFontPx,
  mosaicSeatStackPlacement,
  mosaicCommunityBoardPx,
  mosaicHoleCardFitPx,
  mosaicPotFontPx,
  mosaicShowsSeatStacks,
  mosaicStreetCardBoxPx,
} from './mosaicSeatStacks'
import ShowdownResultsPanel from './ShowdownResultsPanel'
import {
  buildFloorShowdownPresentation,
  resolveShowdownDisplayPot,
} from './VenueFloorShowdownOverlay'
import { VenueFloorShowdownByVariant } from './venueFloorShowdownVariants'
import { showdownCorrectAnswerFromTile, showdownRowsFromTile, resolveVenueShowdownAnswer } from './showdownDisplay'
import { buildVenueWallTileRows, buildVenueCondenseProgress, resolveVenueHeadlineSource, showdownTableNums, venueAllTablesAnswering, venueHasOpenWagering, venueHeadlineDivergenceNote, venueHeadlinePhaseBadge, venuePublicAnswerReleased, venueTilesForAudience, venueWallBlindsHeadline, venueWallCondenseHeadline, VENUE_WALL_SEAT_SLOTS } from './venueWallModel'
import {
  buildVenueFloorHeadlineMeta,
  resolveVenueFloorSpec,
  resolveVenueFloorSpecForCompanionGrid,
  resolveVenueFloorSpecForHeroFeatured,
  showdownStageViewportFromSpec,
  venueFloorLayoutPlanForSpec,
  venueFloorMosaicTypographyFromSpec,
  venueFloorSpecMainPaddingClass,
  venueFloorSpecMainPbClass,
  venueFloorSpecUsesBroadcastHeadline,
  venueFloorSpecUsesBroadcastUiScale,
} from './venueFloorSpec'
import type { VenueFloorSpec } from './venueFloorSpec'
import { VenueFloorBody, resolveVenueFloorBodyKey } from './VenueFloorBody'
import { ShowdownTableBadge } from './venueFloorSidePotDisplay'
import {
  formatVenueBankroll,
  formatVenueBankrollDigits,
  formatVenueDisplayPlayerName,
} from './venueLeaderboard'
import VenueCondenseProgressBar from './VenueCondenseProgressBar'
import VenueHeadlineCondenseStatsPill from './VenueHeadlineCondenseStatsPill'
import {
  DISPLAY_TEXT_HEADLINE_BADGE,
  DISPLAY_TEXT_HEADLINE_META,
  DISPLAY_TEXT_HEADLINE_SETLIST_BADGE,
  DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_LABEL,
  DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_AMOUNT,
  DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_META,
  DISPLAY_TEXT_HEADLINE_PHASE_BADGE,
  DISPLAY_TEXT_HEADLINE_QUESTION_DENSE,
  displayHeadlineStatsClass,
  displayHeadlineQuestionClass,
  displayHeadlineQuestionFitProfile,
  displayBroadcastHeadlineQuestionFitProfile,
} from './displayTypography'
import { DisplayFitQuestionText } from './DisplayFitQuestionText'
import { heroSeatBlindMarkerPills } from './heroBlindMarkers'
import { venueWallUiScaleFrameStyle } from './venueWallUiScale'
import DisplayWelcomeBackdrop from './DisplayWelcomeBackdrop'
import {
  chunkTilesIntoRowGroups,
  populatedVenueTiles,
  venueFloorCardSlotWidthCss,
  venueFloorGridPaddingForLayout,
  venueFloorGridInsetClass,
  venueFloorGridPerspectiveStyle,
  venueFloorRowTrackSpec,
  venueFloorSizeSpecForDensity,
  venueFloorSpacingSpecForSpec,
  VENUE_FLOOR_GRID_BOTTOM_SAFE_REM,
  venueMosaicTileTypographyStyle,
  type VenueFloorLayoutViewport,
  type VenueFloorMosaicTypography,
  type VenueFloorSizeSpec,
  type VenueFloorTableSize,
  VENUE_FLOOR_MOSAIC_CHROME,
  VENUE_FLOOR_MOSAIC_HEADER_TYPE,
  VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS,
} from './venueFloorGridLayout'
import { capsuleBoundaryHitPx } from './tableRimGeometry'
import { useAnswerSecondsLeft } from './useAnswerSecondsLeft'

const VENUE_SEAT_SLOTS = VENUE_WALL_SEAT_SLOTS

/** Stacking inside each mini felt ({@link SeatRingWithLabels}): name + bankroll beside name always top; then center hint, badges, pile, rim. */
const SEAT_LAYER_FELT_POT = 'z-[130]'
const SEAT_LAYER_DOT = MOSAIC_SEAT_INITIAL_LAYER
const SEAT_LAYER_FELT_CHIP_PILE = 'z-[115]'
const SEAT_LAYER_BLIND_OUT = 'z-[117]'
const SEAT_LAYER_ACTION_PANEL = 'z-[118]'
const SEAT_LAYER_NAME_CLUSTER = 'z-[120]'


function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Bungee dollar display — raised smaller $, skew, embossed shadow. */
function MosaicBungeeDollarAmount({
  amount,
  className,
  prefersReducedMotion = false,
  pulseOnChange = false,
  style,
}: {
  amount: number
  className?: string
  prefersReducedMotion?: boolean
  pulseOnChange?: boolean
  style?: CSSProperties
}) {
  const label = formatVenueBankroll(amount)
  const digits = formatVenueBankrollDigits(amount)
  const body = (
    <span className="vfd-mosaic-dollar">
      <span className="vfd-mosaic-dollar-sign" aria-hidden>
        <ChipMark />
      </span>
      <span className="vfd-mosaic-dollar-digits">{digits}</span>
    </span>
  )

  if (pulseOnChange && !prefersReducedMotion) {
    return (
      <motion.span
        key={label}
        className={className}
        style={style}
        aria-label={label}
        initial={{ scale: 1.12, opacity: 0.72 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {body}
      </motion.span>
    )
  }

  return (
    <span className={className} style={style} aria-label={label}>
      {body}
    </span>
  )
}

function mosaicBungeeDollarColorClass(muted: 'dim' | 'faint' | 'live' | undefined): string {
  if (muted === 'faint') return 'vfd-mosaic-dollar--faint'
  if (muted === 'dim') return 'vfd-mosaic-dollar--dim'
  return 'vfd-mosaic-dollar--live'
}

/** Broadcast center dollars — same mono readout as rim stacks (not Bungee / LED). */
function BroadcastCenterAmount({
  amount,
  fontSizePx,
  tone = 'live',
  className = '',
  prefersReducedMotion = false,
  pulseOnChange = false,
}: {
  amount: number
  fontSizePx: number
  tone?: 'dim' | 'faint' | 'live'
  className?: string
  prefersReducedMotion?: boolean
  pulseOnChange?: boolean
}) {
  const label = formatVenueBankroll(amount)
  const toneClass =
    tone === 'faint'
      ? 'vfd-broadcast-center-amount--faint'
      : tone === 'dim'
        ? 'vfd-broadcast-center-amount--dim'
        : 'vfd-broadcast-center-amount--live'
  const body = (
    <span
      className={`vfd-broadcast-center-amount ${toneClass} ${className}`.trim()}
      style={{ fontSize: `${fontSizePx}px` }}
    >
      <ChipText text={label} />
    </span>
  )

  if (pulseOnChange && !prefersReducedMotion) {
    return (
      <motion.span
        key={label}
        className="inline-flex max-w-full shrink"
        aria-label={label}
        initial={{ scale: 1.06, opacity: 0.84 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {body}
      </motion.span>
    )
  }

  return (
    <span className="inline-flex max-w-full shrink" aria-label={label}>
      {body}
    </span>
  )
}

function feltPotAria(pot: number, sides: readonly LiveSidePot[] = []): string {
  return labeledSidePots(formatVenueBankroll(pot), sides)
}

function labeledSidePots(money: string, sides: readonly LiveSidePot[]): string {
  if (sides.length === 0) return `pot ${money}`
  const labeled = sides.map((side) => `${side.mark} ${formatVenueBankroll(side.amount)}`).join(', ')
  return `main ${money}, side ${labeled}`
}

/** Main pot, plus every side pot each seat can win. */
function shownFeltPot(
  pot: number,
  invested: number[] | undefined,
  folded: boolean[] | undefined,
  bankrolls: number[] | undefined,
  pointsOnly: boolean[] | undefined,
  stacksKnown: boolean,
): { pot: number; marks: number[][]; sides: LiveSidePot[] } {
  const raw = Math.max(0, Math.floor(Number.isFinite(pot) ? pot : 0))
  const amounts = Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = invested?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
  })
  const folds = Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => folded?.[i] === true || pointsOnly?.[i] === true)
  const allIn = amounts.map((amount, i) =>
    mosaicSeatIsAllIn({
      stacksKnown,
      bankroll: bankrolls?.[i] ?? 0,
      invested: amount,
      folded: folds[i] === true,
      pointsOnly: pointsOnly?.[i] === true,
    }),
  )
  const layers = livePotLayers(amounts, folds, allIn)
  return { pot: layers.main > 0 ? layers.main : raw, marks: layers.marks, sides: layers.sides }
}

function sideMarkAt(marks: readonly (readonly number[])[] | null, index: number): readonly number[] {
  if (marks == null) return []
  return marks[index] ?? []
}

function withSidePotMark(label: string, mark: number | readonly number[] | null): ReactNode {
  if (!label) return undefined
  return (
    <>
      {label}
      <SidePotMark mark={mark} seat />
    </>
  )
}

function FeltMainLabel({ sides }: { sides: readonly LiveSidePot[] | undefined }) {
  if (sides == null || sides.length === 0) return null
  return <p className="vfd-felt-pot-label">Main</p>
}

function FeltSideLayers({ sides }: { sides: readonly LiveSidePot[] | undefined }) {
  if (sides == null || sides.length === 0) return null
  return (
    <div className="vfd-felt-side-pot">
      <p className="vfd-felt-pot-label">Side</p>
      {sides.map((side) => (
        <p key={side.mark} style={{ color: sidePotColor(side.mark) }}>
          <SidePotMark mark={side.mark} /> <ChipText text={formatVenueBankroll(side.amount)} />
        </p>
      ))}
    </div>
  )
}

/** Pot dollars — pulses when the venue snapshot posts a new amount. */
function VenuePotAmount({
  amount,
  className,
  prefersReducedMotion,
  potMuted = 'live',
  style,
}: {
  amount: number
  className: string
  prefersReducedMotion: boolean
  potMuted?: 'dim' | 'faint' | 'live'
  style?: CSSProperties
}) {
  return (
    <MosaicBungeeDollarAmount
      amount={amount}
      className={`${className} ${mosaicBungeeDollarColorClass(potMuted)}`}
      prefersReducedMotion={prefersReducedMotion}
      pulseOnChange
      style={style}
    />
  )
}

type MosaicTableStatusBandKind = 'to-call' | 'no-more-bets' | 'answering'

function publicBetCue(amount: number, lastCall: boolean): { cue: string; showAmount: boolean } {
  if (amount > 0) return { cue: lastCall ? 'last call' : 'to call', showAmount: true }
  return { cue: lastCall ? 'last call' : 'to bet', showAmount: false }
}

function publicBetAria(playerName: string, amount: number, lastCall: boolean): string {
  const cue = publicBetCue(amount, lastCall)
  return cue.showAmount ? `${playerName} ${cue.cue} ${formatVenueBankroll(amount)}` : `${playerName} ${cue.cue}`
}

/** Table status cue — sits between header and felt (to-call, closed betting, answering). */
function MosaicTableStatusBand({
  kind,
  playerName,
  callAmount,
  lastCall = false,
  prefersReducedMotion = false,
  gridRowClass = '',
}: {
  kind: MosaicTableStatusBandKind
  playerName?: string
  callAmount?: number
  lastCall?: boolean
  prefersReducedMotion?: boolean
  gridRowClass?: string
}) {
  if (kind === 'to-call' && playerName && callAmount != null) {
    const amount = Math.max(0, Math.floor(callAmount))
    const cue = publicBetCue(amount, lastCall)
    return (
      <div
        className={`vfd-mosaic-status-band vfd-mosaic-status-band--call shrink-0 ${gridRowClass}`}
        aria-live="polite"
        aria-label={publicBetAria(playerName, amount, lastCall)}
      >
        <span className="vfd-mosaic-status-band-name" title={playerName}>
          {playerName}
        </span>
        <span className="vfd-mosaic-status-band-label">{cue.cue}</span>
        {cue.showAmount ? (
          <MosaicBungeeDollarAmount
            amount={amount}
            className="vfd-mosaic-status-band-amount vfd-mosaic-dollar--live"
            prefersReducedMotion={prefersReducedMotion}
            pulseOnChange
          />
        ) : null}
      </div>
    )
  }

  if (kind === 'no-more-bets') {
    return (
      <div
        className={`vfd-mosaic-status-band vfd-mosaic-status-band--closed shrink-0 ${gridRowClass}`}
        aria-live="polite"
        role="status"
        aria-label="No more bets"
      >
        <span className="vfd-mosaic-status-band-message">No more bets</span>
      </div>
    )
  }

  return (
    <div
      className={`vfd-mosaic-status-band vfd-mosaic-status-band--answering shrink-0 ${gridRowClass}`}
      aria-live="polite"
      role="status"
      aria-label="Answer on your phone"
    >
      <span className="vfd-mosaic-status-band-message">Answer on your phone</span>
    </div>
  )
}

export { mosaicSidePotsThatFit } from './mosaicTileLayout'

type MosaicChipSector = { d: string; cx: number; cy: number; a0: number; a1: number }
type MosaicChipStraight = { x: number; y: number; w: number; h: number }

const CHIP_RIM_CY = 50
const CHIP_RIM_LEFT = 50
const CHIP_RIM_RIGHT = 190
const CHIP_RIM_OUTER = 47
const CHIP_RIM_INNER = 30
const CHIP_END_SPAN = 28
const CHIP_STRAIGHT_COUNT = 4
const CHIP_STRAIGHT_W = 18
const CHIP_STRAIGHT_END_GAP = 7.15
const CHIP_STRAIGHT_GAP = 17.9

function chipRimPoint(cx: number, cy: number, radius: number, degrees: number): string {
  const radians = (degrees * Math.PI) / 180
  const x = cx + radius * Math.cos(radians)
  const y = cy - radius * Math.sin(radians)
  return `${x.toFixed(2)} ${y.toFixed(2)}`
}

/** Annular sector. Angles are math degrees, y-up, around the semicircle center. */
function chipAnnularSector(cx: number, cy: number, center: number, span: number): MosaicChipSector {
  const a0 = center - span / 2
  const a1 = center + span / 2
  const outer = CHIP_RIM_OUTER
  const inner = CHIP_RIM_INNER
  const d = [
    `M ${chipRimPoint(cx, cy, outer, a0)}`,
    `A ${outer} ${outer} 0 0 0 ${chipRimPoint(cx, cy, outer, a1)}`,
    `L ${chipRimPoint(cx, cy, inner, a1)}`,
    `A ${inner} ${inner} 0 0 1 ${chipRimPoint(cx, cy, inner, a0)}`,
    'Z',
  ].join(' ')
  return { d, cx, cy, a0, a1 }
}

function chipStadium(radius: number): string {
  const top = (CHIP_RIM_CY - radius).toFixed(2)
  const bottom = (CHIP_RIM_CY + radius).toFixed(2)
  const left = CHIP_RIM_LEFT.toFixed(2)
  const right = CHIP_RIM_RIGHT.toFixed(2)
  const r = radius.toFixed(2)
  return `M ${left} ${top} H ${right} A ${r} ${r} 0 0 1 ${right} ${bottom} H ${left} A ${r} ${r} 0 0 1 ${left} ${top} Z`
}

/**
 * Straight rectangles plus three annular sectors on each end.
 * End centers sit at -60°, 0°, and +60° from the outward horizontal.
 */
export function mosaicChipInlay(): {
  mask: string
  outer: number
  inner: number
  sectors: MosaicChipSector[]
  straights: MosaicChipStraight[]
} {
  const right = [-60, 0, 60].map((center) => chipAnnularSector(CHIP_RIM_RIGHT, CHIP_RIM_CY, center, CHIP_END_SPAN))
  const left = [120, 180, 240].map((center) => chipAnnularSector(CHIP_RIM_LEFT, CHIP_RIM_CY, center, CHIP_END_SPAN))
  const height = CHIP_RIM_OUTER - CHIP_RIM_INNER
  const straights: MosaicChipStraight[] = []
  for (let index = 0; index < CHIP_STRAIGHT_COUNT; index += 1) {
    const x = CHIP_RIM_LEFT + CHIP_STRAIGHT_END_GAP + index * (CHIP_STRAIGHT_W + CHIP_STRAIGHT_GAP)
    straights.push({ x, y: CHIP_RIM_CY - CHIP_RIM_OUTER, w: CHIP_STRAIGHT_W, h: height })
    straights.push({ x, y: CHIP_RIM_CY + CHIP_RIM_INNER, w: CHIP_STRAIGHT_W, h: height })
  }
  return {
    mask: `${chipStadium(49)} ${chipStadium(28)}`,
    outer: CHIP_RIM_OUTER,
    inner: CHIP_RIM_INNER,
    sectors: [...right, ...left],
    straights,
  }
}

const MOSAIC_CHIP_INLAY = mosaicChipInlay()

function plaqueFitStyle(
  metrics: MosaicPlaqueMetrics | undefined,
  amountLabel?: string,
): CSSProperties | undefined {
  if (metrics == null) return undefined
  const fontPx =
    amountLabel != null
      ? mosaicSidePotAmountFontPx(metrics.heightPx, amountLabel)
      : Math.max(12, Math.round(metrics.heightPx * 0.46))
  return {
    '--vfd-plaque-w': `${metrics.widthPx}px`,
    '--vfd-plaque-h': `${metrics.heightPx}px`,
    '--vfd-plaque-font': `${fontPx}px`,
  } as CSSProperties
}

/** Chip plaque for one side pot on a mosaic felt. Color matches that pot's seat badges. */
export function MosaicSidePotPlaques({
  sides,
  hidden = false,
  hiddenCount = 0,
  metrics,
}: {
  sides: readonly LiveSidePot[] | undefined
  hidden?: boolean
  /** Established pots that did not fit on this row. */
  hiddenCount?: number
  /** Measured tile box. Unmeasured tiles keep the CSS fallback size. */
  metrics?: MosaicPlaqueMetrics
}) {
  const clipId = useId().replace(/:/g, '')
  const shown = sides ?? []
  const plan = mosaicSidePotCornerPlan(shown.length + hiddenCount)
  const cornerSides = shown.slice(0, plan.pots)
  const overflow = plan.overflow > 0 ? mosaicSidePotOverflowLabel(plan.overflow) : ''
  if (hidden || (cornerSides.length === 0 && overflow === '')) return null
  const overflowStyle = plaqueFitStyle(metrics)
  const slots = cornerSides.length + (overflow !== '' ? 1 : 0)
  return (
    <div
      className="vfd-mosaic-side-plaques col-start-1 row-start-3 shrink-0"
      role="list"
      style={metrics != null ? ({ gap: `${metrics.gapPx}px` } as CSSProperties) : undefined}
    >
      {cornerSides.map((side, index) => {
        const corner = slots === 1 || index === 0 ? 'left' : 'right'
        return (
        <div
          key={side.mark}
          className={`vfd-mosaic-side-plaque vfd-mosaic-side-plaque--${corner}${metrics != null ? ' vfd-mosaic-side-plaque--fit' : ''}`}
          role="listitem"
          aria-label={`Side pot ${side.mark} ${formatVenueBankroll(side.amount)}`}
          style={
            {
              '--vfd-side-pot': sidePotColor(side.mark),
              ...plaqueFitStyle(metrics, formatVenueBankrollDigits(side.amount)),
            } as CSSProperties
          }
        >
          <svg className="vfd-mosaic-side-plaque-rim" viewBox="0 0 240 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <defs>
              <clipPath id={`${clipId}-${side.mark}`}>
                <path d={MOSAIC_CHIP_INLAY.mask} fillRule="evenodd" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId}-${side.mark})`}>
              {MOSAIC_CHIP_INLAY.sectors.map((sector) => (
                <path key={`${sector.cx}-${sector.a0}`} className="vfd-mosaic-side-plaque-inlay" d={sector.d} />
              ))}
              {MOSAIC_CHIP_INLAY.straights.map((bar) => (
                <rect key={`${bar.x}-${bar.y}`} className="vfd-mosaic-side-plaque-inlay" x={bar.x} y={bar.y} width={bar.w} height={bar.h} />
              ))}
            </g>
          </svg>
          <span className="vfd-mosaic-side-plaque-face">
            <span className="vfd-mosaic-side-plaque-mark" aria-hidden>
              {side.mark}
            </span>
            <span className="vfd-mosaic-side-plaque-amount">{formatVenueBankrollDigits(side.amount)}</span>
          </span>
        </div>
        )
      })}
      {overflow !== '' ? (
        <div
          className={`vfd-mosaic-side-overflow vfd-mosaic-side-plaque--${cornerSides.length === 0 ? 'left' : 'right'}`}
          role="listitem"
          aria-label={`${plan.overflow} more side pots`}
          style={overflowStyle}
        >
          {overflow}
        </div>
      ) : null}
    </div>
  )
}

/** A seat with a zero stack that has chips in the pot is all-in. */
export function mosaicSeatIsAllIn(args: {
  stacksKnown: boolean
  bankroll: number
  invested: number
  folded: boolean
  pointsOnly: boolean
}): boolean {
  return (
    args.stacksKnown &&
    !args.folded &&
    !args.pointsOnly &&
    args.bankroll === 0 &&
    args.invested > 0
  )
}

function mosaicSeatStatusNode(folded: boolean, allIn: boolean): ReactNode {
  if (folded) {
    return (
      <span className="vfd-mosaic-seat-status vfd-mosaic-seat-status--folded whitespace-nowrap">Folded</span>
    )
  }
  if (!allIn) return null
  return <span className="vfd-mosaic-seat-status vfd-mosaic-seat-status--allin whitespace-nowrap">All-in</span>
}

function mosaicSeatBadgeRow(marks: readonly number[]): ReactNode {
  if (marks.length === 0) return null
  return (
    <span className="vfd-mosaic-seat-badges">
      {marks.map((mark) => (
        <span
          key={mark}
          className="vfd-mosaic-side-badge"
          aria-label={`Side pot ${mark}`}
          style={{ '--vfd-side-pot': sidePotColor(mark) } as CSSProperties}
        >
          {mark}
        </span>
      ))}
    </span>
  )
}

function mosaicSeatRailStack(rail: MosaicSeatRail, status: ReactNode, badgeRow: ReactNode): ReactNode {
  if (status == null && badgeRow == null) return null
  const statusFirst = rail !== 'bottom'
  return (
    <span className="vfd-mosaic-seat-rail">
      {statusFirst ? status : badgeRow}
      {statusFirst ? badgeRow : status}
    </span>
  )
}

/** Initials, side-pot chips, and folded / all-in status for one mosaic seat. */
export function MosaicSeatFace({
  initials,
  marks,
  folded,
  allIn,
  seatIndex = 4,
}: {
  initials: string
  marks: readonly number[]
  folded: boolean
  allIn: boolean
  seatIndex?: number
}) {
  const rail = mosaicSeatRail(seatIndex)
  const railStack = mosaicSeatRailStack(rail, mosaicSeatStatusNode(folded, allIn), mosaicSeatBadgeRow(marks))
  const initialsFirst = rail === 'bottom'
  return (
    <span className={`vfd-mosaic-seat-face vfd-mosaic-seat-face--${rail}`}>
      {initialsFirst ? null : railStack}
      <span className={folded ? 'vfd-mosaic-seat-initial--folded' : undefined}>{initials}</span>
      {initialsFirst ? railStack : null}
    </span>
  )
}

/** Chip stack on broadcast felt — scales with measured table width (matches fullscreen hero). */
function broadcastChipStackLayoutPx(rimW: number, density: 'solo' | 'dual' = 'solo'): {
  heightPx: number
  maxWidthPx: number
  fontPx: number
} {
  const scale = broadcastFeltScale(rimW, density)
  const pile = density === 'dual' ? 42 : 70
  const pileWide = density === 'dual' ? 68 : 118
  return {
    heightPx: Math.round(pile * scale),
    maxWidthPx: Math.round(pileWide * scale),
    fontPx: Math.round(34 * scale),
  }
}

/** Dealer puck / blind lammers — scale with table width on venue walls. */
function venueBlindMarkerSizePx(
  rimW: number,
  mode: 'broadcast' | 'lg' | 'md',
  density: 'solo' | 'dual' = 'solo',
): number {
  const scale =
    mode === 'broadcast'
      ? broadcastFeltScale(rimW, density)
      : broadcastFeltScale(rimW, 'solo')
  const base = mode === 'broadcast' ? 44 : mode === 'lg' ? 38 : 30
  return Math.round(base * scale)
}

/** Felt center HUD on n=1 broadcast — scales with measured table width. */
function broadcastCenterTypographyPx(rimW: number, density: 'solo' | 'dual' = 'solo'): {
  potAmountPx: number
  actionNamePx: number
  actionLabelPx: number
  actionAmountPx: number
  messagePx: number
  gapPx: number
  lineGapPx: number
} {
  const scale = broadcastFeltScale(rimW, density)
  return {
    potAmountPx: Math.round(80 * scale),
    actionNamePx: Math.round(32 * scale),
    actionLabelPx: Math.round(24 * scale),
    actionAmountPx: Math.round(40 * scale),
    messagePx: Math.round(24 * scale),
    gapPx: Math.round(8 * scale),
    lineGapPx: Math.round(5 * scale),
  }
}

/** Community board on n=1 broadcast — stadium-scaled, not mosaic tile sizing. */
function broadcastCommunityCardLayoutPx(
  rimW: number,
  density: 'solo' | 'dual' = 'solo',
): { widthPx: number; heightPx: number; boardGapPx: number; gapPx: number } {
  const scale = broadcastFeltScale(rimW, density)
  const widthPx = Math.round(76 * scale)
  const heightPx = Math.round((widthPx * 7) / 5)
  return {
    widthPx,
    heightPx,
    boardGapPx: Math.round(24 * scale),
    gapPx: Math.max(6, Math.round(widthPx * 0.12)),
  }
}

/** Folded-player OUT badge on broadcast hero felts. */
function broadcastFoldOutBadgePx(rimW: number, density: 'solo' | 'dual' = 'solo'): {
  fontPx: number
  padXPx: number
  padYPx: number
  minWidthPx: number
} {
  const scale = broadcastFeltScale(rimW, density)
  return {
    fontPx: Math.round(24 * scale),
    padXPx: Math.round(14 * scale),
    padYPx: Math.round(5 * scale),
    minWidthPx: Math.round(52 * scale),
  }
}

/** Broadcast hero (n=1): pot + acting line centered on felt — replaces header status band. */
function VenueBroadcastCenterStack({
  pot,
  potMuted,
  actionKind,
  actingPlayerName,
  callAmount,
  lastCall = false,
  communityDigits,
  communityCardWidthPx,
  communityCardHeightPx,
  communityBoardGapPx,
  communityCardGapPx,
  prefersReducedMotion,
  rimW,
  density = 'solo',
  sides,
}: {
  pot: number
  potMuted: 'dim' | 'faint' | 'live'
  actionKind: MosaicTableStatusBandKind | null
  actingPlayerName?: string | null
  callAmount?: number | null
  lastCall?: boolean
  communityDigits: number[]
  communityCardWidthPx: number
  communityCardHeightPx: number
  communityBoardGapPx: number
  communityCardGapPx: number
  prefersReducedMotion: boolean
  rimW: number
  density?: 'solo' | 'dual'
  sides: readonly LiveSidePot[] | undefined
}) {
  const feltBounds = venueFeltBoundsFrac()
  const centerTypo = broadcastCenterTypographyPx(rimW, density)
  const centerCxPct = feltBounds.cx * 100
  const centerCyPct = feltBounds.cy * 100
  const hasCommunityBoard = communityDigits.length > 0
  const boardHalfPx = hasCommunityBoard ? Math.round(communityCardHeightPx / 2) : 0
  const centerAnchorStyle = {
    position: 'absolute' as const,
    left: `${centerCxPct}%`,
    top: `${centerCyPct}%`,
    maxWidth: '94%',
    textAlign: 'center' as const,
  }
  const potAboveBoardPx = boardHalfPx + communityBoardGapPx
  const actionBelowBoardPx = boardHalfPx + communityBoardGapPx + Math.round(communityCardHeightPx * 0.22)
  const potStackStyle = {
    ...centerAnchorStyle,
    transform: hasCommunityBoard
      ? `translate(-50%, calc(-100% - ${potAboveBoardPx}px))`
      : 'translate(-50%, -50%)',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  }
  const actionStackStyle = {
    ...centerAnchorStyle,
    transform: hasCommunityBoard
      ? `translate(-50%, ${actionBelowBoardPx}px)`
      : `translate(-50%, calc(-50% + ${Math.round(centerTypo.potAmountPx * 0.55 + centerTypo.lineGapPx)}px))`,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
  }
  const hasActionLine =
    actionKind === 'to-call' ||
    actionKind === 'no-more-bets' ||
    actionKind === 'answering'
  const betCue =
    actionKind === 'to-call' && callAmount != null
      ? publicBetCue(Math.max(0, Math.floor(callAmount)), lastCall)
      : null
  return (
    <div
      className={`pointer-events-none absolute inset-0 flex items-center justify-center ${SEAT_LAYER_FELT_POT}`}
      aria-hidden={pot <= 0 && actionKind == null && communityDigits.length === 0}
    >
      {hasCommunityBoard ? (
        <div
          className="vfd-broadcast-community-board flex max-w-[92%] items-center justify-center"
          style={{
            position: 'absolute',
            left: `${centerCxPct}%`,
            top: `${centerCyPct}%`,
            transform: 'translate(-50%, -50%)',
            gap: communityCardGapPx,
          }}
        >
          {communityDigits.map((digit, i) => (
            <MosaicDigitCard
              key={`${i}-${digit}`}
              digit={digit}
              widthPx={communityCardWidthPx}
              heightPx={communityCardHeightPx}
            />
          ))}
        </div>
      ) : null}
      <div className="vfd-broadcast-pot-stack" style={potStackStyle}>
        <FeltMainLabel sides={sides} />
        <BroadcastCenterAmount
          amount={pot}
          fontSizePx={centerTypo.potAmountPx}
          tone={potMuted}
          className="vfd-broadcast-center-amount--pot"
          prefersReducedMotion={prefersReducedMotion}
          pulseOnChange
        />
        <FeltSideLayers sides={sides} />
      </div>
      {hasActionLine ? (
        <div className="vfd-broadcast-action-stack" style={actionStackStyle}>
        {actionKind === 'to-call' && actingPlayerName && callAmount != null ? (
          <div
            className="vfd-broadcast-center-line vfd-broadcast-center-line--action"
            aria-live="polite"
            aria-label={
              betCue
                ? publicBetAria(actingPlayerName, Math.max(0, Math.floor(callAmount)), lastCall)
                : undefined
            }
          >
            <span
              className="vfd-broadcast-action-name"
              title={actingPlayerName}
              style={{ fontSize: centerTypo.actionNamePx }}
            >
              {actingPlayerName}
            </span>
            <span className="vfd-broadcast-action-label" style={{ fontSize: centerTypo.actionLabelPx }}>
              {betCue?.cue}
            </span>
            {betCue?.showAmount ? (
              <BroadcastCenterAmount
                amount={callAmount}
                fontSizePx={centerTypo.actionAmountPx}
                prefersReducedMotion={prefersReducedMotion}
                pulseOnChange
              />
            ) : null}
          </div>
        ) : actionKind === 'no-more-bets' ? (
          <p
            className="vfd-broadcast-center-line vfd-broadcast-center-line--status vfd-broadcast-action-message"
            role="status"
            style={{ fontSize: centerTypo.messagePx }}
          >
            No more bets
          </p>
        ) : actionKind === 'answering' ? (
          <p
            className="vfd-broadcast-center-line vfd-broadcast-center-line--status vfd-broadcast-action-message vfd-broadcast-action-message--answering"
            role="status"
            style={{ fontSize: centerTypo.messagePx }}
          >
            Answer on your phone
          </p>
        ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Community board and/or pot — centered on mosaic felt. */
function VenueMosaicFeltCenterStack({
  communityDigits,
  communityCardWidthPx,
  communityCardHeightPx,
  pot,
  potClass,
  potMuted,
  potFontCapPx = null,
  boardLiftPx = 0,
  potDropPx = 0,
  prefersReducedMotion,
}: {
  communityDigits: number[]
  communityCardWidthPx: number
  communityCardHeightPx: number
  pot?: number | null
  potClass?: string
  potMuted?: 'dim' | 'faint' | 'live'
  potFontCapPx?: number | null
  boardLiftPx?: number
  potDropPx?: number
  prefersReducedMotion: boolean
}) {
  const feltBounds = venueFeltBoundsFrac()
  const showPot = pot != null && potClass != null
  if (communityDigits.length === 0 && !showPot) return null
  const center = {
    position: 'absolute' as const,
    left: `${feltBounds.cx * 100}%`,
    top: `${feltBounds.cy * 100}%`,
    maxWidth: '92%',
  }
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${SEAT_LAYER_FELT_POT}`}
      aria-hidden={communityDigits.length === 0 && !showPot}
    >
      {communityDigits.length > 0 ? (
        <div
          className="flex items-center justify-center"
          style={{
            ...center,
            transform: `translate(-50%, calc(-100% - ${boardLiftPx}px))`,
            gap: Math.max(2, Math.round(communityCardWidthPx * 0.07)),
          }}
        >
          {communityDigits.map((digit, i) => (
            <MosaicDigitCard
              key={`${i}-${digit}`}
              digit={digit}
              widthPx={communityCardWidthPx}
              heightPx={communityCardHeightPx}
            />
          ))}
        </div>
      ) : null}
      {showPot ? (
        <span
          className="block max-w-full text-center"
          style={{ ...center, transform: `translate(-50%, calc(-50% + ${potDropPx}px))` }}
        >
          <VenuePotAmount
            amount={pot}
            prefersReducedMotion={prefersReducedMotion}
            potMuted={potMuted}
            className={`block max-w-full text-center leading-none ${potClass}`}
            style={
              potFontCapPx != null
                ? { fontSize: `min(var(--vfd-stack-size), ${potFontCapPx}px)` }
                : undefined
            }
          />
        </span>
      ) : null}
    </div>
  )
}

/** Toward-table-center hint by the acting seat: call amount only (active player only). */
function formatActingCallHint(amount: number): string {
  if (amount <= 0) return 'No call to match'
  return `Call ${formatVenueBankroll(amount)}`
}

/** Player whose turn it is during open wagering. */
function mosaicActingPlayerName(
  actingSeatIndex: number | null,
  seatNames: string[]
): string | null {
  if (actingSeatIndex == null) return null
  if (actingSeatIndex < 0 || actingSeatIndex >= VENUE_SEAT_SLOTS) return null
  const raw = seatNames[actingSeatIndex]?.trim() ?? ''
  if (!raw) return `Seat ${actingSeatIndex + 1}`
  return formatVenueDisplayPlayerName(raw)
}

/** Diagonal stamp when wagering is closed on this felt. */
function VenueMosaicNoMoreBetsWatermark({ offsetClass }: { offsetClass: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center overflow-hidden rounded-xl"
      aria-hidden
    >
      <span
        className={`${VENUE_FLOOR_MOSAIC_HEADER_TYPE.noMoreBetsWatermark} -rotate-12 ${offsetClass} drop-shadow-[0_0_18px_rgba(52,211,153,0.12)]`}
      >
        NO MORE BETS
      </span>
    </div>
  )
}

function padSeatNames(raw: string[] | undefined): string[] {
  const padded = Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    if (raw != null && raw[i] != null) {
      const t = String(raw[i]).trim()
      return t
    }
    return ''
  })
  return disambiguatePublicNames(padded)
}

function padSeatBankrolls(raw: number[] | undefined): number[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  })
}

/** Matches server `seatFolded` (or false when absent). */
function padSeatFolded(raw: boolean[] | undefined): boolean[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => raw?.[i] === true)
}

/** Matches server `seatPointsOnly` (busted / no chip stack). */
function padSeatPointsOnly(raw: boolean[] | undefined): boolean[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => raw?.[i] === true)
}

function padSeatAnswerLocked(raw: boolean[] | undefined): boolean[] {
  return Array.from({ length: VENUE_WALL_SEAT_SLOTS }, (_, i) => raw?.[i] === true)
}

function padSeatSubmittedAnswers(raw: (number | null | undefined)[] | undefined): (number | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  })
}

function padSeatLastBettingAction(
  raw: (SeatBettingAction | null | undefined)[] | undefined
): (SeatBettingAction | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const v = raw?.[i]
    if (v === 'check' || v === 'call' || v === 'raise' || v === 'fold' || v === 'allIn') return v
    return null
  })
}

function padSeatHoleDigits(
  raw: (readonly [number, number] | null | undefined)[] | undefined
): (readonly [number, number] | null)[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
    const h = raw?.[i]
    if (h == null || h.length < 2) return null
    const d0 = h[0]
    const d1 = h[1]
    if (
      typeof d0 !== 'number' ||
      typeof d1 !== 'number' ||
      !Number.isInteger(d0) ||
      !Number.isInteger(d1) ||
      d0 < 0 ||
      d0 > 9 ||
      d1 < 0 ||
      d1 > 9
    ) {
      return null
    }
    return [d0, d1] as const
  })
}

function padSeatHolesDealt(raw: readonly boolean[] | undefined): boolean[] {
  return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => raw?.[i] === true)
}

/** Under the seat initials so the letters sit on top of the pair. */
const SEAT_LAYER_FELT_HOLE = MOSAIC_HOLE_CARD_LAYER

/** Community / center board card — fixed px from measured ring (same pattern as hole cards). */
function MosaicDigitCard({
  digit,
  dimmed = false,
  faceDown = false,
  widthPx,
  heightPx,
}: {
  digit?: number
  dimmed?: boolean
  faceDown?: boolean
  widthPx: number
  heightPx: number
}) {
  return (
    <div className="shrink-0" style={{ width: widthPx, height: heightPx }}>
      <CardFaceGraphic
        digit={digit ?? 0}
        faceDown={faceDown}
        dimmed={dimmed}
        className="block h-full w-full"
        alt=""
        aria-hidden
      />
    </div>
  )
}

/** Two fanned face-down hole cards — rail edge pinned, fan opens toward the pot. */
function MosaicHoleCardPair({
  rotateDeg,
  cardWidthPx,
  cardHeightPx,
  overlapPx,
}: {
  rotateDeg: number
  cardWidthPx: number
  cardHeightPx: number
  overlapPx: number
}) {
  const fan = MOSAIC_HOLE_CARD_FAN_DEG
  const cardShell = (fanDeg: number, overlap = 0) => (
    <div
      className="shrink-0"
      style={{
        width: cardWidthPx,
        height: cardHeightPx,
        marginLeft: overlap,
        transformOrigin: '50% 100%',
        transform: fanDeg !== 0 ? `rotate(${fanDeg}deg)` : undefined,
      }}
    >
      <CardFaceGraphic faceDown digit={0} className="block h-full w-full" alt="" aria-hidden />
    </div>
  )

  return (
    <div
      className="pointer-events-none flex items-end justify-center"
      style={{
        transform: `rotate(${rotateDeg}deg)`,
        transformOrigin: '50% 100%',
      }}
      aria-hidden
    >
      {cardShell(fan)}
      {cardShell(-fan, -overlapPx)}
    </div>
  )
}

const SEAT_BETTING_ACTION_LABELS: Record<SeatBettingAction, string> = {
  check: 'CHECK',
  call: 'CALL',
  raise: 'RAISE',
  fold: 'FOLD',
  allIn: 'ALL-IN',
}

const SEAT_BETTING_ACTION_PILL_CLASS: Record<SeatBettingAction, string> = {
  check: 'border-slate-400/45 bg-slate-900/92 text-slate-100',
  call: 'border-sky-500/40 bg-sky-950/90 text-sky-100',
  raise: 'border-amber-500/45 bg-amber-950/90 text-amber-100',
  fold: 'border-rose-400/45 bg-rose-950/92 text-rose-100',
  allIn: 'border-violet-500/45 bg-violet-950/90 text-violet-100',
}

function seatBettingActionLabel(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_LABELS[action]
}

function seatBettingActionPillClass(action: SeatBettingAction): string {
  return SEAT_BETTING_ACTION_PILL_CLASS[action]
}

/** Mini-table wrapper aspect (width / height). */
const VENUE_RING_ASPECT_MD = 8 / 5

/** Amber rail — mosaic uses full wrapper; full mode insets slightly. */
const VENUE_RAIL_INSET_TOP = 0.02
const VENUE_RAIL_INSET_RIGHT = 0.02
const VENUE_RAIL_INSET_BOTTOM = 0.02
const VENUE_RAIL_INSET_LEFT = 0.02

/** Green felt inset inside the rail. */
const VENUE_FELT_INSET_TOP = 0.1
const VENUE_FELT_INSET_RIGHT = 0.06
const VENUE_FELT_INSET_BOTTOM = 0.13
const VENUE_FELT_INSET_LEFT = 0.06

function venueRailBoundsFrac() {
  const innerW = 1 - VENUE_RAIL_INSET_LEFT - VENUE_RAIL_INSET_RIGHT
  const innerH = 1 - VENUE_RAIL_INSET_TOP - VENUE_RAIL_INSET_BOTTOM
  return {
    cx: VENUE_RAIL_INSET_LEFT + innerW / 2,
    cy: VENUE_RAIL_INSET_TOP + innerH / 2,
    halfW: innerW / 2,
    halfH: innerH / 2,
    innerW,
    innerH,
  }
}

function venueFeltBoundsFrac() {
  const innerW = 1 - VENUE_FELT_INSET_LEFT - VENUE_FELT_INSET_RIGHT
  const innerH = 1 - VENUE_FELT_INSET_TOP - VENUE_FELT_INSET_BOTTOM
  return {
    cx: VENUE_FELT_INSET_LEFT + innerW / 2,
    cy: VENUE_FELT_INSET_TOP + innerH / 2,
    halfW: innerW / 2,
    halfH: innerH / 2,
    innerW,
    innerH,
  }
}

function venueSeatRimPxAndOutwardNormal(
  seatIndex: number,
  w: number,
  h: number,
  radialScale: number,
  target: 'rail' | 'felt' = 'rail'
): { rimX: number; rimY: number; ux: number; uy: number } {
  const bounds = target === 'rail' ? venueRailBoundsFrac() : venueFeltBoundsFrac()
  const cx = bounds.cx * w
  const cy = bounds.cy * h
  const halfW = bounds.halfW * w
  const halfH = bounds.halfH * h
  const θ = seatThetaRad(seatIndex)
  const hit = capsuleBoundaryHitPx(cx, cy, halfW, halfH, Math.cos(θ), Math.sin(θ))
  if (!hit) return { rimX: cx, rimY: cy, ux: 0, uy: -1 }
  return {
    rimX: cx + (hit.x - cx) * radialScale,
    rimY: cy + (hit.y - cy) * radialScale,
    ux: hit.nx,
    uy: hit.ny,
  }
}

/**
 * Seat rim in wrapper %. Seat index 0 at clock top; advances CCW when viewed from above.
 * @param radialScale 1 = on rail outer boundary, < 1 inward toward center.
 */
function venueSeatRimPct(
  seatIndex: number,
  radialScale: number,
  w = 0,
  h = 0,
  target: 'rail' | 'felt' = 'rail'
): { leftPct: number; topPct: number } {
  const aspect = w > 0 && h > 0 ? w / h : VENUE_RING_ASPECT_MD
  const ww = w > 0 ? w : 260 * aspect
  const hh = h > 0 ? h : 260
  const { rimX, rimY } = venueSeatRimPxAndOutwardNormal(seatIndex, ww, hh, radialScale, target)
  return { leftPct: (rimX / ww) * 100, topPct: (rimY / hh) * 100 }
}

/** Polar angle θ for seat i (matches {@link venueSeatRimPct}). */
function seatThetaRad(seatIndex: number): number {
  return (seatIndex / VENUE_SEAT_SLOTS) * 2 * Math.PI - Math.PI / 2
}

/** Nudge pole labels toward beltline (top downward, bottom upward); east/west stay put. */
const SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_MD = 5
const SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_LG = 7

function seatNameLabelVerticalNudgePx(seatIndex: number, size: 'md' | 'lg'): number {
  const amp = size === 'lg' ? SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_LG : SEAT_NAME_LABEL_VERTICAL_NUDGE_PX_MD
  return -Math.sin(seatThetaRad(seatIndex)) * amp
}

type VenueWallBlindSeats = {
  dealerSeatIndex: number | null
  smallBlindSeatIndex: number | null
  bigBlindSeatIndex: number | null
}

function venueTileBlindSeats(row: DisplayVenueTileSnapshot): VenueWallBlindSeats | null {
  if (
    row.dealerSeatIndex === undefined &&
    row.smallBlindSeatIndex === undefined &&
    row.bigBlindSeatIndex === undefined
  ) {
    return null
  }
  return {
    dealerSeatIndex: row.dealerSeatIndex ?? null,
    smallBlindSeatIndex: row.smallBlindSeatIndex ?? null,
    bigBlindSeatIndex: row.bigBlindSeatIndex ?? null,
  }
}

function venueTileActingSeat(row: DisplayVenueTileSnapshot): number | null {
  return venueTileActingSeatIndex(row)
}

function mosaicWagerStyleFlags(
  row: DisplayVenueTileSnapshot,
  waitingOnOthersToAnswer = false
): { showNoMoreBets: boolean; wageringLive: boolean } {
  const ph = String(row.phase ?? '').trim().toLowerCase()
  const showNoMoreBets =
    row.seated >= 1 &&
    ((ph === 'betting' && isVenueTileWageringPaused(row)) ||
      (ph === 'answering' && waitingOnOthersToAnswer))
  const wageringLive =
    ph === 'betting' &&
    row.seated >= 1 &&
    row.isBettingOpen === true &&
    !isVenueTileWageringPaused(row)
  return { showNoMoreBets, wageringLive }
}

/** Seat-marker initials on mosaic felts — font size set from the felt width. */
function mosaicSeatInitialsClass(_density: VenueFloorTableSize | undefined): string {
  return VENUE_FLOOR_MOSAIC_HEADER_TYPE.seatInitials
}

function fallbackLabelEllipseScale(size: 'md' | 'lg', feltStacks: boolean): number {
  if (size === 'lg') return feltStacks ? 1.045 : 1.03
  return feltStacks ? 1.04 : 1.025
}

/** Cupholder size scales with measured felt width via {@link stadiumCupholderSizePx}. */
function seatDotDiameterPx(
  rootRemPx: number,
  size: 'md' | 'lg',
  mosaic = false
): number {
  if (mosaic) return 1.25 * rootRemPx
  if (size !== 'lg') return 1.75 * rootRemPx
  const sm =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(min-width:640px)').matches
  return (sm ? 3.15 : 2.8375) * rootRemPx
}

/**
 * Outward label anchor in wrapper % so labels sit outside seat dots, clear the chip band (lg hero),
 * avoid other seat markers, and spread along the tangent when adjacent names would crowd.
 */
function computeSeatLabelAnchorsPct(args: {
  w: number
  h: number
  size: 'md' | 'lg'
  feltSeatStacks: boolean
  seatNames: string[]
}): ({ leftPct: number; topPct: number } | null)[] {
  const { w, h, size, feltSeatStacks, seatNames } = args
  const empty = () =>
    Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
  if (!(w > 0 && h > 0)) return empty()

  const rootRem =
    typeof document !== 'undefined'
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16
  const dotR = seatDotDiameterPx(rootRem, size) / 2
  /** Half of approx. name block inward toward the felt (smaller = labels sit tighter to the rim). */
  const labelHalfInwardPx =
    size === 'lg' ? (feltSeatStacks ? 14 : 18) : 12
  /** lg hero: chip PNG + bankroll radial band — modest push so names avoid larger stacks nearer the rim. */
  const chipBandClearancePx = feltSeatStacks && size === 'lg' ? 16 : 0
  const padPx = 1
  const neighborDotPadPx = 2
  const estLabelHalfWidthPx =
    size === 'lg' ? Math.min(0.34 * w, 12 * rootRem) / 2 : Math.min(0.5 * w, 8.5 * rootRem) / 2
  const labelPairMinDistPx = 2 * estLabelHalfWidthPx * 0.64 + 2

  const rimCache = Array.from({ length: VENUE_SEAT_SLOTS }, (_, j) =>
    venueSeatRimPxAndOutwardNormal(j, w, h, 1)
  )

  const out = empty()
  const priors: { x: number; y: number }[] = []

  const orderedSeats = Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => i).filter(
    (i) => (seatNames[i]?.trim() ?? '').length > 0
  )

  for (const i of orderedSeats) {
    const { rimX, rimY, ux, uy } = rimCache[i]!
    const tux = -uy
    const tuy = ux

    let dPx = dotR + padPx + labelHalfInwardPx + chipBandClearancePx
    let kTan = 0
    let lx = rimX
    let ly = rimY

    const dotsClear = (xx: number, yy: number) => {
      for (let j = 0; j < VENUE_SEAT_SLOTS; j++) {
        const rj = rimCache[j]!
        if (Math.hypot(xx - rj.rimX, yy - rj.rimY) < dotR + neighborDotPadPx) return false
      }
      return true
    }

    const labelsClear = (xx: number, yy: number) => {
      for (const p of priors) {
        if (Math.hypot(xx - p.x, yy - p.y) < labelPairMinDistPx) return false
      }
      return true
    }

    let placed = false
    for (let step = 0; step < 48 && !placed; step++) {
      lx = rimX + ux * dPx + tux * kTan
      ly = rimY + uy * dPx + tuy * kTan

      if (!dotsClear(lx, ly)) {
        dPx += 2
        continue
      }
      if (labelsClear(lx, ly)) {
        placed = true
        break
      }

      const dir = i % 2 === 0 ? 1 : -1
      kTan += dir * 6
      if (Math.abs(kTan) > 52) {
        kTan = 0
        dPx += 3
      }
    }

    if (!placed) {
      lx = rimX + ux * dPx + tux * kTan
      ly = rimY + uy * dPx + tuy * kTan
    }

    priors.push({ x: lx, y: ly })
    out[i] = { leftPct: (lx / w) * 100, topPct: (ly / h) * 100 }
  }

  return out
}

/**
 * Eight seat positions around the mini felt; optional name chips just outside each chair.
 */
function SeatRingWithLabels({
  seatedCount: _seatedCount,
  seatNames,
  seatBankrolls,
  size = 'md',
  ringMode = 'mosaic',
  feltSeatStacks = false,
  blindSeats = null,
  seatFolded: seatFoldedIn,
  seatInvested: seatInvestedIn,
  seatStacksKnown = false,
  seatPointsOnly: seatPointsOnlyIn,
  actingSeatIndex = null,
  showSeatBettingActions = false,
  seatLastBettingAction: seatLastBettingActionIn,
  actingCallAmount,
  broadcastActionKind = null,
  broadcastActingPlayerName = null,
  broadcastCallAmount = null,
  broadcastLastCall = false,
  mosaicFluidWidth = false,
  /** Honeycomb floor density — drives legible mosaic seat markers on dense grids. */
  mosaicDensity,
  /** Honeycomb floor — shrink-wrap felt height (content-sized rows, no 1fr stretch). */
  mosaicShrinkWrap = false,
  mosaicFillHeight = false,
  mosaicFeltAspectClass,
  mosaicFeltWidthClass,
  mosaicFeltMaxHeightCss,
  mosaicCenterPot = null,
  mosaicStackPx = 0,
  seatSideMarks = null,
  sideLayers,
  mosaicCenterPotClass = '',
  mosaicCenterPotMuted = 'live' as 'dim' | 'faint' | 'live',
  /** Showdown: seat indexes (0-based) that won chip pot / trivia tie — amber rim on mosaic dots. */
  winnerSeatIndexes = null,
  /** Mosaic: hole-card digits per physical seat (parallel to seatNames). */
  seatHoleDigits: seatHoleDigitsIn,
  /** Face-down pairs dealt before the digits are public. */
  seatHolesDealt: seatHolesDealtIn,
  /** Mosaic: community board digits (0–5 cards). */
  communityDigits: communityDigitsIn,
  /** Hide pot / community board while a felt showdown overlay covers the table. */
  suppressFeltCenter = false,
  /** Hide seat chips, names, and hole cards (broadcast showdown). */
  suppressSeatChrome = false,
  /** Rendered inside the felt ring bounds (e.g. broadcast showdown). */
  feltOverlay = null,
  /** Mosaic: wagering street complete on this felt. */
  betsInPaused = false,
  /** Mosaic: per-seat locked trivia answers during answering (numeric; reveal/showdown). */
  seatSubmittedAnswers: seatSubmittedAnswersIn,
  /** Mosaic: boolean lock flags during answering (preferred — no guess leak). */
  seatAnswerLocked: seatAnswerLockedIn,
  answeringPhase = false,
  /** Side-by-side broadcast columns use tighter rim label geometry. */
  broadcastDensity = 'solo' as BroadcastDensity,
  /** Idle mosaic felts: dollar stack outside each occupied cup. */
  showMosaicSeatStacks = false,
}: {
  seatedCount: number
  seatNames: string[]
  seatBankrolls: number[]
  size?: 'md' | 'lg'
  /** `mosaic` = rail + seat dots only (crawl tiles); `full` = names, actions, and felt stacks; `broadcast` = n=1 hero. */
  ringMode?: 'mosaic' | 'full' | 'broadcast'
  /** Honeycomb floor: ring scales with tile width (no fixed 8.75rem height). */
  mosaicFluidWidth?: boolean
  mosaicDensity?: VenueFloorTableSize
  mosaicShrinkWrap?: boolean
  mosaicFillHeight?: boolean
  mosaicFeltAspectClass?: string
  mosaicFeltWidthClass?: string
  mosaicFeltMaxHeightCss?: string
  mosaicCenterPot?: number | null
  /** Painted pot size from the tile's stack token. The board lift uses this, not a taller budget. */
  mosaicStackPx?: number
  /** Every side-pot number each seat can win, parallel to `seatNames`. */
  seatSideMarks?: number[][] | null
  /** Side pots on this felt, labeled by the same number as the seat marks. */
  sideLayers: readonly LiveSidePot[] | undefined
  mosaicCenterPotClass?: string
  mosaicCenterPotMuted?: 'dim' | 'faint' | 'live'
  /** Spotlight hero: draw mini chip stack + bankroll on the felt by each seated player. */
  feltSeatStacks?: boolean
  /** Dealer / blind roles (indexes match `seatNames`). Null when unsupported or omitted by server snapshot. */
  blindSeats?: VenueWallBlindSeats | null
  /** Folded seats this hand (same indexing as `seatNames`); absent means none. */
  seatFolded?: boolean[]
  /** Chips committed this hand. Used with a known zero stack to mark all-in. */
  seatInvested?: number[]
  /** False when the snapshot omitted stacks, so a padded zero is not all-in. */
  seatStacksKnown?: boolean
  /** Busted (points-only) seats — hide chip stack graphic. */
  seatPointsOnly?: boolean[]
  /** Pulse this seat rim during open betting; null hides. Matches `seatNames` index. */
  actingSeatIndex?: number | null
  /** While wagering: show each seat’s latest check / call / raise / fold / all-in this street. */
  showSeatBettingActions?: boolean
  /** Parallel to `seatNames`; from server `seatLastBettingAction`. */
  seatLastBettingAction?: (SeatBettingAction | null)[]
  /** Active seat only: chips to call (venue snapshot). */
  actingCallAmount?: number | null
  /** Broadcast hero: pot action line on felt (replaces status band). */
  broadcastActionKind?: MosaicTableStatusBandKind | null
  broadcastActingPlayerName?: string | null
  broadcastCallAmount?: number | null
  broadcastLastCall?: boolean
  winnerSeatIndexes?: ReadonlySet<number> | null
  seatHoleDigits?: (readonly [number, number] | null)[]
  seatHolesDealt?: boolean[]
  communityDigits?: number[]
  suppressFeltCenter?: boolean
  suppressSeatChrome?: boolean
  feltOverlay?: ReactNode
  betsInPaused?: boolean
  seatSubmittedAnswers?: (number | null)[]
  seatAnswerLocked?: boolean[]
  answeringPhase?: boolean
  broadcastDensity?: BroadcastDensity
  showMosaicSeatStacks?: boolean
}) {
  const seatFolded = padSeatFolded(seatFoldedIn)
  const seatPointsOnly = padSeatPointsOnly(seatPointsOnlyIn)
  const seatLastBettingAction = padSeatLastBettingAction(seatLastBettingActionIn)
  const seatHoleDigits = padSeatHoleDigits(seatHoleDigitsIn)
  const seatHolesDealt = padSeatHolesDealt(seatHolesDealtIn)
  const seatSubmittedAnswers = padSeatSubmittedAnswers(seatSubmittedAnswersIn)
  const seatAnswerLocked = padSeatAnswerLocked(seatAnswerLockedIn)
  const communityDigits = digitsAscending(
    communityDigitsIn?.filter((d) => Number.isInteger(d) && d >= 0 && d <= 9) ?? [],
  )
  const prefersReducedMotion = usePrefersReducedMotion()
  const isMosaic = ringMode === 'mosaic'
  const isBroadcast = ringMode === 'broadcast'
  const isDualBroadcast = isBroadcast && broadcastDensity === 'dual'
  /** Spotlight / broadcast hero — wide capsule; mosaic tiles use smaller md ring below. */
  const lgRing = isBroadcast
    ? isDualBroadcast
      ? 'venue-broadcast-felt relative mx-auto aspect-[14/8] h-auto max-h-full w-full min-h-0'
      : 'venue-broadcast-felt relative mx-auto aspect-[14/8] h-full max-h-full w-auto max-w-full min-h-0 shrink-0'
    : 'mx-auto aspect-[14/8] h-auto max-h-[min(min(68svh,57dvh),36rem)] w-[min(100%,calc(100dvw-2.5rem),68rem)] max-w-full shrink-0'
  /** Mosaic crawl — stadium capsule; fit cell with width-first sizing so aspect ratio holds. */
  const mdRing = isMosaic
    ? mosaicFluidWidth
      ? mosaicFillHeight
        ? `relative mx-auto aspect-[17/10] h-auto w-full max-h-full max-w-full min-h-0 min-w-0`
        : mosaicShrinkWrap
          ? `relative ${mosaicFeltAspectClass ?? 'aspect-[17/10]'} h-auto shrink-0 ${
              mosaicFeltMaxHeightCss != null
                ? `mx-auto ${mosaicFeltWidthClass ?? 'w-auto max-w-[88%]'}`
                : mosaicFeltWidthClass ?? VENUE_FLOOR_MOSAIC_FELT_WIDTH_CLASS
            }`
          : 'relative mx-auto aspect-[8/5] h-auto w-full max-h-full max-w-full min-h-0 min-w-0'
      : 'relative mx-auto aspect-[8/5] h-[8.75rem] w-full max-w-[16.5rem] shrink-0'
    : 'mx-auto aspect-[13/8] h-auto w-full max-w-[min(100%,22rem)] shrink-0 sm:max-w-[min(100%,23rem)]'
  const wrap = isBroadcast ? lgRing : size === 'lg' ? lgRing : mdRing
  const ringWrapStyle =
    isMosaic && mosaicFeltMaxHeightCss != null && !mosaicFillHeight
      ? ({ maxHeight: mosaicFeltMaxHeightCss } as CSSProperties)
      : undefined
  const labelClass =
    size === 'lg'
      ? 'max-w-[min(12rem,34vw)] text-[1.125rem] leading-tight sm:text-[1.3rem] sm:leading-snug md:text-[1.5625rem]'
      : 'max-w-[min(7.125rem,46%)] text-[0.6875rem] leading-tight sm:max-w-[min(7.75rem,48%)] sm:text-xs md:text-sm'

  /** Bankroll stack on felt — stadium radial toward the pot. */
  const chipInnerScale = STADIUM_CHIP_STACK_RADIAL

  const ringElRef = useRef<HTMLDivElement>(null)
  const [ringPx, setRingPx] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ringElRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const apply = () => {
      const r = el.getBoundingClientRect()
      if (mosaicFillHeight) {
        const stage = el.parentElement?.parentElement
        const stageStyle = stage ? getComputedStyle(stage) : null
        const padTop = stageStyle ? Number.parseFloat(stageStyle.paddingTop) || 0 : 0
        const padBottom = stageStyle ? Number.parseFloat(stageStyle.paddingBottom) || 0 : 0
        const laneEl = stage?.querySelector(':scope > .vfd-mosaic-side-lane')
        const laneH = laneEl instanceof HTMLElement ? laneEl.offsetHeight : 0
        const width = mosaicFeltFillWidthPx(
          stage?.clientWidth ?? 0,
          stage?.clientHeight ?? 0,
          padTop + padBottom,
          laneH,
        )
        if (width > 0 && el.style.width !== `${width}px`) {
          el.style.width = `${width}px`
          return
        }
      }
      if (r.width > 0 && r.height > 0)
        setRingPx((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }))
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    const stage = el.parentElement?.parentElement
    if (stage) ro.observe(stage)
    return () => {
      ro.disconnect()
      el.style.width = ''
    }
  }, [mosaicFillHeight])

  const labelAnchorsPct = useMemo(() => {
    if (isMosaic) {
      return Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
    }
    if (isBroadcast) {
      const empty = Array.from({ length: VENUE_SEAT_SLOTS }, () => null as { leftPct: number; topPct: number } | null)
      const { w, h } = ringPx
      if (!(w > 0 && h > 0)) return empty
      const cupPx = Math.round(stadiumCupholderSizePx(w) * 1.2)
      const labelOutwardPx =
        broadcastDensity === 'dual'
          ? Math.max(16, Math.round(Math.min(w, h) * 0.06))
          : cupPx * 0.72 + (feltSeatStacks ? 32 : 22)
      return Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
        if (!(seatNames[i]?.trim() ?? '')) return null
        const rimClusterExtra =
          feltSeatStacks && broadcastDensity !== 'dual' ? Math.round(cupPx * 0.26) : 0
        return mosaicSeatLabelPct(i, w, h, labelOutwardPx + rimClusterExtra)
      })
    }
    return computeSeatLabelAnchorsPct({
      w: ringPx.w,
      h: ringPx.h,
      size,
      feltSeatStacks,
      seatNames,
    })
  }, [broadcastDensity, feltSeatStacks, isBroadcast, isMosaic, ringPx.h, ringPx.w, seatNames, size])

  const rimW = ringPx.w
  const rimH = ringPx.h
  const mosaicDensityTier = mosaicDensity as StadiumMosaicDensity | undefined
  const cupSizePx = isMosaic
    ? stadiumMosaicCupholderSizePx(rimW, mosaicDensityTier)
    : isBroadcast
      ? Math.round(stadiumCupholderSizePx(rimW) * 1.2)
      : stadiumCupholderSizePx(rimW)
  const holeCardScale = isMosaic
    ? stadiumMosaicHoleCardScale(rimW, mosaicDensityTier)
    : stadiumHoleCardScale(rimW)
  const mosaicHoleCardW = isMosaic
    ? mosaicHoleCardFitPx(stadiumMosaicHoleCardWidthPx(rimW, mosaicDensityTier), rimH)
    : 0
  const mosaicHoleCardH = isMosaic
    ? mosaicHoleCardFitPx(stadiumMosaicHoleCardHeightPx(rimW, mosaicDensityTier), rimH)
    : 0
  const mosaicHoleCardOverlap = isMosaic
    ? stadiumMosaicHoleCardOverlapPx(mosaicHoleCardW)
    : 0
  const mosaicPotFontCap =
    isMosaic && rimW > 0 && rimH > 0 && mosaicCenterPot != null
      ? mosaicPotFontPx(rimW, rimH, mosaicStackPx > 0 ? mosaicStackPx : 48, formatVenueBankroll(mosaicCenterPot))
      : null
  const mosaicCommunityBoard = isMosaic
    ? mosaicCommunityBoardPx(
        mosaicStreetCardBoxPx(rimW, mosaicDensityTier),
        rimW,
        rimH,
        mosaicPotFontCap ?? 0,
      )
    : null
  const mosaicCommunityCardW = mosaicCommunityBoard?.widthPx ?? 0
  const mosaicCommunityCardH = mosaicCommunityBoard?.heightPx ?? 0
  /** Physical seat slots (0–7) on the stadium artwork. */
  const seatCountForLayout = VENUE_SEAT_SLOTS

  const potFromBroadcast = isBroadcast ? mosaicCenterPot : null
  const broadcastCommunityLayout =
    isBroadcast && rimW > 0
      ? broadcastCommunityCardLayoutPx(rimW, isDualBroadcast ? 'dual' : 'solo')
      : null
  const broadcastCommunityCardW = broadcastCommunityLayout?.widthPx ?? 0
  const broadcastCommunityCardH = broadcastCommunityLayout?.heightPx ?? 0
  const dualHoleCardBox = isDualBroadcast ? dualBroadcastHoleCardBoxPx(rimW) : null
  const soloHoleSplay = soloBroadcastHoleCardSplay(holeCardScale)

  const showFeltBoardCenter =
    !suppressFeltCenter &&
    ((isMosaic && (communityDigits.length > 0 || mosaicCenterPot != null)) ||
      (isBroadcast &&
        (communityDigits.length > 0 ||
          broadcastActionKind != null ||
          potFromBroadcast != null)))

  const layoutReady = rimW > 0 && rimH > 0
  const mosaicStackSeats = seatNames.reduce(
    (n, name, i) => n + (name?.trim() && seatPointsOnly[i] !== true ? 1 : 0),
    0
  )
  const mosaicStackFontPx = mosaicSeatStackFontPx(rimW, mosaicStackSeats, rimH)
  const mosaicStackClearPx = mosaicSeatStackClearPx(cupSizePx, mosaicSeatInitialFontPx(rimW))

  return (
    <div
      ref={ringElRef}
      className={`${isMosaic ? '@container' : ''} relative ${
        isDualBroadcast ? 'venue-broadcast-dual-frame overflow-hidden' : 'overflow-visible'
      } ${wrap}`}
      style={ringWrapStyle}
    >
      <div className={isDualBroadcast ? 'venue-broadcast-dual-stage' : 'absolute inset-0'}>
      <div className="absolute inset-0" aria-hidden>
        <PokerTableGraphic
          className={`h-full w-full drop-shadow-md ${
            isMosaic && betsInPaused ? 'brightness-[0.72] saturate-[0.45]' : ''
          }`}
        />
      </div>
      {isMosaic && betsInPaused ? (
        <div
          className="pointer-events-none absolute inset-0 z-[11] bg-emerald-500/12"
          aria-hidden
        />
      ) : null}
      {showFeltBoardCenter ? (
        isBroadcast ? (
          <VenueBroadcastCenterStack
            pot={potFromBroadcast ?? 0}
            potMuted={mosaicCenterPotMuted}
            actionKind={broadcastActionKind}
            actingPlayerName={broadcastActingPlayerName}
            callAmount={broadcastCallAmount}
            lastCall={broadcastLastCall}
            communityDigits={communityDigits}
            communityCardWidthPx={broadcastCommunityCardW}
            communityCardHeightPx={broadcastCommunityCardH}
            communityBoardGapPx={broadcastCommunityLayout?.boardGapPx ?? 0}
            communityCardGapPx={broadcastCommunityLayout?.gapPx ?? 0}
            prefersReducedMotion={prefersReducedMotion}
            rimW={rimW}
            density={isDualBroadcast ? 'dual' : 'solo'}
            sides={isDualBroadcast ? sideLayers : undefined}
          />
        ) : (
          <VenueMosaicFeltCenterStack
            communityDigits={communityDigits}
            communityCardWidthPx={mosaicCommunityCardW}
            communityCardHeightPx={mosaicCommunityCardH}
            pot={mosaicCenterPot}
            potClass={mosaicCenterPotClass}
            potMuted={mosaicCenterPotMuted}
            potFontCapPx={mosaicPotFontCap}
            boardLiftPx={mosaicCommunityBoard?.liftPx ?? 0}
            potDropPx={communityDigits.length > 0 ? (mosaicCommunityBoard?.potDropPx ?? 0) : 0}
            prefersReducedMotion={prefersReducedMotion}
          />
        )
      ) : null}
      {layoutReady &&
        Array.from({ length: VENUE_SEAT_SLOTS }, (_, i) => {
        const raw = seatNames[i]?.trim() ?? ''
        const filled = raw.length > 0
        if ((isMosaic || isBroadcast) && !filled) return null
        if (!publicFeltDrawsSeat(seatPointsOnly[i] === true)) return null
        if (suppressSeatChrome && isBroadcast) return null

        const seatRimPt =
          isMosaic || isBroadcast
            ? mosaicSeatDotPct(i, seatCountForLayout, rimW, rimH)
            : (() => {
                const pt = stadiumSeatPointPx(
                  i,
                  seatCountForLayout,
                  rimW,
                  rimH,
                  STADIUM_CUPHOLDER_RADIAL
                )
                return { leftPct: pt.leftPct, topPct: pt.topPct }
              })()
        const chipInwardFrac = mosaicSeatChipInwardFrac(i)
        const holeInwardFrac = isMosaic
          ? mosaicHoleClearOfInitialsFrac(i, rimW, rimH)
          : isDualBroadcast
            ? DUAL_BROADCAST_HOLE_INWARD_FRAC
            : mosaicSeatHoleInwardFrac(i)
        const broadcastMarkerPx =
          isBroadcast && rimW > 0
            ? venueBlindMarkerSizePx(rimW, 'broadcast', isDualBroadcast ? 'dual' : 'solo')
            : 0
        const broadcastAssets =
          isBroadcast && rimW > 0 && rimH > 0
            ? broadcastFeltAssetAnchors(
                i,
                rimW,
                rimH,
                broadcastMarkerPx,
                isDualBroadcast ? 'dual' : 'solo',
              )
            : null
        const chipPt =
          isMosaic || isBroadcast
            ? mosaicSeatHoleLayout(
                i,
                seatCountForLayout,
                rimW,
                rimH,
                chipInwardFrac
              )
            : stadiumSeatPointPx(i, seatCountForLayout, rimW, rimH, chipInnerScale)
        const chipPosRaw = { leftPct: chipPt.leftPct, topPct: chipPt.topPct }
        const chipPos = broadcastAssets ? broadcastAssets.chip : chipPosRaw
        const holeLayoutRaw =
          isMosaic || isBroadcast
            ? mosaicSeatHoleLayout(
                i,
                seatCountForLayout,
                rimW,
                rimH,
                holeInwardFrac
              )
            : (() => {
                const pt = stadiumSeatPointPx(
                  i,
                  seatCountForLayout,
                  rimW,
                  rimH,
                  STADIUM_HOLE_CARDS_RADIAL
                )
                return {
                  leftPct: pt.leftPct,
                  topPct: pt.topPct,
                  rotateDeg: pt.rotateDeg,
                }
              })()
        const holeLayout = !isDualBroadcast && broadcastAssets ? broadcastAssets.hole : holeLayoutRaw
        const anchored = labelAnchorsPct[i]
        const fb = fallbackLabelEllipseScale(size, Boolean(feltSeatStacks && (size === 'lg' || isBroadcast)))
        const fallbackPos = venueSeatRimPct(i, fb, rimW, rimH)
        const labelPos = anchored ?? fallbackPos
        const chips = seatBankrolls[i] ?? 0
        const isFolded = filled && seatFolded[i] === true
        const isBusted = filled && seatPointsOnly[i] === true
        const isAllIn = mosaicSeatIsAllIn({
          stacksKnown: seatStacksKnown,
          bankroll: chips,
          invested: seatInvestedIn?.[i] ?? 0,
          folded: isFolded,
          pointsOnly: isBusted,
        })
        const mosaicInitials = isMosaic ? mosaicSeatInitialLabel(raw, isBusted) : ''
        const isActing =
          filled && actingSeatIndex != null && actingSeatIndex === i && !isFolded && !isBusted
        const showFeltStack = Boolean(
          raw &&
            !isFolded &&
            !isBusted &&
            ((feltSeatStacks && size === 'lg') || isBroadcast)
        )
        const broadcastChipLayout =
          isBroadcast && rimW > 0 && filled && !isBusted
            ? broadcastChipStackLayoutPx(rimW, isDualBroadcast ? 'dual' : 'solo')
            : null
        const broadcastRimStack = isBroadcast && filled && !isBusted
        const broadcastRimStackInwardPx =
          broadcastRimStack && broadcastChipLayout
            ? broadcastRimStackOffsetPx(i, broadcastChipLayout.fontPx, isDualBroadcast ? 'dual' : 'solo')
            : 0
        const broadcastStackPos =
          broadcastRimStack && broadcastRimStackInwardPx > 0 && rimW > 0 && rimH > 0
            ? broadcastRimStackPct(i, labelPos, rimW, rimH, broadcastRimStackInwardPx)
            : null
        const rimDisplayName = isBroadcast ? formatVenueDisplayPlayerName(raw) : raw
        const labelVy = isBroadcast ? 0 : seatNameLabelVerticalNudgePx(i, size)
        const broadcastLabelMaxWidthPx =
          isBroadcast && rimW > 0 ? broadcastRimLabelMaxWidthPx(rimW, broadcastDensity) : null
        const broadcastLabelTransform =
          isBroadcast && rimW > 0 && rimH > 0
            ? broadcastRimLabelTransform(labelPos, rimW, rimH, broadcastDensity, labelVy)
            : `translate(-50%, calc(-50% + ${labelVy}px))`
        const lastBetAct =
          showSeatBettingActions && filled ? seatLastBettingAction[i] ?? null : null
        const showFoldOut = isFolded && !(showSeatBettingActions && lastBetAct === 'fold')
        const broadcastFoldOutLayout =
          isBroadcast && showFoldOut && rimW > 0
            ? broadcastFoldOutBadgePx(rimW, isDualBroadcast ? 'dual' : 'solo')
            : null
        const answerLocked =
          filled &&
          answeringPhase &&
          !isFolded &&
          (seatAnswerLocked[i] === true || seatSubmittedAnswers[i] != null)
        const isWinner =
          filled &&
          !isFolded &&
          winnerSeatIndexes != null &&
          winnerSeatIndexes.has(i)
        const showActingCallLine =
          isActing &&
          showSeatBettingActions &&
          actingCallAmount != null &&
          typeof actingCallAmount === 'number'
        const showActionPanel =
          !isBroadcast && Boolean(lastBetAct != null || showActingCallLine)
        /** Below the name/stack cluster — keeps CHECK / CALL off the felt center. */
        const actionPanelBelowPx =
          (size === 'lg' ? 44 : 36) + (feltSeatStacks && size === 'lg' ? 10 : 0)
        const mosaicStack =
          isMosaic && showMosaicSeatStacks && filled && !isBusted
            ? mosaicSeatStackPlacement(i, rimW, rimH, mosaicStackSeats, mosaicStackClearPx)
            : null
        const actingSoftPulse =
          'pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/12 motion-reduce:hidden motion-safe:animate-pulse'
        const broadcastActingGlow =
          'pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/30 ring-[3px] ring-amber-300/75 motion-reduce:hidden motion-safe:animate-pulse shadow-[0_0_28px_rgba(251,191,36,0.55)]'
        return (
          <div key={i}>
            <div
              className={`absolute flex items-center justify-center ${SEAT_LAYER_DOT}`}
              style={{
                left: `${seatRimPt.leftPct}%`,
                top: `${seatRimPt.topPct}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isActing && !prefersReducedMotion ? (
                <>
                  <span
                    aria-hidden
                    className={`${isBroadcast ? broadcastActingGlow : actingSoftPulse} motion-safe:[animation-duration:2.8s]`}
                    style={{
                      width: cupSizePx * (isBroadcast ? 2.35 : 1.15),
                      height: cupSizePx * (isBroadcast ? 2.35 : 1.15),
                    }}
                  />
                  {isBroadcast ? (
                    <span
                      aria-hidden
                      className={`${actingSoftPulse} motion-safe:[animation-duration:1.6s]`}
                      style={{ width: cupSizePx * 1.55, height: cupSizePx * 1.55 }}
                    />
                  ) : null}
                </>
              ) : answerLocked && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} bg-cyan-400/20 motion-safe:[animation-duration:2.2s]`}
                  style={{ width: cupSizePx * 1.15, height: cupSizePx * 1.15 }}
                />
              ) : isWinner && !prefersReducedMotion ? (
                <span
                  aria-hidden
                  className={`${actingSoftPulse} bg-amber-400/18 motion-safe:[animation-duration:3.2s]`}
                  style={{ width: cupSizePx * 1.15, height: cupSizePx * 1.15 }}
                />
              ) : null}
              <SeatCupholderMarker
                sizePx={cupSizePx}
                label={
                  isMosaic && filled
                    ? (
                      <MosaicSeatFace
                        initials={mosaicInitials}
                        marks={sideMarkAt(seatSideMarks, i)}
                        folded={isFolded}
                        allIn={isAllIn}
                        seatIndex={i}
                      />
                    )
                    : undefined
                }
                labelClassName={mosaicSeatInitialsClass(mosaicDensity)}
                labelFontSizePx={isMosaic ? mosaicSeatInitialFontPx(rimW, rimH) : undefined}
                labelFree={isMosaic}
                labelShiftXPx={
                  isMosaic
                    ? mosaicSeatInitialShiftXPx(i, rimW, rimH, mosaicSeatInitialFontPx(rimW, rimH))
                    : undefined
                }
                state={
                  isFolded
                    ? 'folded'
                    : isActing
                      ? 'acting'
                      : answerLocked
                        ? 'answerLocked'
                        : isWinner
                          ? 'winner'
                          : 'default'
                }
                aria-label={
                  raw
                    ? [
                        raw,
                        isActing ? 'has the wagering turn' : null,
                        answerLocked ? 'answer locked in' : null,
                        isWinner ? 'won the hand' : null,
                        isFolded ? 'folded' : null,
                        isAllIn ? 'all-in' : null,
                        showActingCallLine
                          ? formatActingCallHint(actingCallAmount ?? 0)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : `Seat ${i + 1}, empty`
                }
              />
            </div>
            {mosaicStack != null ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_NAME_CLUSTER} whitespace-nowrap`}
                style={{
                  left: `${mosaicStack.leftPct}%`,
                  top: `${mosaicStack.topPct}%`,
                  transform: mosaicStack.transform,
                }}
              >
                <MosaicSeatStackAmount
                  name={raw}
                  amount={chips}
                  fontPx={mosaicSeatStackFontForAmount(mosaicStackFontPx, chips)}
                />
              </div>
            ) : null}
            {publicSeatShowsHoleCards(
              filled,
              isFolded,
              isBusted,
              seatHoleDigits[i] != null || seatHolesDealt[i] === true,
            ) ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_FELT_HOLE}`}
                style={{
                  left: `${holeLayout.leftPct}%`,
                  top: `${holeLayout.topPct}%`,
                  transform:
                    isMosaic || isDualBroadcast ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)',
                }}
                aria-label="Two hole cards"
              >
                {isMosaic || dualHoleCardBox != null ? (
                  <MosaicHoleCardPair
                    rotateDeg={holeLayout.rotateDeg}
                    cardWidthPx={isMosaic ? mosaicHoleCardW : (dualHoleCardBox?.widthPx ?? 0)}
                    cardHeightPx={isMosaic ? mosaicHoleCardH : (dualHoleCardBox?.heightPx ?? 0)}
                    overlapPx={isMosaic ? mosaicHoleCardOverlap : (dualHoleCardBox?.overlapPx ?? 0)}
                  />
                ) : (
                  <FeltHoleCardPair
                    rotateDeg={holeLayout.rotateDeg}
                    scale={holeCardScale}
                    fanDeg={soloHoleSplay.fanDeg}
                    overlapPx={soloHoleSplay.overlapPx}
                    faceDown
                    digits={seatHoleDigits[i]}
                  />
                )}
              </div>
            ) : null}
            {isMosaic ? null : (() => {
              if (blindSeats == null) return null
              const markerSizePx = venueBlindMarkerSizePx(
                rimW,
                isBroadcast ? 'broadcast' : size === 'lg' ? 'lg' : 'md'
              )
              const markers = heroSeatBlindMarkerPills(i, blindSeats, 'onFelt', markerSizePx)
              if (markers.length === 0) return null
              const blindPt = broadcastAssets
                ? broadcastAssets.blind
                : isBroadcast
                  ? broadcastBlindMarkerPct(i, seatCountForLayout, rimW, rimH, markerSizePx)
                  : stadiumSeatPointPx(
                      i,
                      seatCountForLayout,
                      rimW,
                      rimH,
                      STADIUM_BLIND_BADGE_RADIAL
                    )
              return (
                <div
                  className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]`}
                  style={{
                    left: `${blindPt.leftPct}%`,
                    top: `${blindPt.topPct}%`,
                    transform: 'translate(-50%, -50%)',
                    gap: Math.max(2, Math.round(markerSizePx * 0.1)),
                  }}
                >
                  {markers}
                </div>
              )
            })()}
            {!isMosaic && showFoldOut && raw ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_BLIND_OUT} flex flex-col items-center`}
                style={
                  isBroadcast && broadcastFoldOutLayout
                    ? (() => {
                        const outPt = broadcastBlindMarkerPct(
                          i,
                          seatCountForLayout,
                          rimW,
                          rimH,
                          broadcastFoldOutLayout.minWidthPx,
                          'counterclockwise'
                        )
                        return {
                          left: `${outPt.leftPct}%`,
                          top: `${outPt.topPct}%`,
                          transform: 'translate(-50%, -50%)',
                        }
                      })()
                    : {
                        left: `${chipPt.leftPct}%`,
                        top: `${chipPt.topPct}%`,
                        transform: 'translate(-50%, -50%)',
                      }
                }
              >
                <span
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md border font-black uppercase leading-none tracking-wide text-rose-50 shadow-[0_2px_10px_rgba(0,0,0,0.75)] ${
                    broadcastFoldOutLayout
                      ? 'border-rose-200/90 bg-gradient-to-b from-rose-500 to-rose-950'
                      : `border-rose-300/90 bg-rose-950/95 shadow-[0_1px_4px_rgba(0,0,0,0.85)] ${
                          size === 'lg' ? 'px-1.5 py-0.5 text-[8px] sm:text-[9px]' : 'px-[3px] py-px text-[7px] sm:text-[8px]'
                        }`
                  }`}
                  style={
                    broadcastFoldOutLayout
                      ? {
                          fontSize: `${broadcastFoldOutLayout.fontPx}px`,
                          padding: `${broadcastFoldOutLayout.padYPx}px ${broadcastFoldOutLayout.padXPx}px`,
                          minWidth: `${broadcastFoldOutLayout.minWidthPx}px`,
                        }
                      : undefined
                  }
                >
                  Out
                </span>
              </div>
            ) : null}
            {!isMosaic && showFeltStack ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_FELT_CHIP_PILE} flex flex-col items-center gap-0.5 px-0.5 ${
                  isFolded ? 'opacity-45' : 'opacity-95'
                }`}
                style={{
                  left: `${chipPos.leftPct}%`,
                  top: `${chipPos.topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <img
                  src={seatChipStackImg}
                  alt=""
                  width={96}
                  height={72}
                  draggable={false}
                  className={`pointer-events-none w-auto shrink-0 select-none object-contain opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] ${
                    isBroadcast
                      ? ''
                      : 'h-[2.6925rem] max-w-[4.6rem] sm:h-[3.0875rem] sm:max-w-[5.35rem]'
                  }`}
                  style={
                    broadcastChipLayout
                      ? {
                          height: `${broadcastChipLayout.heightPx}px`,
                          maxWidth: `${broadcastChipLayout.maxWidthPx}px`,
                        }
                      : undefined
                  }
                />
                {!broadcastRimStack ? (
                <span
                  className={`max-w-[10rem] text-center font-mono font-extrabold leading-tight tabular-nums tracking-tight text-amber-50 sm:max-w-[11rem] [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.85)] ${
                    isBroadcast ? '' : 'text-[1.16rem] sm:text-[1.26rem] md:text-[1.315rem]'
                  }`}
                  style={
                    broadcastChipLayout
                      ? {
                          fontSize: `${broadcastChipLayout.fontPx}px`,
                          maxWidth: `${Math.round(broadcastChipLayout.maxWidthPx * 1.65)}px`,
                        }
                      : undefined
                  }
                >
                  <ChipText text={formatVenueBankroll(chips)} />
                </span>
                ) : null}
              </div>
            ) : null}
            {!isMosaic && raw ? (
              <>
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_NAME_CLUSTER} text-center font-semibold leading-tight shadow-black/80 drop-shadow ${
                  isBroadcast
                    ? `vfd-broadcast-rim-name${
                        isActing ? ' vfd-broadcast-rim-name--acting font-black text-amber-100' : ''
                      }`
                    : labelClass
                } ${
                  isFolded ? (isBroadcast ? 'text-white/78' : 'text-white/60') : 'text-white/92'
                }`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: broadcastLabelTransform,
                  ...(broadcastLabelMaxWidthPx != null
                    ? { maxWidth: `${broadcastLabelMaxWidthPx}px` }
                    : {}),
                }}
              >
                <span
                  className={`block max-w-full truncate ${isFolded ? 'line-through decoration-rose-300/85 decoration-2' : ''}`}
                >
                  {withSidePotMark(rimDisplayName, sideMarkAt(seatSideMarks, i))}
                </span>
                {!isBusted && !broadcastRimStack && !(feltSeatStacks && size === 'lg') ? (
                  <span
                    className={`mt-0.5 block max-w-full truncate font-mono tabular-nums text-[0.625rem] sm:text-[0.6875rem] md:text-xs lg:text-sm ${
                      isFolded ? 'text-white/40' : 'text-casino-emerald'
                    }`}
                  >
                    <ChipText text={formatVenueBankroll(chips)} />
                  </span>
                ) : null}
              </div>
              {broadcastRimStack && broadcastStackPos ? (
                <div
                  className={`pointer-events-none absolute ${SEAT_LAYER_NAME_CLUSTER} text-center`}
                  style={{
                    left: `${broadcastStackPos.leftPct}%`,
                    top: `${broadcastStackPos.topPct}%`,
                    transform: broadcastLabelTransform,
                    ...(broadcastLabelMaxWidthPx != null
                      ? { maxWidth: `${broadcastLabelMaxWidthPx}px` }
                      : {}),
                  }}
                >
                  <span
                    className={`vfd-broadcast-rim-stack max-w-full truncate font-mono font-extrabold tabular-nums tracking-tight text-amber-50 [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.85)] ${
                      isFolded ? 'text-white/45' : ''
                    }`}
                    style={
                      broadcastChipLayout
                        ? { fontSize: `${broadcastChipLayout.fontPx}px` }
                        : undefined
                    }
                  >
                    <ChipText text={formatVenueBankroll(chips)} />
                  </span>
                </div>
              ) : null}
              </>
            ) : null}
            {!isMosaic && raw && showActionPanel ? (
              <div
                className={`pointer-events-none absolute ${SEAT_LAYER_ACTION_PANEL} flex flex-col items-center gap-1 text-center`}
                style={{
                  left: `${labelPos.leftPct}%`,
                  top: `${labelPos.topPct}%`,
                  transform: `translate(-50%, calc(-50% + ${labelVy + actionPanelBelowPx}px))`,
                }}
              >
                {showActingCallLine ? (
                  <span
                    className={
                      size === 'lg'
                        ? 'max-w-[min(100vw-2rem,20rem)] whitespace-normal rounded-lg border-2 border-amber-300/45 bg-neutral-950/95 px-2.5 py-1.5 text-sm font-bold tabular-nums leading-snug text-amber-50 shadow-md ring-1 ring-amber-400/25 sm:text-base'
                        : 'max-w-[min(90vw,12rem)] whitespace-normal rounded-md border-2 border-amber-300/35 bg-neutral-950/95 px-2 py-1 text-[0.65rem] font-bold tabular-nums leading-snug text-amber-50 shadow-md sm:text-xs'
                    }
                  >
                    <ChipText text={formatActingCallHint(actingCallAmount ?? 0)} />
                  </span>
                ) : null}
                {lastBetAct != null ? (
                  <span
                    className={`max-w-full truncate border-2 px-1.5 py-0.5 font-black uppercase leading-tight tracking-wide shadow-md ${
                      size === 'lg'
                        ? 'text-sm sm:text-base md:text-lg'
                        : 'text-[0.7rem] sm:text-xs md:text-sm'
                    } ${seatBettingActionPillClass(lastBetAct)}`}
                  >
                    {seatBettingActionLabel(lastBetAct)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
      {feltOverlay}
      </div>
    </div>
  )
}

type VenueMosaicTableCardProps = {
  row: DisplayVenueTileSnapshot
  /** Winner line only (dense floor with many tables). */
  hideShowdownResults?: boolean
  /** Row-driven felt density from {@link venueFloorSizeSpec}. */
  floorSize: VenueFloorSizeSpec
  /** Honeycomb floor — do not stretch card height to fill a row slot. */
  floorHoneycomb?: boolean
  /** Fill-height grid — stretch card and felt to the row slot. */
  floorFillHeight?: boolean
  /** Single-row floor — card height follows felt content, not viewport. */
  shrinkWrapRowHeight?: boolean
  prefersReducedMotion?: boolean
  /** Slightly dim answering tiles while other felts are still in open wagering. */
  dimAnsweringEarly?: boolean
  /** Venue-wide authoritative answer — overrides per-tile `showdownAnswer` when set. */
  sharedShowdownAnswer?: number
  /** Mosaic typography from resolved floor spec. */
  mosaicTypography: VenueFloorMosaicTypography
  /** Authoritative floor spec — typography tier, showdown density, tile chrome. */
  floorSpec: VenueFloorSpec
}

function VenueMosaicTableCard({
  row,
  hideShowdownResults = false,
  floorSize,
  floorHoneycomb = false,
  floorFillHeight = false,
  shrinkWrapRowHeight = false,
  prefersReducedMotion = false,
  dimAnsweringEarly = false,
  sharedShowdownAnswer,
  mosaicTypography,
  floorSpec,
}: VenueMosaicTableCardProps) {
  const tileRef = useRef<HTMLElement>(null)
  const [tilePx, setTilePx] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = tileRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const apply = () => {
      const r = el.getBoundingClientRect()
      const ww = r.width
      const hh = r.height
      if (ww > 0 && hh > 0)
        setTilePx((prev) => (prev.w === ww && prev.h === hh ? prev : { w: ww, h: hh }))
    }

    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tileTypographyStyle = useMemo(
    () =>
      venueMosaicTileTypographyStyle(
        floorSpec.mosaicTypographyTier,
        tilePx.w,
        floorSize.size
      ),
    [floorSpec.mosaicTypographyTier, tilePx.w, floorSize.size]
  )
  const tn = row.tableNum
  const seats = row.seated
  const { pot, marks: seatSideMarks, sides } = shownFeltPot(
    row.pot,
    row.seatInvested,
    row.seatFolded,
    row.seatBankrolls,
    row.seatPointsOnly,
    row.seatBankrolls != null,
  )
  const tileFrame = mosaicTileFrame(tilePx.w, tilePx.h)
  const feltReserve = mosaicFeltReservePx(tileFrame, tilePx.w, tilePx.h)
  const cornerDockPx = mosaicCornerDockPx(
    floorSpec.populatedTableCount,
    tilePx.h > 0 ? mosaicReadablePlaqueMetrics(tilePx.w, tilePx.h, 1, 0).heightPx : 0,
  )
  const shownSideCount = mosaicSidePotsThatFit(sides.length, tilePx.w, tilePx.h)
  const shownSides = sides.slice(0, shownSideCount)
  const hiddenSideCount = Math.max(0, sides.length - shownSides.length)
  const plaqueSlots = shownSides.length + (hiddenSideCount > 0 ? 1 : 0)
  const plaqueMetrics =
    tilePx.w > 0 && plaqueSlots > 0
      ? mosaicReadablePlaqueMetrics(tilePx.w, tilePx.h, plaqueSlots, 0)
      : undefined
  const shownMarks = seatSideMarks.map((seat) => seat.filter((mark) => mark <= shownSideCount))
  const ph = String(row.phase ?? '').trim().toLowerCase()
  const seatNames = padSeatNames(row.seatNames)
  const seatBankrolls = padSeatBankrolls(row.seatBankrolls)
  const seatFolded = padSeatFolded(row.seatFolded)
  const seatPointsOnly = padSeatPointsOnly(row.seatPointsOnly)
  const blindSeatSnapshot = venueTileBlindSeats(row)
  const actingSeat = venueTileActingSeat(row)
  const seatLastBettingAction = padSeatLastBettingAction(row.seatLastBettingAction)
  const inShowdown = ph === 'showdown'
  const floorShowdownRows = inShowdown ? showdownRowsFromTile(row) : []
  const floorShowdownAnswer = inShowdown
    ? (sharedShowdownAnswer ?? showdownCorrectAnswerFromTile(row))
    : undefined
  const showdownBrief = hideShowdownResults || floorSize.showdownBrief
  /** Mosaic floor never stacks the brown results rail under the felt — overlay or headline only. */
  const mosaicShowdownOverlay =
    inShowdown && floorShowdownRows.length > 0 && (showdownBrief || floorHoneycomb)
  const showExpandedShowdownPanel =
    inShowdown && floorShowdownRows.length > 0 && !showdownBrief && !floorHoneycomb
  const showFloorShowdownOverlay = mosaicShowdownOverlay
  const floorShowdownPresentation = useMemo(() => {
    if (!showFloorShowdownOverlay) return null
    return buildFloorShowdownPresentation(floorShowdownRows, floorShowdownAnswer)
  }, [showFloorShowdownOverlay, floorShowdownRows, floorShowdownAnswer])
  const floorShowdownPot = useMemo(() => {
    if (!showFloorShowdownOverlay) return 0
    return resolveShowdownDisplayPot(row, floorShowdownRows, floorShowdownAnswer)
  }, [showFloorShowdownOverlay, row, floorShowdownRows, floorShowdownAnswer])
  const winnerSeatIndexes = showFloorShowdownOverlay
    ? floorShowdownPresentation?.winnerSeatIndexes ?? null
    : null
  const { showNoMoreBets, wageringLive } = mosaicWagerStyleFlags(row, dimAnsweringEarly)
  /** Unified mosaic card chrome (badge, acting name, pot-on-felt) for dense grids only. */
  const spaciousTileChrome = floorSpec.spaciousTileChrome
  const denseMosaicChrome = !spaciousTileChrome
  const feltFillsCell =
    floorFillHeight || (floorHoneycomb && floorSize.honeycombFillHeight && !shrinkWrapRowHeight)
  const mosaicShrinkWrap =
    !floorFillHeight && (shrinkWrapRowHeight || !floorSize.honeycombFillHeight)
  const actingPlayerName =
    wageringLive && !showFloorShowdownOverlay
      ? mosaicActingPlayerName(actingSeat, seatNames)
      : null
  const actingCallAmount =
    row.actingCallAmount != null &&
    typeof row.actingCallAmount === 'number' &&
    Number.isFinite(row.actingCallAmount)
      ? Math.max(0, Math.floor(row.actingCallAmount))
      : null
  const statusBandKind = ((): MosaicTableStatusBandKind | null => {
    if (showFloorShowdownOverlay) return null
    if (
      wageringLive &&
      actingSeat != null &&
      actingPlayerName != null &&
      actingCallAmount != null
    ) {
      return 'to-call'
    }
    if (showNoMoreBets && seats >= 2) return 'no-more-bets'
    if (ph === 'answering' && seats >= 2) return 'answering'
    return null
  })()
  const showStatusBand = statusBandKind != null
  const potOnFelt = !showFloorShowdownOverlay
  const potMuted =
    ph === 'lobby' || ph === 'question'
      ? pot > 0
        ? ('dim' as const)
        : ('faint' as const)
      : ('live' as const)
  const feltGridRow = 'col-start-1 row-start-2'
  const showdownPanelGridRow = 'col-start-1 row-start-3'

  const cardShell = showNoMoreBets
    ? 'rounded-xl border-2 border-emerald-500/70 bg-black/55 shadow-[0_0_16px_rgba(52,211,153,0.22)] ring-1 ring-emerald-400/20'
    : ph === 'answering'
      ? 'rounded-xl border-2 border-cyan-500/55 bg-black/55 shadow-[0_0_18px_rgba(34,211,238,0.18)] ring-1 ring-cyan-400/20'
      : wageringLive
        ? 'rounded-xl border-2 border-amber-500/70 bg-black/55 shadow-[0_0_22px_rgba(251,191,36,0.28)] ring-1 ring-amber-400/25'
        : 'rounded-xl border-2 border-yellow-700/40 bg-black/55 shadow-lg'

  const statusBandAria =
    statusBandKind === 'to-call' && actingPlayerName && actingCallAmount != null
      ? `, ${publicBetAria(actingPlayerName, actingCallAmount, row.raisesClosed === true)}`
      : statusBandKind === 'no-more-bets'
        ? ', no more bets'
        : statusBandKind === 'answering'
          ? ', answer on your phone'
          : ''

  return (
      <article
        ref={tileRef}
        data-table-tile={tn}
        role="group"
        aria-label={`Table ${tn}, ${feltPotAria(pot, shownSides)}${statusBandAria}, venue floor`}
        style={tileTypographyStyle}
        className={`vfd-mosaic-tile @container/size relative min-h-0 min-w-0 ${mosaicTypography.rootClass} ${showFloorShowdownOverlay ? 'vfd-mosaic-tile--showdown-overlay' : 'backdrop-blur-md'} ${floorSize.tileInsetClass} ${floorSize.cardPaddingClass} ${cardShell} ${
          showFloorShowdownOverlay && shrinkWrapRowHeight
            ? 'vfd-mosaic-tile--showdown-aspect flex w-full flex-col'
            : floorFillHeight
            ? 'flex h-full min-h-0 w-full flex-col'
            : shrinkWrapRowHeight || mosaicShrinkWrap
              ? 'flex h-auto flex-col'
              : feltFillsCell
                ? 'grid h-full grid-rows-[auto_minmax(0,1fr)]'
                : 'flex h-full flex-col'
        }`}
      >
        <div
          className={`min-h-0 min-w-0 ${
            floorFillHeight
              ? 'flex min-h-0 flex-1 flex-col'
              : shrinkWrapRowHeight || mosaicShrinkWrap || !feltFillsCell
                ? `flex flex-col ${floorSize.innerGapClass}`
                : 'contents'
          } ${showFloorShowdownOverlay ? 'hidden' : ''}`}
        >
        <div
          className={`grid shrink-0 gap-x-1 grid-cols-[auto_minmax(0,1fr)] ${floorSize.headerRowClass} ${mosaicTypography.titleRowClass} ${feltFillsCell ? 'col-start-1 row-start-1 min-w-0' : ''}`}
        >
          {denseMosaicChrome ? (
            <span
              className={`${VENUE_FLOOR_MOSAIC_CHROME.tableNumBadge} ${mosaicTypography.tableNum}`}
            >
              {tn}
            </span>
          ) : (
            <div
              className={`shrink-0 tabular-nums leading-tight text-yellow-400 ${floorSize.tableNumClass} ${mosaicTypography.tableNum}`}
            >
              {tn}
            </div>
          )}
          {showStatusBand && statusBandKind != null ? (
            <MosaicTableStatusBand
              kind={statusBandKind}
              playerName={actingPlayerName ?? undefined}
              callAmount={actingCallAmount ?? undefined}
              lastCall={row.raisesClosed === true}
              prefersReducedMotion={prefersReducedMotion}
              gridRowClass="min-w-0"
            />
          ) : potOnFelt ? (
            <div
              className="min-w-0 px-0.5 text-center"
              aria-label={actingPlayerName && !showStatusBand ? `${actingPlayerName} to act` : undefined}
            >
              {actingPlayerName && !showStatusBand ? (
                <span className={mosaicTypography.actingName} title={actingPlayerName}>
                  {actingPlayerName}
                </span>
              ) : denseMosaicChrome ? (
                <span className={`${mosaicTypography.actingName} invisible`} aria-hidden>
                  {'\u00A0'}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0" aria-hidden />
          )}
        </div>

        <div
          className={`@container/size relative z-[1] w-full overflow-visible ${floorSize.ringScaleClass} ${
            floorFillHeight && denseMosaicChrome ? mosaicTypography.feltMaxHeightClass : ''
          } ${
            floorFillHeight
              ? 'flex h-full min-h-0 flex-1 flex-col justify-center'
              : feltFillsCell
                ? `${feltGridRow} flex h-full min-h-0 flex-1 flex-col justify-center`
                : mosaicShrinkWrap
                  ? 'flex shrink-0 flex-col justify-center'
                  : 'flex h-full min-h-0 flex-1 flex-col justify-center'
          }`}
          style={{
            ...(feltReserve.topPx > 0 ? { paddingTop: feltReserve.topPx } : {}),
            ...(cornerDockPx > 0 ? { paddingBottom: cornerDockPx } : {}),
          }}
        >
          <div className="flex w-full min-h-0 items-end justify-center">
          <SeatRingWithLabels
            ringMode="mosaic"
            mosaicFluidWidth={floorHoneycomb || floorFillHeight}
            mosaicDensity={floorSize.size}
            mosaicShrinkWrap={mosaicShrinkWrap}
            mosaicFillHeight={floorFillHeight}
            mosaicFeltAspectClass={floorSize.feltAspectClass}
            mosaicFeltWidthClass={floorSize.feltWidthClass}
            mosaicCenterPot={potOnFelt ? pot : null}
            mosaicStackPx={Number.parseFloat(String((tileTypographyStyle as Record<string, unknown>)['--vfd-stack-size'] ?? '')) || 0}
            seatSideMarks={shownMarks}
            sideLayers={shownSides}
            mosaicCenterPotClass={mosaicTypography.feltPot}
            mosaicCenterPotMuted={potMuted}
            seatedCount={seats}
            seatNames={seatNames}
            seatBankrolls={seatBankrolls}
            blindSeats={blindSeatSnapshot}
            seatFolded={seatFolded}
            seatInvested={row.seatInvested}
            seatStacksKnown={row.seatBankrolls != null}
            seatPointsOnly={seatPointsOnly}
            actingSeatIndex={actingSeat}
            showSeatBettingActions={false}
            seatLastBettingAction={seatLastBettingAction}
            actingCallAmount={row.actingCallAmount}
            winnerSeatIndexes={showFloorShowdownOverlay ? winnerSeatIndexes : null}
            suppressFeltCenter={showFloorShowdownOverlay}
            seatHoleDigits={row.seatHoleDigits}
            seatHolesDealt={row.seatHolesDealt}
            communityDigits={row.communityDigits}
            betsInPaused={showNoMoreBets}
            seatSubmittedAnswers={row.seatSubmittedAnswers}
            seatAnswerLocked={row.seatAnswerLocked}
            answeringPhase={ph === 'answering'}
            showMosaicSeatStacks={mosaicShowsSeatStacks(ph)}
          />
          </div>
        </div>

        {showExpandedShowdownPanel ? (
          <div
            className={`rounded-lg p-1 ${feltFillsCell ? showdownPanelGridRow + ' min-w-0' : ''}`}
            style={{
              background: 'linear-gradient(180deg, #5c3d1e 0%, #3d2810 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,220,160,0.1)',
            }}
          >
            <ShowdownResultsPanel
              compact
              correctAnswer={floorShowdownAnswer}
              rows={floorShowdownRows}
            />
          </div>
        ) : null}
        </div>

        {showFloorShowdownOverlay ? (
          <VenueFloorShowdownByVariant
            tableNum={tn}
            pot={floorShowdownPot}
            rows={floorShowdownRows}
            correctAnswer={floorShowdownAnswer}
            floorSpec={floorSpec}
          />
        ) : null}

        {showNoMoreBets && seats >= 2 && !showFloorShowdownOverlay && statusBandKind !== 'no-more-bets' ? (
          <VenueMosaicNoMoreBetsWatermark offsetClass={mosaicTypography.noMoreBetsOffsetClass} />
        ) : null}
        <div className="vfd-mosaic-side-lane vfd-mosaic-side-lane--corners">
          <MosaicSidePotPlaques
            sides={shownSides}
            hidden={inShowdown}
            hiddenCount={hiddenSideCount}
            metrics={plaqueMetrics}
          />
        </div>
      </article>
  )
}

function venueShowdownQuestionFromTiles(
  tileRows: DisplayVenueTileSnapshot[],
  wallQuestion: string | null
): string | null {
  if (wallQuestion?.trim()) return wallQuestion.trim()
  for (const t of tileRows) {
    if (t.phase === 'showdown') {
      const qt = t.showdownQuestionText
      if (typeof qt === 'string' && qt.trim()) return qt.trim()
    }
  }
  return null
}

export function VenueAerialFloorGrid({
  tiles,
  showHeadline,
  skipMountIntro,
  prefersReducedMotion,
  sharedShowdownAnswer,
  floorSpec,
}: {
  tiles: DisplayVenueTileSnapshot[]
  showHeadline: boolean
  skipMountIntro: boolean
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
  floorSpec: VenueFloorSpec
}) {
  const n = tiles.length
  const floorHostRef = useRef<HTMLDivElement>(null)
  const [floorViewport, setFloorViewport] = useState<VenueFloorLayoutViewport | undefined>()

  useLayoutEffect(() => {
    const host = floorHostRef.current
    if (!host || typeof ResizeObserver === 'undefined') return

    const measure = () => {
      const widthPx = host.clientWidth
      const heightPx = host.clientHeight
      if (widthPx <= 0 || heightPx <= 0) return
      setFloorViewport((prev) =>
        prev?.widthPx === widthPx && prev.heightPx === heightPx
          ? prev
          : { widthPx, heightPx }
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  const floorLayout = useMemo(
    () =>
      venueFloorLayoutPlanForSpec(floorSpec, {
        viewport: floorViewport,
        withHeadline: showHeadline,
        populatedTableCount: n > 0 ? n : floorSpec.populatedTableCount,
      }),
    [floorSpec, n, floorViewport, showHeadline]
  )
  const { rowCount, rowSizes, columns: floorColumns } = floorLayout
  const floorSize = useMemo(
    () => venueFloorSpacingSpecForSpec(floorSpec, floorLayout, { withHeadline: showHeadline }),
    [floorSpec, floorLayout, showHeadline]
  )
  const { fillRowHeight, shrinkWrapRowHeight } = venueFloorRowTrackSpec(rowCount, {
    withHeadline: showHeadline,
  })
  const floorGridPadding = useMemo(
    () => venueFloorGridPaddingForLayout(rowCount, { withHeadline: showHeadline }),
    [rowCount, showHeadline]
  )
  const gridInsetClass =
    venueFloorGridInsetClass(rowCount, { withHeadline: showHeadline }) ?? 'px-4 sm:px-6'
  const inVenueShowdown = useMemo(() => showdownTableNums(tiles).length > 0, [tiles])
  /** 3D floor tilt softens raster art — stay flat while winner overlays are up. */
  const floorGridPerspective = useMemo(
    () => (inVenueShowdown ? {} : venueFloorGridPerspectiveStyle(rowCount)),
    [rowCount, inVenueShowdown]
  )
  const floorRows = useMemo(() => chunkTilesIntoRowGroups(tiles, rowSizes), [tiles, rowSizes])
  const mosaicTypography = useMemo(
    () => venueFloorMosaicTypographyFromSpec(floorSpec),
    [floorSpec.mosaicTypographyTier]
  )
  const cardSlotWidthForRow = useCallback(
    () => venueFloorCardSlotWidthCss(floorColumns, floorSize.cellGapRem),
    [floorColumns, floorSize.cellGapRem]
  )
  const showdownBrief =
    floorSize.showdownBrief || rowCount >= 2 || (showHeadline && inVenueShowdown)
  const othersStillWagering = useMemo(() => venueHasOpenWagering(tiles), [tiles])

  if (n === 0) return null

  return (
    <motion.section
      aria-label={`Venue floor — ${n} table${n === 1 ? '' : 's'}, staggered row grid`}
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      data-form-factor-mosaic={floorSpec?.id}
      initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {!showHeadline ? (
        <div className="mb-1.5 shrink-0 px-1 sm:mb-2">
          <div className="w-[clamp(5rem,min(18vw,8rem),9rem)]">
            <div className="w-full shadow-black/60 drop-shadow-lg" style={{ aspectRatio: '958 / 592' }}>
              <QuizzEmWordmark layout="fill" />
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={floorHostRef}
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${gridInsetClass}`}
        style={
          {
            paddingTop: `${floorGridPadding.top}rem`,
            paddingBottom: `max(${floorGridPadding.bottom}rem, calc(${VENUE_FLOOR_GRID_BOTTOM_SAFE_REM}rem + env(safe-area-inset-bottom, 0px)))`,
            ...floorGridPerspective,
          } as CSSProperties
        }
      >
        <div
          className="flex min-h-0 flex-1 flex-col"
          style={{ gap: `${floorSize.rowGapRem}rem` }}
        >
          {floorRows.map((rowTiles, rowIndex) => (
            <div
              key={rowTiles.map((t) => t.tableNum).join('-') || `row-${rowIndex}`}
              className={`flex min-h-0 w-full items-stretch justify-center ${
                fillRowHeight ? 'flex-1' : 'flex-none'
              }`}
              style={{ gap: `${floorSize.cellGapRem}rem` }}
            >
              {rowTiles.map((row) => {
                const rowSlotWidth = cardSlotWidthForRow()
                return (
                <div
                  key={row.tableNum}
                  className={`flex min-h-0 min-w-0 flex-col ${fillRowHeight ? 'h-full' : 'h-auto'}`}
                  style={{ flex: `0 0 ${rowSlotWidth}`, maxWidth: rowSlotWidth }}
                >
                  <VenueMosaicTableCard
                    row={row}
                    hideShowdownResults={showdownBrief}
                    floorSize={floorSize}
                    floorHoneycomb
                    floorFillHeight={fillRowHeight}
                    shrinkWrapRowHeight={shrinkWrapRowHeight}
                    prefersReducedMotion={prefersReducedMotion}
                    dimAnsweringEarly={row.phase === 'answering' && othersStillWagering}
                    sharedShowdownAnswer={sharedShowdownAnswer}
                    mosaicTypography={mosaicTypography}
                    floorSpec={floorSpec}
                  />
                </div>
              )})}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

/** Slim sports-bar headline when only one table is live. */
function VenueBroadcastHeadlineStrip({
  skipMountIntro,
  showSetlistCue,
  setlistCueNumber,
  setlistCueTotal,
  headlineQuestionDisplay,
  broadcastMetaLine,
  headlinePhaseBadge,
  showVenueBlindsHeadline,
  venueBlindsHeadline,
  inVenueShowdown,
  venueShowdownAnswer,
  headlineAnsweringUnified,
  headlineAnswering,
  inAnsweringCountdown,
  answerDeadlineMs,
  answerSubmitCount = null,
  answerEligibleCount = null,
}: {
  skipMountIntro?: boolean
  showSetlistCue: boolean
  setlistCueNumber: number | null
  setlistCueTotal: number | null
  headlineQuestionDisplay: string | null
  broadcastMetaLine: string | null
  headlinePhaseBadge: string | null
  showVenueBlindsHeadline: boolean
  venueBlindsHeadline: { amount: string; meta: string | null } | null
  inVenueShowdown: boolean
  venueShowdownAnswer: number | null | undefined
  headlineAnsweringUnified: boolean
  headlineAnswering: boolean
  inAnsweringCountdown: boolean
  answerDeadlineMs: number | null
  answerSubmitCount?: number | null
  answerEligibleCount?: number | null
}) {
  const timerSeconds = useAnswerSecondsLeft(inAnsweringCountdown ? answerDeadlineMs : null, 250)
  const headlineTimerOnly =
    headlineAnsweringUnified && inAnsweringCountdown && typeof timerSeconds === 'number'
  const broadcastQuestionFit = displayBroadcastHeadlineQuestionFitProfile()
  const questionTimerClass = headlineQuestionDisplay
    ? 'venue-broadcast-answer-timer'
    : 'venue-broadcast-answer-timer venue-broadcast-answer-timer--hero'

  return (
    <motion.div
      className="venue-broadcast-headline sticky top-0 z-[45] shrink-0 flex w-full min-w-0 flex-col gap-1 rounded-b-xl border-2 border-yellow-400/85 bg-black/88 px-3 py-2 shadow-[0_10px_32px_rgba(0,0,0,0.55)] backdrop-blur-md sm:gap-1.5 sm:px-5 sm:py-2.5"
      style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top, 0px))' }}
      initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {showSetlistCue || broadcastMetaLine ? (
        <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
          {showSetlistCue && setlistCueNumber != null && setlistCueTotal != null ? (
            <span className="vfd-broadcast-setlist-badge inline-flex shrink-0 items-center rounded-md border border-violet-500/45 bg-violet-950/55 px-2 py-0.5 font-black uppercase tracking-wide text-violet-100/95 sm:px-2.5 sm:py-1">
              Q {setlistCueNumber}/{setlistCueTotal}
            </span>
          ) : (
            <span className="min-w-0 shrink" aria-hidden />
          )}
          {broadcastMetaLine ? (
            <div
              className="vfd-broadcast-headline-meta hidden min-w-0 shrink-0 flex-col items-end text-right sm:flex"
              aria-label={broadcastMetaLine}
            >
              <span className="vfd-broadcast-headline-meta-primary">{broadcastMetaLine}</span>
              {showVenueBlindsHeadline && venueBlindsHeadline?.amount ? (
                <span className="vfd-broadcast-headline-meta-blinds">
                  <ChipText text={venueBlindsHeadline.amount} />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {broadcastMetaLine ? (
        <p className="vfd-broadcast-headline-meta-mobile text-center sm:hidden" aria-hidden>
          {broadcastMetaLine}
          {showVenueBlindsHeadline && venueBlindsHeadline?.amount
            ? (
                <>
                  {' · '}
                  <ChipText text={venueBlindsHeadline.amount} />
                </>
              )
            : ''}
        </p>
      ) : null}
      {headlinePhaseBadge != null && !inVenueShowdown && !headlineAnsweringUnified ? (
        <p className="vfd-broadcast-phase-badge text-center font-black uppercase tracking-wide text-emerald-200/90">
          {headlinePhaseBadge}
        </p>
      ) : null}
      {headlineQuestionDisplay ? (
        <DisplayFitQuestionText
          text={headlineQuestionDisplay}
          hostClassName={broadcastQuestionFit.hostClassName}
          maxFontVh={broadcastQuestionFit.maxFontVh}
          textClassName="venue-headline-question-slot w-full min-w-0 text-balance text-center tracking-tight text-yellow-400 display-text-headline-question-broadcast leading-snug"
        />
      ) : inVenueShowdown ? (
        <p className="sr-only">Showdown in progress.</p>
      ) : null}
      {inVenueShowdown && venueShowdownAnswer != null ? (
        <div
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-amber-300/70 bg-amber-950/70 px-5 py-3 shadow-[0_0_28px_rgba(251,191,36,0.28)] sm:px-7 sm:py-3.5"
          aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
        >
          <span className={`font-black uppercase tracking-[0.18em] text-amber-200/85 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
            Correct answer
          </span>
          <div className="font-mono text-[clamp(2.5rem,6vw,4rem)] font-black tabular-nums tracking-tight text-amber-50">
            {formatTriviaNumber(venueShowdownAnswer)}
          </div>
        </div>
      ) : headlineTimerOnly && typeof timerSeconds === 'number' ? (
        <div
          className={`mx-auto flex w-fit flex-col items-center justify-center gap-1 rounded-xl border px-6 py-2 ${
            timerSeconds <= 10
              ? 'border-cyan-400/55 bg-cyan-950/45 shadow-[0_0_24px_rgba(34,211,238,0.16)]'
              : 'border-cyan-600/35 bg-cyan-950/25'
          }`}
          aria-live="polite"
          aria-label={`Time to guess, ${timerSeconds} seconds`}
        >
          <span className="vfd-broadcast-answer-prompt font-black uppercase tracking-wide text-cyan-100/90">
            Time to guess
          </span>
          <div
            className={`${questionTimerClass} font-mono font-black tabular-nums tracking-tight${
              timerSeconds <= 10 ? ' venue-answer-timer--urgent' : ''
            }`}
          >
            {timerSeconds}
          </div>
        </div>
      ) : headlineAnsweringUnified || headlineAnswering ? (
        <div
          className={`mx-auto flex w-fit flex-col items-center justify-center gap-1 rounded-lg border px-6 py-2 ${
            inAnsweringCountdown && typeof timerSeconds === 'number' && timerSeconds <= 10
              ? 'border-cyan-400/55 bg-cyan-950/45'
              : 'border-cyan-600/35 bg-cyan-950/25'
          }`}
        >
          <span className="vfd-broadcast-answer-prompt font-black uppercase tracking-wide text-cyan-100/90">
            Answer on your phone
          </span>
          {typeof answerSubmitCount === 'number' &&
          typeof answerEligibleCount === 'number' &&
          answerEligibleCount > 0 ? (
            <span className="text-[clamp(0.85rem,2.2vw,1.15rem)] font-black tabular-nums tracking-wide text-cyan-50/95">
              {answerSubmitCount}/{answerEligibleCount} locked in
            </span>
          ) : null}
          {inAnsweringCountdown && typeof timerSeconds === 'number' ? (
            <div
              className={`${questionTimerClass} font-mono font-black tabular-nums tracking-tight${
                timerSeconds <= 10 ? ' venue-answer-timer--urgent' : ''
              }`}
            >
              {timerSeconds}
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  )
}

/** Card edge for the two-table broadcast. Names and stacks stay outside the oval. */
function dualBroadcastFrameClass(
  phase: string,
  showNoMoreBets: boolean,
  wageringLive: boolean,
): string {
  const shell = 'rounded-xl border-2 bg-black/55'
  if (showNoMoreBets) return `${shell} border-emerald-500/70`
  if (phase === 'answering') return `${shell} border-cyan-500/55`
  if (wageringLive) return `${shell} border-amber-500/70`
  return `${shell} border-yellow-700/40`
}

/** n=1 or n=2 broadcast hero — full-viewport felt, names + stacks, pot/action on felt center. */
export function VenueSingleTableBroadcast({
  tile,
  floorSpec,
  prefersReducedMotion: _prefersReducedMotion,
  sharedShowdownAnswer,
  broadcastDensity,
  showTableBadge = false,
  reserveHeadlineSpace = false,
}: {
  tile: DisplayVenueTileSnapshot
  floorSpec?: VenueFloorSpec
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
  broadcastDensity?: 'solo' | 'dual'
  showTableBadge?: boolean
  /** Keep the felt the size it has while the question bar is on screen. */
  reserveHeadlineSpace?: boolean
}) {
  const seats = tile.seated
  const { pot, marks: seatSideMarks, sides } = shownFeltPot(
    tile.pot,
    tile.seatInvested,
    tile.seatFolded,
    tile.seatBankrolls,
    tile.seatPointsOnly,
    tile.seatBankrolls != null,
  )
  const ph = String(tile.phase ?? '').trim().toLowerCase()
  const seatNames = padSeatNames(tile.seatNames)
  const seatBankrolls = padSeatBankrolls(tile.seatBankrolls)
  const seatFolded = padSeatFolded(tile.seatFolded)
  const seatPointsOnly = padSeatPointsOnly(tile.seatPointsOnly)
  const blindSeatSnapshot = venueTileBlindSeats(tile)
  const actingSeat = venueTileActingSeat(tile)
  const seatLastBettingAction = padSeatLastBettingAction(tile.seatLastBettingAction)
  const inShowdown = ph === 'showdown'
  const floorShowdownRows = inShowdown ? showdownRowsFromTile(tile) : []
  const floorShowdownAnswer = inShowdown
    ? (sharedShowdownAnswer ?? showdownCorrectAnswerFromTile(tile))
    : undefined
  const mosaicShowdownOverlay = inShowdown && floorShowdownRows.length > 0
  const showFloorShowdownOverlay = mosaicShowdownOverlay
  const floorShowdownPresentation = useMemo(() => {
    if (!showFloorShowdownOverlay) return null
    return buildFloorShowdownPresentation(floorShowdownRows, floorShowdownAnswer)
  }, [showFloorShowdownOverlay, floorShowdownRows, floorShowdownAnswer])
  const floorShowdownPot = useMemo(() => {
    if (!showFloorShowdownOverlay) return 0
    return resolveShowdownDisplayPot(tile, floorShowdownRows, floorShowdownAnswer)
  }, [showFloorShowdownOverlay, tile, floorShowdownRows, floorShowdownAnswer])
  const { showNoMoreBets, wageringLive } = mosaicWagerStyleFlags(tile, false)
  const actingPlayerName =
    wageringLive && !showFloorShowdownOverlay
      ? mosaicActingPlayerName(actingSeat, seatNames)
      : null
  const actingCallAmount =
    tile.actingCallAmount != null &&
    typeof tile.actingCallAmount === 'number' &&
    Number.isFinite(tile.actingCallAmount)
      ? Math.max(0, Math.floor(tile.actingCallAmount))
      : null
  const broadcastActionKind = ((): MosaicTableStatusBandKind | null => {
    if (showFloorShowdownOverlay) return null
    if (
      wageringLive &&
      actingSeat != null &&
      actingPlayerName != null &&
      actingCallAmount != null
    ) {
      return 'to-call'
    }
    if (showNoMoreBets && seats >= 2) return 'no-more-bets'
    if (ph === 'answering' && seats >= 2) return 'answering'
    return null
  })()
  const potMuted =
    ph === 'lobby' || ph === 'question'
      ? pot > 0
        ? ('dim' as const)
        : ('faint' as const)
      : ('live' as const)

  const tableNum = tile.tableNum
  const density = broadcastDensity ?? floorSpec?.broadcastDensity ?? 'solo'
  const isDualDensity = density === 'dual'
  const dualFrame = isDualDensity ? dualBroadcastFrameClass(ph, showNoMoreBets, wageringLive) : ''
  const phaseShell = isDualDensity
    ? ''
    : showNoMoreBets
      ? 'ring-2 ring-emerald-500/55 shadow-[0_0_28px_rgba(52,211,153,0.18)]'
      : ph === 'answering'
        ? 'ring-2 ring-cyan-500/45 shadow-[0_0_28px_rgba(34,211,238,0.16)]'
        : wageringLive
          ? 'ring-2 ring-amber-500/55 shadow-[0_0_32px_rgba(251,191,36,0.22)]'
          : ''
  const showdownViewport = showdownStageViewportFromSpec(floorSpec ?? null)

  return (
    <div
      className={`venue-single-table-broadcast relative flex min-h-0 flex-1 flex-col items-stretch justify-center overflow-hidden px-0 pb-0 pt-0${
        isDualDensity ? ` venue-single-table-broadcast--dual relative min-w-0 ${dualFrame}` : ''
      }${reserveHeadlineSpace && !isDualDensity ? ' venue-single-table-broadcast--headline-cap' : ''}`}
      aria-label={
        showFloorShowdownOverlay
          ? floorShowdownPresentation?.ariaLabel ?? 'Showdown winner reveal'
          : isDualDensity
            ? `Table ${tableNum}, ${feltPotAria(pot, sides)}`
            : `Final table, ${feltPotAria(pot, sides)}`
      }
    >
      {showFloorShowdownOverlay && floorSpec != null ? (
        <VenueFloorShowdownByVariant
          tableNum={showTableBadge ? tableNum : undefined}
          pot={floorShowdownPot}
          rows={floorShowdownRows}
          correctAnswer={floorShowdownAnswer}
          floorSpec={floorSpec}
          stageViewport={showdownViewport}
        />
      ) : (
        <>
          {isDualDensity ? (
            <div className="@container relative grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center px-1.5 pt-1.5">
              <ShowdownTableBadge tableNum={tableNum} />
              {broadcastActionKind != null ? (
                <MosaicTableStatusBand
                  kind={broadcastActionKind}
                  playerName={actingPlayerName ?? undefined}
                  callAmount={actingCallAmount ?? undefined}
                  lastCall={tile.raisesClosed === true}
                  prefersReducedMotion={_prefersReducedMotion}
                  gridRowClass="min-w-0"
                />
              ) : null}
            </div>
          ) : showTableBadge ? (
            <div className="pointer-events-none absolute left-2 top-2 z-20">
              <ShowdownTableBadge tableNum={tableNum} />
            </div>
          ) : null}
          <div
            className={`relative flex min-h-0 flex-1 w-full flex-col items-center justify-center ${phaseShell}`}
          >
            <div className="flex h-full min-h-0 w-full items-center justify-center">
              <SeatRingWithLabels
                ringMode={floorSpec?.ringMode ?? 'broadcast'}
                size="lg"
                feltSeatStacks
                broadcastDensity={density}
                seatedCount={seats}
                seatNames={seatNames}
                seatBankrolls={seatBankrolls}
                blindSeats={blindSeatSnapshot}
                seatFolded={seatFolded}
                seatPointsOnly={seatPointsOnly}
                actingSeatIndex={actingSeat}
                seatLastBettingAction={seatLastBettingAction}
                actingCallAmount={tile.actingCallAmount}
                mosaicCenterPot={pot}
                seatSideMarks={seatSideMarks}
                sideLayers={sides}
                mosaicCenterPotMuted={potMuted}
                broadcastActionKind={isDualDensity ? null : broadcastActionKind}
                broadcastActingPlayerName={isDualDensity ? null : actingPlayerName}
                broadcastCallAmount={isDualDensity ? null : actingCallAmount}
                broadcastLastCall={!isDualDensity && tile.raisesClosed === true}
                seatHoleDigits={tile.seatHoleDigits}
                seatHolesDealt={tile.seatHolesDealt}
                communityDigits={tile.communityDigits}
                betsInPaused={showNoMoreBets}
                seatSubmittedAnswers={tile.seatSubmittedAnswers}
                seatAnswerLocked={tile.seatAnswerLocked}
                answeringPhase={ph === 'answering'}
              />
            </div>
            {showNoMoreBets && seats >= 2 && broadcastActionKind !== 'no-more-bets' ? (
              <VenueMosaicNoMoreBetsWatermark offsetClass="translate-y-[8%] text-[clamp(1.75rem,6vw,3.5rem)]" />
            ) : null}
          </div>
        </>
      )}
      {!isDualDensity ? (
        <div className="vfd-mosaic-side-lane vfd-mosaic-side-lane--corners">
          <MosaicSidePotPlaques sides={sides} hidden={inShowdown} />
        </div>
      ) : null}
    </div>
  )
}

export function VenueDualTableBroadcast({
  tiles,
  floorSpec,
  prefersReducedMotion,
  sharedShowdownAnswer,
}: {
  tiles: DisplayVenueTileSnapshot[]
  floorSpec?: VenueFloorSpec
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
}) {
  return (
    <div className="venue-floor-dual-broadcast grid min-h-0 min-w-0 flex-1 grid-cols-2 gap-x-3 overflow-hidden p-2">
      {tiles.map((tile) => (
        <div
          key={tile.tableNum}
          className="venue-floor-dual-broadcast__cell flex min-h-0 min-w-0 flex-col overflow-visible"
        >
        <VenueSingleTableBroadcast
          tile={tile}
          floorSpec={floorSpec}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
          broadcastDensity="dual"
          showTableBadge
        />
        </div>
      ))}
    </div>
  )
}

export function VenueHeroSpotlightLayout({
  featured,
  companions,
  floorSpec,
  skipMountIntro,
  prefersReducedMotion,
  sharedShowdownAnswer,
}: {
  featured: DisplayVenueTileSnapshot
  companions: DisplayVenueTileSnapshot[]
  floorSpec: VenueFloorSpec
  skipMountIntro: boolean
  prefersReducedMotion: boolean
  sharedShowdownAnswer?: number
}) {
  const heroSpec = useMemo(() => resolveVenueFloorSpecForHeroFeatured(floorSpec), [floorSpec])
  const heroSize = useMemo(() => venueFloorSizeSpecForDensity(heroSpec.feltDensity), [heroSpec.feltDensity])
  const heroTypography = useMemo(
    () => venueFloorMosaicTypographyFromSpec(heroSpec),
    [heroSpec.mosaicTypographyTier]
  )
  const companionSpec = useMemo(
    () => resolveVenueFloorSpecForCompanionGrid(floorSpec, companions.length),
    [floorSpec, companions.length]
  )
  const othersStillWagering = useMemo(() => venueHasOpenWagering(companions), [companions])

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-3">
      <div className="flex min-h-0 min-w-0 flex-col lg:max-h-full">
        <VenueMosaicTableCard
          row={featured}
          hideShowdownResults={false}
          floorSize={heroSize}
          floorHoneycomb
          shrinkWrapRowHeight={false}
          prefersReducedMotion={prefersReducedMotion}
          dimAnsweringEarly={featured.phase === 'answering' && othersStillWagering}
          sharedShowdownAnswer={sharedShowdownAnswer}
          mosaicTypography={heroTypography}
          floorSpec={heroSpec}
        />
      </div>
      {companions.length > 0 ? (
        <VenueAerialFloorGrid
          tiles={companions}
          showHeadline={false}
          skipMountIntro={skipMountIntro}
          prefersReducedMotion={prefersReducedMotion}
          sharedShowdownAnswer={sharedShowdownAnswer}
          floorSpec={companionSpec}
        />
      ) : null}
    </div>
  )
}

/** Headline rail beside the question. Owns the answer clock so a tick does not redraw the felts. */
function VenueFloorHeadlineAside({
  answerDeadlineMs,
  headlineAnsweringUnified,
  headlineAnswering,
  inAnsweringCountdown,
  inVenueShowdown,
  venueShowdownAnswer,
  headlinePhaseBadge,
  showVenueBlindsHeadline,
  venueBlindsHeadline,
  othersStillWagering,
  answerSubmitCount,
  answerEligibleCount,
}: {
  answerDeadlineMs: number | null
  headlineAnsweringUnified: boolean
  headlineAnswering: boolean
  inAnsweringCountdown: boolean
  inVenueShowdown: boolean
  venueShowdownAnswer: number | null | undefined
  headlinePhaseBadge: string | null
  showVenueBlindsHeadline: boolean
  venueBlindsHeadline: { amount: string; meta: string | null } | null
  othersStillWagering: boolean
  answerSubmitCount: number | null
  answerEligibleCount: number | null
}) {
  const timerSeconds = useAnswerSecondsLeft(inAnsweringCountdown ? answerDeadlineMs : null, 250)
  const headlineTimerOnly =
    headlineAnsweringUnified && inAnsweringCountdown && typeof timerSeconds === 'number'

  return (
    <div
      className={`flex shrink-0 flex-col justify-center ${
        headlineAnsweringUnified
          ? 'items-end'
          : 'items-stretch gap-1.5 sm:min-w-[8.5rem] md:min-w-[10rem] lg:min-w-[11rem]'
      }`}
    >
      {headlinePhaseBadge != null && !inVenueShowdown && !headlineAnsweringUnified ? (
        <span
          className={`inline-flex items-center justify-center rounded-lg border border-emerald-500/45 bg-emerald-950/50 px-2.5 py-1 text-center font-black uppercase tracking-wide text-emerald-100/95 sm:px-3 sm:py-1.5 ${DISPLAY_TEXT_HEADLINE_PHASE_BADGE}`}
        >
          {headlinePhaseBadge}
        </span>
      ) : null}
      {showVenueBlindsHeadline && venueBlindsHeadline != null && !headlineAnsweringUnified ? (
        <div
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-amber-500/55 bg-amber-950/50 px-3 py-2 shadow-[0_0_20px_rgba(251,191,36,0.12)] sm:px-4 sm:py-2.5"
          aria-label={
            venueBlindsHeadline.meta
              ? `Blinds ${venueBlindsHeadline.amount}, ${venueBlindsHeadline.meta}`
              : `Blinds ${venueBlindsHeadline.amount}`
          }
        >
          <span className={`text-center font-black uppercase tracking-wide text-amber-200/90 ${DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_LABEL}`}>
            Blinds
          </span>
          <div className={`text-center font-mono font-black tabular-nums tracking-tight text-amber-50 ${DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_AMOUNT}`}>
            <ChipText text={venueBlindsHeadline.amount} />
          </div>
          {venueBlindsHeadline.meta ? (
            <div className="flex max-w-[11rem] flex-col items-center gap-0.5 text-center">
              {venueBlindsHeadline.meta.split(' · ').map((line) => (
                <span
                  key={line}
                  className={`font-semibold text-amber-200/75 ${DISPLAY_TEXT_HEADLINE_BLINDS_PANEL_META}`}
                >
                  {line}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {inVenueShowdown && venueShowdownAnswer != null ? (
        <div
          className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-amber-300/70 bg-amber-950/75 px-3 py-2 shadow-[0_0_28px_rgba(251,191,36,0.28)] sm:min-w-[9.5rem] sm:px-4 sm:py-2.5 md:min-w-[11rem]"
          aria-label={`Correct answer ${formatTriviaNumber(venueShowdownAnswer)}`}
        >
          <span className={`font-black uppercase tracking-[0.16em] text-amber-200/85 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
            Correct answer
          </span>
          <div className="font-mono text-[clamp(2.25rem,5.5vw,4.25rem)] font-black tabular-nums leading-none tracking-tight text-amber-50">
            {formatTriviaNumber(venueShowdownAnswer)}
          </div>
        </div>
      ) : headlineTimerOnly ? (
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl border px-3 py-1.5 sm:px-4 sm:py-2 ${
            timerSeconds <= 10
              ? 'border-cyan-400/55 bg-cyan-950/45 shadow-[0_0_24px_rgba(34,211,238,0.16)]'
              : 'border-cyan-600/35 bg-cyan-950/25'
          }`}
          aria-live="polite"
          aria-label={`${timerSeconds} seconds remaining to answer`}
        >
          <div
            className={`venue-headline-answer-timer font-mono font-black tabular-nums tracking-tight${
              timerSeconds <= 10 ? ' venue-answer-timer--urgent' : ''
            }`}
          >
            {timerSeconds}
          </div>
        </div>
      ) : headlineAnsweringUnified ? (
        <p className="sr-only">Answer on your phone — timer starts when every table finishes wagering</p>
      ) : headlineAnswering ? (
        <div
          className={`flex shrink-0 flex-col items-stretch justify-center gap-1 rounded-lg border px-2 py-1.5 sm:px-3 sm:py-2 ${
            inAnsweringCountdown && typeof timerSeconds === 'number' && timerSeconds <= 10
              ? 'border-cyan-400/55 bg-cyan-950/45 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
              : 'border-cyan-600/35 bg-cyan-950/25'
          }`}
          aria-live="polite"
          aria-label={
            inAnsweringCountdown && typeof timerSeconds === 'number'
              ? `Answer on your phone, ${timerSeconds} seconds remaining`
              : 'Answer on your phone — timer starts when every table finishes wagering'
          }
        >
          <span className={`text-center font-black uppercase tracking-wide text-cyan-100/90 ${DISPLAY_TEXT_HEADLINE_BADGE}`}>
            Answer on your phone
          </span>
          {typeof answerSubmitCount === 'number' &&
          typeof answerEligibleCount === 'number' &&
          answerEligibleCount > 0 ? (
            <div className="text-center font-black tabular-nums tracking-wide text-cyan-50/95 text-[clamp(0.95rem,2.4vw,1.35rem)]">
              {answerSubmitCount}/{answerEligibleCount} locked in
            </div>
          ) : null}
          {inAnsweringCountdown && typeof timerSeconds === 'number' ? (
            <div
              className={`venue-headline-answer-timer text-center font-mono font-black tabular-nums tracking-tight${
                timerSeconds <= 10 ? ' venue-answer-timer--urgent' : ''
              }`}
            >
              {timerSeconds}
            </div>
          ) : othersStillWagering ? (
            <div className={`text-center font-semibold text-cyan-200/80 ${DISPLAY_TEXT_HEADLINE_META}`}>
              Waiting for last table
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

type VenueEightTablesPreviewProps = {
  /** null until first `displayVenueSnapshot` from socket */
  wall: DisplayVenueWallSnapshot | null
  /**
   * Skip Framer entrance on header / headline (brief unmounts across layout transitions should not replay fades).
   */
  skipMountIntro?: boolean
  /** Host-pinned table from `displayLayout.focusTable` — shows spotlight layout only when set. */
  hostFocusTable?: number | null
}

/**
 * Venue wall: count-aware responsive table grid beneath the headline strip.
 */
export default function VenueEightTablesPreview({
  wall,
  skipMountIntro = false,
  hostFocusTable = null,
}: VenueEightTablesPreviewProps) {
  const [peakSurvivors, setPeakSurvivors] = useState(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const headlineQuestionText = wall?.headlineQuestionText ?? null
  const answerDeadlineMs = wall?.answerDeadlineMs ?? null
  const setlistCueNumber = wall?.setlistCueNumber ?? null
  const setlistCueTotal = wall?.setlistCueTotal ?? null
  const showSetlistCue =
    setlistCueNumber != null && setlistCueTotal != null && setlistCueTotal > 0
  const inAnsweringCountdown = answerDeadlineMs != null

  const tileRows = useMemo(() => buildVenueWallTileRows(wall), [wall])
  const audienceTileRows = useMemo(() => venueTilesForAudience(tileRows), [tileRows])
  const floorTiles = useMemo(() => populatedVenueTiles(audienceTileRows), [audienceTileRows])
  const venueLiveTableCount =
    typeof wall?.venueLiveTableCount === 'number' && Number.isFinite(wall.venueLiveTableCount)
      ? Math.floor(wall.venueLiveTableCount)
      : null
  const inVenueShowdown = useMemo(() => showdownTableNums(tileRows).length > 0, [tileRows])
  const publicAnswerReleased = useMemo(() => venuePublicAnswerReleased(tileRows), [tileRows])
  const venueShowdownAnswer = useMemo(
    () => (publicAnswerReleased ? resolveVenueShowdownAnswer(wall, tileRows) : undefined),
    [publicAnswerReleased, wall, tileRows]
  )
  const venueShowdownQuestionText = useMemo(
    () => venueShowdownQuestionFromTiles(tileRows, headlineQuestionText),
    [tileRows, headlineQuestionText]
  )

  const hasLiveWall = wall != null && wall.tiles != null && wall.tiles.length > 0
  const headlineSource = useMemo(
    () => resolveVenueHeadlineSource(wall, tileRows),
    [wall, tileRows]
  )
  const headlineAnswering =
    headlineSource.phase === 'answering' || wall?.headlinePhase === 'answering'
  const othersStillWagering = useMemo(() => venueHasOpenWagering(tileRows), [tileRows])
  const allTablesAnswering = useMemo(() => venueAllTablesAnswering(tileRows), [tileRows])
  /** Every populated table is answering — strip blinds/phase chrome; show countdown only. */
  const headlineAnsweringUnified =
    headlineAnswering && allTablesAnswering && !othersStillWagering
  const showHeadline =
    hasLiveWall &&
    (headlineQuestionText != null || answerDeadlineMs != null || inVenueShowdown || headlineAnswering)
  const headlineQuestionDisplay = inVenueShowdown
    ? venueShowdownQuestionText
    : headlineQuestionText
  const headlineDivergenceNote = useMemo(
    () => venueHeadlineDivergenceNote(tileRows, headlineSource.phase),
    [tileRows, headlineSource.phase]
  )
  const headlinePhaseBadge = useMemo(
    () =>
      venueHeadlinePhaseBadge(
        tileRows,
        headlineSource.phase ?? wall?.headlinePhase ?? null,
        inVenueShowdown,
      ),
    [tileRows, headlineSource.phase, wall?.headlinePhase, inVenueShowdown],
  )
  const venueBlindsHeadline = useMemo(() => venueWallBlindsHeadline(wall), [wall])
  const condenseHeadline = useMemo(() => venueWallCondenseHeadline(wall), [wall])
  useEffect(() => {
    if (condenseHeadline != null) {
      setPeakSurvivors((prev) => Math.max(prev, condenseHeadline.survivors))
    }
  }, [condenseHeadline])
  const condenseProgress = useMemo(
    () => buildVenueCondenseProgress({ wall, peakSurvivors }),
    [wall, peakSurvivors],
  )
  const showVenueBlindsHeadline =
    venueBlindsHeadline != null && !(inVenueShowdown && venueShowdownAnswer != null)

  const featuredTile = useMemo(() => {
    if (hostFocusTable == null) return null
    return floorTiles.find((t) => t.tableNum === hostFocusTable) ?? null
  }, [floorTiles, hostFocusTable])

  const companionTiles = useMemo(() => {
    if (hostFocusTable == null) return floorTiles
    return floorTiles.filter((t) => t.tableNum !== hostFocusTable)
  }, [floorTiles, hostFocusTable])

  const showHeroSpotlight = hostFocusTable != null && featuredTile != null
  const floorSpec = useMemo(
    () =>
      floorTiles.length > 0
        ? resolveVenueFloorSpec({
            populatedTableCount: floorTiles.length,
            hostFocusTable,
            venueLiveTableCount,
            withHeadline: showHeadline,
          })
        : null,
    [floorTiles.length, hostFocusTable, venueLiveTableCount, showHeadline]
  )

  const compactVenueHeadline = floorSpec?.compactHeadline ?? false
  const ultraCompactVenueHeadline = floorSpec?.ultraCompactHeadline ?? false
  const publicTypographyTier = floorSpec?.mosaicTypographyTier ?? 'spacious'
  const headlineQuestionClass = useMemo(() => {
    if (compactVenueHeadline) return DISPLAY_TEXT_HEADLINE_QUESTION_DENSE
    return displayHeadlineQuestionClass(publicTypographyTier)
  }, [compactVenueHeadline, publicTypographyTier])
  const headlineQuestionFit = useMemo(
    () => displayHeadlineQuestionFitProfile(publicTypographyTier, compactVenueHeadline),
    [compactVenueHeadline, publicTypographyTier],
  )
  const headlineStatsClass = useMemo(
    () => displayHeadlineStatsClass(compactVenueHeadline),
    [compactVenueHeadline],
  )
  const headlineLogoWidthClass = ultraCompactVenueHeadline
    ? 'w-[clamp(6.5rem,min(18vw,9rem),11rem)]'
    : compactVenueHeadline
      ? 'w-[clamp(7.5rem,min(20vw,10.5rem),12.5rem)]'
      : 'w-[clamp(8.5rem,min(22vw,12rem),15rem)] sm:w-[clamp(9.5rem,min(24vw,13rem),16.5rem)]'
  const headlineQuestionCardPadClass = compactVenueHeadline
    ? 'px-2 py-1 sm:px-2.5 sm:py-1.5'
    : 'px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4'
  const venueTypographyRootClass = floorSpec?.typographyRootClass ?? 'venue-floor-typography-spacious'

  const isVenueBroadcast = venueFloorSpecUsesBroadcastUiScale(floorSpec)
  const usesBroadcastHeadline = venueFloorSpecUsesBroadcastHeadline(floorSpec)
  const broadcastMetaLine = useMemo(
    () =>
      floorSpec != null && usesBroadcastHeadline
        ? buildVenueFloorHeadlineMeta(floorSpec, floorTiles, condenseProgress)
        : null,
    [condenseProgress, floorSpec, floorTiles, usesBroadcastHeadline]
  )
  const floorBodyKey = resolveVenueFloorBodyKey(floorSpec, {
    showHeroSpotlight,
    hostFocusTable,
  })
  const sharedShowdownAnswer = inVenueShowdown ? venueShowdownAnswer : undefined

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050806]">
      <DisplayWelcomeBackdrop />
      <div
        className={`relative z-10 flex h-full min-h-0 flex-col overflow-hidden text-white ${venueTypographyRootClass}`}
        style={venueWallUiScaleFrameStyle({ broadcast: isVenueBroadcast })}
        data-form-factor={floorSpec?.id}
        data-form-factor-renderer={floorSpec?.renderer}
      >

      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col ${venueFloorSpecMainPaddingClass(floorSpec)} ${
          venueFloorSpecMainPbClass(floorSpec, compactVenueHeadline)
        } ${showHeadline ? 'pt-0' : 'pt-[max(0.5rem,env(safe-area-inset-top,0px))]'}`}
      >
        {floorTiles.length > 0 ? (
          <section
            aria-label="Venue floor — all populated tables"
            className={`flex min-h-0 flex-1 flex-col ${compactVenueHeadline ? 'gap-0' : 'gap-1.5 sm:gap-2'}`}
          >
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Venue floor
            </p>

            {showHeadline ? (
              usesBroadcastHeadline ? (
                <VenueBroadcastHeadlineStrip
                  skipMountIntro={skipMountIntro}
                  showSetlistCue={showSetlistCue}
                  setlistCueNumber={setlistCueNumber}
                  setlistCueTotal={setlistCueTotal}
                  headlineQuestionDisplay={headlineQuestionDisplay}
                  broadcastMetaLine={broadcastMetaLine}
                  headlinePhaseBadge={headlinePhaseBadge}
                  showVenueBlindsHeadline={showVenueBlindsHeadline}
                  venueBlindsHeadline={venueBlindsHeadline}
                  inVenueShowdown={inVenueShowdown}
                  venueShowdownAnswer={venueShowdownAnswer}
                  headlineAnsweringUnified={headlineAnsweringUnified}
                  headlineAnswering={headlineAnswering}
                  inAnsweringCountdown={inAnsweringCountdown}
                  answerDeadlineMs={answerDeadlineMs}
                  answerSubmitCount={wall?.answerSubmitCount ?? null}
                  answerEligibleCount={wall?.answerEligibleCount ?? null}
                />
              ) : (
              <motion.div
                className={`sticky top-0 z-[45] shrink-0 flex w-full min-w-0 flex-col rounded-b-2xl border-2 border-yellow-400/85 bg-black/82 px-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-md sm:px-4 md:px-5 ${
                  ultraCompactVenueHeadline
                    ? 'gap-0.5 py-0.5'
                    : compactVenueHeadline
                      ? 'gap-1 py-1 sm:gap-1.5'
                      : 'gap-1.5 py-1.5 sm:gap-2 sm:py-2 md:gap-2.5 md:py-2'
                }`}
                style={{
                  paddingTop: 'max(0.35rem, env(safe-area-inset-top, 0px))',
                }}
                initial={skipMountIntro ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex w-full min-w-0 items-stretch gap-2 sm:gap-3 md:gap-4">
                <div
                  className={`pointer-events-none flex shrink-0 items-center self-center ${headlineLogoWidthClass}`}
                >
                  <div
                    className="w-full shadow-black/70 drop-shadow-xl"
                    style={{ aspectRatio: '958 / 592' }}
                  >
                    <QuizzEmWordmark layout="fill" />
                  </div>
                </div>
                <motion.div
                  className={`venue-headline-question-card flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl border border-casino-emerald/35 bg-black/35 shadow-[inset_0_0_0_1px_rgba(0,255,180,0.06)] backdrop-blur-md ${headlineQuestionCardPadClass}`}
                  initial={skipMountIntro ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {showSetlistCue || condenseProgress != null || headlineDivergenceNote ? (
                    <div className="flex min-w-0 items-start justify-between gap-x-2 gap-y-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        {showSetlistCue ? (
                          <span className={`inline-flex shrink-0 items-center rounded-md border border-violet-500/45 bg-violet-950/55 px-2 py-0.5 font-black uppercase tracking-wide text-violet-100/95 sm:px-2.5 sm:py-1 ${DISPLAY_TEXT_HEADLINE_SETLIST_BADGE}`}>
                            Question {setlistCueNumber} of {setlistCueTotal}
                          </span>
                        ) : null}
                        {headlineDivergenceNote ? (
                          <span className={`font-semibold text-white/65 ${DISPLAY_TEXT_HEADLINE_META}`}>
                            {headlineDivergenceNote}
                          </span>
                        ) : null}
                      </div>
                      {condenseProgress != null ? (
                        <VenueHeadlineCondenseStatsPill
                          model={condenseProgress}
                          className={`ml-auto shrink-0 ${headlineStatsClass}`}
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {headlineQuestionDisplay ? (
                    <DisplayFitQuestionText
                      text={headlineQuestionDisplay}
                      hostClassName={headlineQuestionFit.hostClassName}
                      maxFontVh={headlineQuestionFit.maxFontVh}
                      textClassName={`venue-headline-question-slot text-balance text-center tracking-tight text-yellow-400 ${headlineQuestionClass}`}
                    />
                  ) : inVenueShowdown ? (
                    <p className="sr-only">Showdown in progress.</p>
                  ) : inAnsweringCountdown ? (
                    <p className="text-left text-lg font-bold leading-snug tracking-tight text-cyan-200 sm:text-xl">
                      Answer on your phone now
                    </p>
                  ) : (
                    <p className="sr-only">Answering in progress.</p>
                  )}
                </motion.div>
                <VenueFloorHeadlineAside
                  answerDeadlineMs={answerDeadlineMs}
                  headlineAnsweringUnified={headlineAnsweringUnified}
                  headlineAnswering={headlineAnswering}
                  inAnsweringCountdown={inAnsweringCountdown}
                  inVenueShowdown={inVenueShowdown}
                  venueShowdownAnswer={venueShowdownAnswer}
                  headlinePhaseBadge={headlinePhaseBadge}
                  showVenueBlindsHeadline={showVenueBlindsHeadline}
                  venueBlindsHeadline={venueBlindsHeadline}
                  othersStillWagering={othersStillWagering}
                  answerSubmitCount={wall?.answerSubmitCount ?? null}
                  answerEligibleCount={wall?.answerEligibleCount ?? null}
                />
                </div>
              </motion.div>
              )
            ) : null}

            <div className="relative flex min-h-0 flex-1 flex-col">
              <AnimatePresence mode="wait">
                <VenueFloorBody
                  key={floorBodyKey}
                  floorSpec={floorSpec}
                  floorTiles={floorTiles}
                  showHeroSpotlight={showHeroSpotlight}
                  hostFocusTable={hostFocusTable}
                  featuredTile={featuredTile}
                  companionTiles={companionTiles}
                  showHeadline={showHeadline}
                  skipMountIntro={skipMountIntro}
                  prefersReducedMotion={prefersReducedMotion}
                  sharedShowdownAnswer={sharedShowdownAnswer}
                />
              </AnimatePresence>
            </div>
          </section>
        ) : tileRows.length > 0 ? (
          <motion.div
            className="rounded-2xl border border-yellow-700/35 bg-black/55 p-8 text-center shadow-xl backdrop-blur-md sm:p-10"
            initial={skipMountIntro ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-2xl font-semibold text-white/90 sm:text-3xl">
              Tables are open — waiting for players to sit.
            </p>
          </motion.div>
        ) : null}
      </main>

      {!showHeadline && condenseProgress != null && tileRows.length > 0 ? (
        <VenueCondenseProgressBar model={condenseProgress} variant="bottom" />
      ) : null}
      </div>
    </div>
  )
}
