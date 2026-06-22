import { Fragment, useCallback, useState } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { ShowdownWinnerStageArtPortal, WINNER_STAGE_ART_SCALE } from './ShowdownWinnerStageArtPortal'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankrollDigits } from './venueLeaderboard'
import { ShowdownPotWinnerList, type ShowdownSidePotLine } from './venueFloorSidePotDisplay'

function ShowdownGoldDiamond() {
  return (
    <span
      aria-hidden
      className="inline-block h-[0.42em] w-[0.42em] rotate-45 rounded-[1px] bg-gradient-to-br from-[#fff1c2] via-[#e2ad1a] to-[#8a6718] shadow-[0_0_5px_rgba(251,191,36,0.5)]"
    />
  )
}

function ShowdownStageHeaderStrip({
  title,
  variant,
}: {
  title: string
  variant: 'winner' | 'split' | 'side'
}) {
  if (variant === 'split') {
    return (
      <div className="vfd-showdown-stage-split-header flex w-full items-center gap-[0.35em]">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/80 to-transparent" />
        <ShowdownGoldDiamond />
        <span className="vfd-showdown-stage-split-title flex shrink-0 flex-col items-center leading-none">
          <span>Split</span>
          <span>Pot</span>
        </span>
        <ShowdownGoldDiamond />
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/80 to-transparent" />
      </div>
    )
  }

  return (
    <div className="flex w-full items-center gap-[0.35em]">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/80 to-transparent" />
      <ShowdownGoldDiamond />
      <span className="vfd-showdown-stage-title shrink-0 font-black uppercase tracking-[0.2em] text-[#e2ad1a]">
        {title}
      </span>
      <ShowdownGoldDiamond />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/80 to-transparent" />
    </div>
  )
}

function ShowdownStageCrownBlock({
  title,
  names,
  variant,
}: {
  title: string
  names: readonly string[]
  variant: 'winner' | 'split' | 'side'
}) {
  const showTitleStrip = variant !== 'winner'

  return (
    <div
      className={`vfd-showdown-stage-slot vfd-showdown-stage-slot--crown${
        showTitleStrip
          ? variant === 'split'
            ? ' vfd-showdown-stage-slot--crown-split'
            : ' vfd-showdown-stage-slot--crown-labelled'
          : ' vfd-showdown-stage-slot--crown-winner'
      }`}
    >
      {showTitleStrip ? <ShowdownStageHeaderStrip title={title} variant={variant} /> : null}
      <ShowdownStageName names={names} variant={variant} />
    </div>
  )
}

function ShowdownStagePotAmount({ amount, each = false }: { amount: number; each?: boolean }) {
  const digits = formatVenueBankrollDigits(Math.max(0, Math.round(amount)))
  return (
    <div
      className={`flex flex-col items-center justify-center leading-none ${
        each ? 'gap-[0.12em]' : ''
      }`}
    >
      <span
        className="vfd-mosaic-stack vfd-mosaic-dollar vfd-mosaic-dollar--live vfd-showdown-stage-pot inline-flex items-baseline justify-center gap-[0.3em]"
        aria-label={`$${digits}${each ? ' each' : ''}`}
      >
        <span className="vfd-mosaic-dollar-sign" aria-hidden>
          $
        </span>
        <span className="vfd-mosaic-dollar-digits">{digits}</span>
      </span>
      {each ? (
        <span className="vfd-showdown-stage-pot-each font-black uppercase tracking-[0.14em] text-[#fff4dc]">
          each
        </span>
      ) : null}
    </div>
  )
}

