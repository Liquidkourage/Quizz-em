import { Fragment } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { ShowdownStageChrome } from './ShowdownStageChrome'
import { showdownStageDensityTier } from './showdownStageArtLayout'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankrollDigits } from './venueLeaderboard'
import type { ShowdownSidePotLine } from './venueFloorSidePotDisplay'

function ShowdownStageSplitLedger({
  names,
  amountPerWinner,
}: {
  names: readonly string[]
  amountPerWinner: number
}) {
  const visible = names.length > 4 ? names.slice(0, 4) : names
  if (visible.length === 0) return null

  const amountLabel = `$${Math.max(0, Math.round(amountPerWinner)).toLocaleString()}`

  return (
    <div
      className="vfd-showdown-stage-side-ledger vfd-showdown-stage-side-ledger--split-share"
      data-split-rows={String(visible.length)}
      aria-label={visible.map((name) => `${name} ${amountLabel}`).join(', ')}
    >
      <div className="vfd-showdown-stage-side-ledger-side-stack">
        {visible.map((name) => (
          <div key={name} className="vfd-showdown-stage-side-ledger-side-row">
            <span className="vfd-showdown-stage-side-ledger-label vfd-showdown-stage-side-ledger-label--share">
              Share
            </span>
            <span
              className="vfd-showdown-stage-side-ledger-name vfd-showdown-stage-side-ledger-name--share"
              title={name}
            >
              {name}
            </span>
            <span className="vfd-showdown-stage-side-ledger-amount vfd-showdown-stage-side-ledger-amount--share">
              {amountLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ShowdownStageSidePotSummary({ lines }: { lines: readonly ShowdownSidePotLine[] }) {
  const mainLine = lines.find((line) => line.label === 'Main')
  const secondaryLines = lines.filter((line) => line.label !== 'Main')
  const useMainBand = mainLine != null && secondaryLines.length > 0

  if (useMainBand && mainLine) {
    return (
      <div className="vfd-showdown-stage-side-ledger vfd-showdown-stage-side-ledger--main-band">
        <div
          className="vfd-showdown-stage-side-ledger-main-hero"
          aria-label={`Main pot ${mainLine.name} $${mainLine.amount.toLocaleString()}`}
        >
          <span className="vfd-showdown-stage-side-ledger-main-badge">Main</span>
          <span
            className="vfd-showdown-stage-side-ledger-name vfd-showdown-stage-side-ledger-name--main"
            title={mainLine.name}
          >
            {mainLine.name}
          </span>
          <span className="vfd-showdown-stage-side-ledger-amount vfd-showdown-stage-side-ledger-amount--main">
            ${mainLine.amount.toLocaleString()}
          </span>
        </div>
        <div className="vfd-showdown-stage-side-ledger-side-stack">
          {secondaryLines.map((line) => (
            <div
              key={`${line.label}:${line.name}`}
              className="vfd-showdown-stage-side-ledger-side-row"
            >
              <span
                className={`vfd-showdown-stage-side-ledger-label vfd-showdown-stage-side-ledger-label--${line.label.toLowerCase()}`}
              >
                {line.label}
              </span>
              <span
                className={`vfd-showdown-stage-side-ledger-name vfd-showdown-stage-side-ledger-name--${line.label.toLowerCase()}`}
                title={line.name}
              >
                {line.name}
              </span>
              <span
                className={`vfd-showdown-stage-side-ledger-amount vfd-showdown-stage-side-ledger-amount--${line.label.toLowerCase()}`}
              >
                ${line.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

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
            <span
              className={`vfd-showdown-stage-side-ledger-name vfd-showdown-stage-side-ledger-name--${line.label.toLowerCase()}`}
              title={line.name}
            >
              {line.name}
            </span>
            <span
              className={`vfd-showdown-stage-side-ledger-amount vfd-showdown-stage-side-ledger-amount--${line.label.toLowerCase()}`}
            >
              ${line.amount.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ShowdownStagePotAmount({ amount }: { amount: number }) {
  const digits = formatVenueBankrollDigits(Math.max(0, Math.round(amount)))

  return (
    <span
      className="vfd-showdown-stage-pot vfd-mosaic-dollar vfd-mosaic-dollar--live inline-flex items-baseline justify-center gap-[0.3em] leading-none"
      aria-label={`$${digits}`}
    >
      <span className="vfd-mosaic-dollar-sign" aria-hidden>
        $
      </span>
      <span className="vfd-mosaic-dollar-digits">{digits}</span>
    </span>
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

function ShowdownStageTemplate({
  names,
  pot,
  chipRow,
  correctAnswer,
  sidePotLines,
  variant,
  layoutTableCount,
}: {
  names: readonly string[]
  pot: number
  chipRow: ShowdownResultRow | null
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
  variant: 'winner' | 'split' | 'side'
  layoutTableCount: number
}) {
  const difference = formatWinnerDifference(chipRow, correctAnswer)
  const sideLedgerRows = sidePotLines?.length ?? 0
  const splitRows = variant === 'split' ? Math.min(names.length, 4) : 0
  const densityTier = showdownStageDensityTier(layoutTableCount)

  const upperBlock =
    variant === 'side' && sidePotLines != null && sidePotLines.length > 0 ? (
      <div className="vfd-showdown-stage-block vfd-showdown-stage-block--side-ledger">
        <ShowdownStageSidePotSummary lines={sidePotLines} />
      </div>
    ) : variant === 'split' ? (
      <div className="vfd-showdown-stage-block vfd-showdown-stage-block--side-ledger">
        <ShowdownStageSplitLedger names={names} amountPerWinner={pot} />
      </div>
    ) : (
      <>
        <div className="vfd-showdown-stage-block vfd-showdown-stage-block--names">
          <ShowdownStageName names={names} />
        </div>
        {pot > 0 ? (
          <div className="vfd-showdown-stage-block vfd-showdown-stage-block--pot">
            <ShowdownStagePotAmount amount={pot} />
          </div>
        ) : null}
      </>
    )

  return (
    <ShowdownStageChrome
      variant={variant}
      densityTier={densityTier}
      sideLedgerRows={sideLedgerRows}
      splitRows={splitRows}
      difference={difference}
    >
      <div className="vfd-showdown-stage-well">
        <div className="vfd-showdown-stage-upper">{upperBlock}</div>
        <div className="vfd-showdown-stage-cards-row">
          {chipRow != null ? (
            <ShowdownFiveCardsUsed row={chipRow} size="stage" />
          ) : (
            <span className="text-[0.5rem] text-white/30">—</span>
          )}
        </div>
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

  return (
    <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
      <ShowdownStageTemplate
        names={names}
        pot={pot}
        chipRow={chipRow}
        correctAnswer={correctAnswer}
        sidePotLines={sidePotLines}
        variant={variant}
        layoutTableCount={layoutTableCount}
      />
    </div>
  )
}
