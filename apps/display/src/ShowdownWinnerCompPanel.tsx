import { Fragment } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { ShowdownStageChrome } from './ShowdownStageChrome'
import { showdownStageDensityTier } from './showdownStageArtLayout'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankrollDigits } from './venueLeaderboard'
import type { ShowdownSidePotLine } from './venueFloorSidePotDisplay'

function chunkNamesForLines(names: readonly string[], perLine: number): string[][] {
  const chunks: string[][] = []
  for (let i = 0; i < names.length; i += perLine) {
    chunks.push(names.slice(i, i + perLine))
  }
  return chunks
}

function ShowdownStageSidePotSummary({ lines }: { lines: readonly ShowdownSidePotLine[] }) {
  return (
    <div className="vfd-showdown-stage-side-ledger">
      {lines.map((line) => (
        <div key={`${line.label}:${line.name}`} className="vfd-showdown-stage-side-ledger-row">
          <span
            className={`vfd-showdown-stage-side-ledger-label vfd-showdown-stage-side-ledger-label--${line.label.toLowerCase()}`}
          >
            {line.label}
          </span>
          <div className="vfd-showdown-stage-side-ledger-detail">
            <span className="vfd-showdown-stage-side-ledger-name" title={line.name}>
              {line.name}
            </span>
            <span className="vfd-showdown-stage-side-ledger-amount">
              ${line.amount.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ShowdownStagePotAmount({
  amount,
  each = false,
  eachInline = false,
}: {
  amount: number
  each?: boolean
  eachInline?: boolean
}) {
  const digits = formatVenueBankrollDigits(Math.max(0, Math.round(amount)))

  if (each && eachInline) {
    return (
      <span
        className="vfd-showdown-stage-pot vfd-showdown-stage-pot-inline-each vfd-mosaic-dollar vfd-mosaic-dollar--live inline-flex items-baseline justify-center leading-none"
        aria-label={`$${digits} each`}
      >
        <span className="vfd-mosaic-dollar-sign" aria-hidden>
          $
        </span>
        <span className="vfd-mosaic-dollar-digits">{digits}</span>
        <span className="vfd-showdown-stage-pot-each-inline font-black uppercase tracking-[0.12em] text-[#fff4dc]">
          each
        </span>
      </span>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center leading-none ${
        each ? 'gap-[0.12em]' : ''
      }`}
    >
      <span
        className="vfd-showdown-stage-pot vfd-mosaic-dollar vfd-mosaic-dollar--live inline-flex items-baseline justify-center gap-[0.3em]"
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

  if (variant === 'split' && names.length >= 4) {
    const visible = names.slice(0, 4)
    return (
      <div
        className="vfd-showdown-stage-split-names-quad grid w-full max-w-full grid-cols-2 gap-x-[0.35em] gap-y-[0.08em] px-[2%]"
        aria-label={visible.join(', ')}
      >
        {visible.map((name) => (
          <span
            key={name}
            className="vfd-showdown-stage-name vfd-showdown-stage-name--split-quad min-w-0 truncate text-center font-black leading-none text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
            title={name}
          >
            {name}
          </span>
        ))}
      </div>
    )
  }

  if (variant === 'split' && names.length === 3) {
    const lines = chunkNamesForLines(names, 2)
    return (
      <div className="vfd-showdown-stage-split-names-compact vfd-showdown-stage-split-names-compact--triple flex w-full max-w-full flex-col items-center gap-[0.1em] px-[1%] text-center">
        {lines.map((line) => (
          <div
            key={line.join(':')}
            className="flex max-w-full flex-wrap items-center justify-center gap-x-[0.32em] gap-y-0 leading-none"
          >
            {line.map((name, index) => (
              <Fragment key={name}>
                {index > 0 ? (
                  <span className="vfd-showdown-stage-split-dot-compact shrink-0 font-black text-[#e2ad1a]" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="vfd-showdown-stage-name vfd-showdown-stage-name--split-compact font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {name}
                </span>
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'split' && names.length > 0) {
    const perLine = names.length <= 2 ? names.length : 2
    const lines = chunkNamesForLines(names, perLine)
    return (
      <div className="vfd-showdown-stage-split-names-compact flex w-full max-w-full flex-col items-center gap-[0.14em] px-[1%] text-center">
        {lines.map((line) => (
          <div
            key={line.join(':')}
            className="flex max-w-full flex-wrap items-center justify-center gap-x-[0.32em] gap-y-0 leading-none"
          >
            {line.map((name, index) => (
              <Fragment key={name}>
                {index > 0 ? (
                  <span className="vfd-showdown-stage-split-dot-compact shrink-0 font-black text-[#e2ad1a]" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className="vfd-showdown-stage-name vfd-showdown-stage-name--split-compact font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                  {name}
                </span>
              </Fragment>
            ))}
          </div>
        ))}
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

function ShowdownStageTemplate({
  names,
  pot,
  each,
  chipRow,
  correctAnswer,
  sidePotLines,
  variant,
  layoutTableCount,
}: {
  names: readonly string[]
  pot: number
  each: boolean
  chipRow: ShowdownResultRow | null
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
  variant: 'winner' | 'split' | 'side'
  layoutTableCount: number
}) {
  const difference = formatWinnerDifference(chipRow, correctAnswer)
  const sideLedgerRows = sidePotLines?.length ?? 0
  const densityTier = showdownStageDensityTier(layoutTableCount)

  return (
    <ShowdownStageChrome
      variant={variant}
      densityTier={densityTier}
      sideLedgerRows={sideLedgerRows}
      sideLedgerCompact={sideLedgerRows >= 3}
      difference={difference}
    >
      {variant !== 'side' ? (
        <div
          className={`vfd-showdown-stage-block vfd-showdown-stage-block--names${
            variant === 'split'
              ? names.length >= 4
                ? ' vfd-showdown-stage-block--names-split-quad'
                : names.length === 3
                  ? ' vfd-showdown-stage-block--names-split-triple'
                  : ' vfd-showdown-stage-block--names-split'
              : ' vfd-showdown-stage-block--names-winner'
          }`}
        >
          <ShowdownStageName names={names} variant={variant} />
        </div>
      ) : null}

      {variant === 'side' && sidePotLines != null && sidePotLines.length > 0 ? (
        <div className="vfd-showdown-stage-block vfd-showdown-stage-block--side-ledger">
          <ShowdownStageSidePotSummary lines={sidePotLines} />
        </div>
      ) : pot > 0 ? (
        <div className="vfd-showdown-stage-block vfd-showdown-stage-block--pot">
          <ShowdownStagePotAmount amount={pot} each={each} eachInline={variant === 'split'} />
        </div>
      ) : null}

      <div className="vfd-showdown-stage-block vfd-showdown-stage-block--cards">
        {chipRow != null ? (
          <ShowdownFiveCardsUsed row={chipRow} size="stage" />
        ) : (
          <span className="text-[0.5rem] text-white/30">—</span>
        )}
      </div>
    </ShowdownStageChrome>
  )
}

export function ShowdownWinnerCompPanel({
  variant,
  winners,
  chipRow,
  pot,
  correctAnswer,
  sidePotLines,
  layoutTableCount,
}: {
  variant: 'winner' | 'split' | 'side'
  winners: readonly ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  pot: number
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
  layoutTableCount: number
}) {
  const names = winners.map((w) => w.name).filter(Boolean)
  const each = variant === 'split'

  return (
    <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <ShowdownStageTemplate
        names={names}
        pot={pot}
        each={each}
        chipRow={chipRow}
        correctAnswer={correctAnswer}
        sidePotLines={sidePotLines}
        variant={variant}
        layoutTableCount={layoutTableCount}
      />
    </div>
  )
}