function ShowdownStageName({
  names,
  variant,
}: {
  names: readonly string[]
  variant: 'winner' | 'split' | 'side'
}) {
  if (names.length === 0) return null

  if (variant === 'split' && names.length > 1) {
    return (
      <div className="vfd-showdown-stage-split-names flex max-w-full flex-col items-center gap-[0.06em] text-center">
        {names.slice(0, 3).map((name) => (
          <p
            key={name}
            className="vfd-showdown-stage-name vfd-showdown-stage-name--split max-w-full truncate font-black leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
          >
            {name}
          </p>
        ))}
        {names.length > 3 ? (
          <p className="vfd-showdown-stage-name vfd-showdown-stage-name--split-more font-black leading-none text-white/75">
            +{names.length - 3} more
          </p>
        ) : null}
      </div>
    )
  }

  if (names.length === 1) {
    return (
      <p className="vfd-showdown-stage-name max-w-full truncate font-black leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
        {names[0]}
      </p>
    )
  }

  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-x-0.5 gap-y-0 text-center">
      {names.map((name, index) => (
        <Fragment key={name}>
          {index > 0 ? (
            <span className="text-white/50" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="vfd-showdown-stage-name max-w-[min(100%,5.5rem)] truncate font-black leading-none text-white">
            {name}
          </span>
        </Fragment>
      ))}
    </div>
  )
}

function formatWinnerDifference(
  row: ShowdownResultRow | null,
  correctAnswer: number | undefined
): string | null {
  if (row == null || correctAnswer == null || row.submitted == null) return null
  const diff = row.submitted - correctAnswer
  const sign = diff >= 0 ? '+' : '-'
  return `${sign}${formatTriviaNumber(Math.abs(diff))}`
}

function ShowdownStageDifference({ value }: { value: string }) {
  return (
    <div
      className="vfd-showdown-stage-slot vfd-showdown-stage-slot--difference"
      aria-label={`Difference ${value}`}
    >
      <p className="vfd-showdown-stage-diff-value vfd-showdown-difference-value font-black tabular-nums leading-none">
        {value}
      </p>
    </div>
  )
}

function ShowdownStageCardsBlock({
  chipRow,
  showSideLedger,
  sidePotLines,
}: {
  chipRow: ShowdownResultRow | null
  showSideLedger: boolean
  sidePotLines?: readonly ShowdownSidePotLine[] | null
}) {
  return (
    <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--cards">
      {showSideLedger ? (
        <div className="flex w-full flex-col items-center gap-[0.12em] px-[2%]">
          <ShowdownPotWinnerList lines={sidePotLines!} />
          {chipRow != null ? <ShowdownFiveCardsUsed row={chipRow} size="stage" /> : null}
        </div>
      ) : chipRow != null ? (
        <ShowdownFiveCardsUsed row={chipRow} size="stage" />
      ) : (
        <span className="text-[0.5rem] text-white/30">—</span>
      )}
    </div>
  )
}

function ShowdownStageTemplate({
  headerTitle,
  names,
  pot,
  each,
  chipRow,
  correctAnswer,
  sidePotLines,
  variant,
}: {
  headerTitle: string
  names: readonly string[]
  pot: number
  each: boolean
  chipRow: ShowdownResultRow | null
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
  variant: 'winner' | 'split' | 'side'
}) {
  const difference = formatWinnerDifference(chipRow, correctAnswer)
  const showSideLedger = sidePotLines != null && sidePotLines.length > 0
  const [artBox, setArtBox] = useState<HTMLDivElement | null>(null)
  const bindArtBoxRef = useCallback((node: HTMLDivElement | null) => {
    setArtBox(node)
  }, [])

  return (
    <div
      className="vfd-showdown-stage"
      data-showdown-winner-comp
      style={{ ['--vfd-stage-art-scale' as string]: String(WINNER_STAGE_ART_SCALE) }}
    >
      <div className="vfd-showdown-stage-frame">
        <div ref={bindArtBoxRef} className="vfd-showdown-stage-art-box">
          <ShowdownWinnerStageArtPortal artBox={artBox} />
          <div className="vfd-showdown-stage-overlay" aria-hidden>
            <div className="vfd-showdown-stage-zoom-frame">
              <ShowdownStageCrownBlock title={headerTitle} names={names} variant={variant} />

              {pot > 0 ? (
                <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--pot">
                  <ShowdownStagePotAmount amount={pot} each={each} />
                </div>
              ) : null}

              <ShowdownStageCardsBlock
                chipRow={chipRow}
                showSideLedger={showSideLedger}
                sidePotLines={sidePotLines}
              />

              {difference != null ? <ShowdownStageDifference value={difference} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ShowdownWinnerCompPanel({
  variant,
  winners,
  chipRow,
  pot,
  correctAnswer,
  sidePotLines,
}: {
  variant: 'winner' | 'split' | 'side'
  winners: readonly ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  pot: number
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
}) {
  const headerTitle =
    variant === 'split' ? 'Split pot' : variant === 'side' ? 'Side pot' : 'Winner'
  const names = winners.map((w) => w.name).filter(Boolean)
  const each = variant === 'split'

  return (
    <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <ShowdownStageTemplate
        headerTitle={headerTitle}
        names={names}
        pot={pot}
        each={each}
        chipRow={chipRow}
        correctAnswer={correctAnswer}
        sidePotLines={sidePotLines}
        variant={variant}
      />
    </div>
  )
}
