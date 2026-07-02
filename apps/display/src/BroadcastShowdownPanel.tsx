import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankroll } from './venueLeaderboard'
import type { ShowdownSidePotLine } from './venueFloorSidePotDisplay'
import { ShowdownStageChrome } from './ShowdownStageChrome'

type BroadcastShowdownVariant = 'winner' | 'split' | 'side'

function formatDifference(
  row: ShowdownResultRow | null,
  correctAnswer: number | undefined
): string | null {
  if (row == null || correctAnswer == null || row.submitted == null) return null
  const diff = row.submitted - correctAnswer
  const sign = diff >= 0 ? '+' : '-'
  return `${sign}${formatTriviaNumber(Math.abs(diff))}`
}

function BroadcastSplitWinners({
  names,
  amountPerWinner,
}: {
  names: readonly string[]
  amountPerWinner: number
}) {
  const shareLabel = formatVenueBankroll(Math.max(0, Math.round(amountPerWinner)))
  return (
    <div className="vfd-broadcast-showdown-split">
      <p className="vfd-broadcast-showdown-name vfd-broadcast-showdown-name--split">
        {names.join(' · ')}
      </p>
      <p className="vfd-broadcast-showdown-payout">{shareLabel} each</p>
    </div>
  )
}

function BroadcastSidePotLedger({ lines }: { lines: readonly ShowdownSidePotLine[] }) {
  return (
    <ul className="vfd-broadcast-showdown-side-pot" aria-label="Side pot breakdown">
      {lines.map((line) => (
        <li key={`${line.label}:${line.name}`} className="vfd-broadcast-showdown-side-pot-row">
          <span className="vfd-broadcast-showdown-side-pot-label">{line.label}</span>
          <span className="vfd-broadcast-showdown-side-pot-name">{line.name}</span>
          <span className="vfd-broadcast-showdown-side-pot-amount">
            {formatVenueBankroll(line.amount)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function BroadcastShowdownPanel({
  variant,
  winners,
  chipRow,
  pot,
  correctAnswer,
  sidePotLines,
  label: _label,
}: {
  variant: BroadcastShowdownVariant
  winners: readonly ShowdownResultRow[]
  chipRow: ShowdownResultRow | null
  pot: number
  correctAnswer: number | undefined
  sidePotLines?: readonly ShowdownSidePotLine[] | null
  label: string
}) {
  const names = winners.map((w) => w.name).filter(Boolean)
  const difference = formatDifference(chipRow, correctAnswer)
  const submittedLabel =
    chipRow?.submitted != null ? formatTriviaNumber(chipRow.submitted) : null
  const sideLedgerRows = sidePotLines?.length ?? 0
  const splitRows = variant === 'split' ? Math.min(names.length, 4) : 0

  return (
    <div className="vfd-broadcast-showdown">
      <div className="vfd-broadcast-showdown-stage">
        <ShowdownStageChrome
          variant={variant}
          densityTier="hero"
          tableCount={1}
          sideLedgerRows={sideLedgerRows}
          splitRows={splitRows}
          difference={difference}
        >
          <div className="vfd-broadcast-showdown-body">
            {variant === 'side' && sidePotLines != null && sidePotLines.length > 0 ? (
              <BroadcastSidePotLedger lines={sidePotLines} />
            ) : variant === 'split' ? (
              <BroadcastSplitWinners names={names} amountPerWinner={pot} />
            ) : names.length > 0 ? (
              <>
                <p className="vfd-broadcast-showdown-name">{names[0]}</p>
                {pot > 0 ? (
                  <p className="vfd-broadcast-showdown-payout">{formatVenueBankroll(pot)}</p>
                ) : null}
              </>
            ) : null}

            {chipRow != null ? (
              <div className="vfd-broadcast-showdown-cards">
                <ShowdownFiveCardsUsed row={chipRow} size="broadcast" />
              </div>
            ) : null}

            {submittedLabel != null ? (
              <p className="vfd-broadcast-showdown-submitted-line">
                Answer {submittedLabel}
              </p>
            ) : null}
          </div>
        </ShowdownStageChrome>
      </div>
    </div>
  )
}
