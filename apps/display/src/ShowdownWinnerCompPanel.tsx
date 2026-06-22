import { Fragment } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import winnerStageArt from './assets/winner-stage.png'

/** Native pixels — keep in sync with `assets/winner-stage.png`. */
const WINNER_STAGE_WIDTH = 1619
const WINNER_STAGE_HEIGHT = 971
import { ShowdownFiveCardsUsed } from './showdownCardChips'
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

function ShowdownStageHeaderStrip({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center gap-[0.35em]">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#e2ad1a]/80 to-transparent" />
      <ShowdownGoldDiamond />
      <span className="shrink-0 font-black uppercase tracking-[0.2em] text-[#e2ad1a] drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] text-[clamp(0.42rem,4.2cqw,0.72rem)]">
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
}: {
  title: string
  names: readonly string[]
}) {
  return (
    <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--crown">
      <ShowdownStageHeaderStrip title={title} />
      <ShowdownStageName names={names} />
    </div>
  )
}

function ShowdownStagePotAmount({ amount, each = false }: { amount: number; each?: boolean }) {
  const digits = formatVenueBankrollDigits(Math.max(0, Math.round(amount)))
  return (
    <div className="flex items-baseline justify-center gap-[0.3em]">
      <span
        className="vfd-mosaic-stack vfd-mosaic-dollar vfd-mosaic-dollar--live vfd-showdown-stage-pot leading-none"
        aria-label={`$${digits}`}
      >
        <span className="vfd-mosaic-dollar-sign" aria-hidden>
          $
        </span>
        <span className="vfd-mosaic-dollar-digits">{digits}</span>
      </span>
      {each ? (
        <span className="font-bold uppercase tracking-[0.12em] text-[#e2ad1a]/90 text-[0.55em]">
          each
        </span>
      ) : null}
    </div>
  )
}

function ShowdownStageName({ names }: { names: readonly string[] }) {
  if (names.length === 0) return null

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
    <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--difference">
      <p className="vfd-showdown-stage-diff-label font-bold uppercase tracking-[0.12em] text-white/85">
        Difference
      </p>
      <p className="vfd-showdown-stage-diff-value vfd-showdown-difference-value font-black tabular-nums leading-none">
        {value}
      </p>
    </div>
  )
}

function ShowdownStageLaurelStack({
  pot,
  each,
  chipRow,
  showSideLedger,
  sidePotLines,
}: {
  pot: number
  each: boolean
  chipRow: ShowdownResultRow | null
  showSideLedger: boolean
  sidePotLines?: readonly ShowdownSidePotLine[] | null
}) {
  return (
    <div className="vfd-showdown-stage-laurel-stack">
      {pot > 0 ? <ShowdownStagePotAmount amount={pot} each={each} /> : null}
      <div className="vfd-showdown-stage-cards">
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
}: {
  headerTitle: string
  names: readonly string[]
  pot: number
  each: boolean
  chipRow: ShowdownResultRow | null
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
}) {
  const difference = formatWinnerDifference(chipRow, correctAnswer)
  const showSideLedger = sidePotLines != null && sidePotLines.length > 0

  return (
    <div className="vfd-showdown-stage" data-showdown-winner-comp>
      <div className="vfd-showdown-stage-frame">
        <div className="vfd-showdown-stage-art-box">
          <div className="vfd-showdown-stage-art-inner">
            <img
              src={winnerStageArt}
              alt=""
              aria-hidden
              className="vfd-showdown-stage-art"
              width={WINNER_STAGE_WIDTH}
              height={WINNER_STAGE_HEIGHT}
              draggable={false}
            />

            <div className="vfd-showdown-stage-overlay" aria-hidden>
              <ShowdownStageCrownBlock title={headerTitle} names={names} />

              <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--laurel">
                <ShowdownStageLaurelStack
                  pot={pot}
                  each={each}
                  chipRow={chipRow}
                  showSideLedger={showSideLedger}
                  sidePotLines={sidePotLines}
                />
              </div>

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
      />
    </div>
  )
}
