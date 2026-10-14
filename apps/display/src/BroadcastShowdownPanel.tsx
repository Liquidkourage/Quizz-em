import { formatTriviaNumber } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import crownArt from './assets/showdown/crown.png'
import flourishLineArt from './assets/showdown/flourish-line.png'
import laurelLeftArt from './assets/showdown/laurel-left.png'
import laurelRightArt from './assets/showdown/laurel-right.png'
import nameplateArt from './assets/showdown/nameplate.png'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankroll } from './venueLeaderboard'
import type { ShowdownSidePotLine } from './venueFloorSidePotDisplay'

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

function BroadcastFlourishBanner({ variant }: { variant: 'split' | 'side' }) {
  const isSplit = variant === 'split'
  return (
    <div className="vfd-broadcast-showdown-reveal__flourish">
      <img
        src={flourishLineArt}
        alt=""
        aria-hidden
        draggable={false}
        className="vfd-broadcast-showdown-reveal__flourish-art"
      />
      <span
        className={`vfd-broadcast-showdown-reveal__flourish-label${
          isSplit
            ? ' vfd-broadcast-showdown-reveal__flourish-label--split'
            : ' vfd-broadcast-showdown-reveal__flourish-label--side'
        }`}
      >
        <span>{isSplit ? 'Split' : 'Side'}</span>
        <span>Pot</span>
      </span>
    </div>
  )
}

function BroadcastSplitWinners({
  names,
  amountPerWinner,
}: {
  names: readonly string[]
  amountPerWinner: number
}) {
  const shareLabel = formatVenueBankroll(Math.max(0, Math.round(amountPerWinner)))
  const visible = names.length > 3 ? names.slice(0, 3) : names
  const extra = Math.max(0, names.length - visible.length)
  return (
    <div className="vfd-broadcast-showdown-reveal__hero vfd-broadcast-showdown-reveal__hero--split">
      <ul className="vfd-broadcast-showdown-reveal__split-names" aria-label={names.join(', ')}>
        {visible.map((name) => (
          <li key={name} className="vfd-broadcast-showdown-reveal__split-name" title={name}>
            {name}
          </li>
        ))}
        {extra > 0 ? (
          <li className="vfd-broadcast-showdown-reveal__split-name vfd-broadcast-showdown-reveal__split-name--extra">
            +{extra} more
          </li>
        ) : null}
      </ul>
      <p className="vfd-broadcast-showdown-reveal__payout vfd-broadcast-showdown-reveal__payout--split">
        <ChipText text={shareLabel} />
        <span className="vfd-broadcast-showdown-reveal__payout-each"> each</span>
      </p>
    </div>
  )
}

function BroadcastSidePotLedger({ lines }: { lines: readonly ShowdownSidePotLine[] }) {
  return (
    <ul className="vfd-broadcast-showdown-reveal__side-pot" aria-label="Side pot breakdown">
      {lines.map((line) => (
        <li key={`${line.label}:${line.name}`} className="vfd-broadcast-showdown-reveal__side-pot-row">
          <span className="vfd-broadcast-showdown-reveal__side-pot-label">{line.label}</span>
          <span className="vfd-broadcast-showdown-reveal__side-pot-name">{line.name}</span>
          <span className="vfd-broadcast-showdown-reveal__side-pot-amount">
            <ChipText text={formatVenueBankroll(line.amount)} />
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

  const cardSize = variant === 'split' || variant === 'side' ? 'broadcast' : 'broadcast-hero'

  return (
    <div
      className="vfd-broadcast-showdown-reveal"
      data-reveal-variant={variant}
    >
      <div className="vfd-broadcast-showdown-reveal__backdrop" aria-hidden />
      <div className="vfd-broadcast-showdown-reveal__spotlight" aria-hidden />
      <div className="vfd-broadcast-showdown-reveal__stage">
        <div className="vfd-broadcast-showdown-reveal__plaque">
          {/* Banner → crown → body: never overlap flourish with the crown. */}
          {variant === 'split' || variant === 'side' ? (
            <BroadcastFlourishBanner variant={variant} />
          ) : null}
          <img
            src={crownArt}
            alt=""
            aria-hidden
            draggable={false}
            className="vfd-broadcast-showdown-reveal__crown"
          />

          <div className="vfd-broadcast-showdown-reveal__frame">
            <img
              src={laurelLeftArt}
              alt=""
              aria-hidden
              draggable={false}
              className="vfd-broadcast-showdown-reveal__laurel vfd-broadcast-showdown-reveal__laurel--left"
            />
            <img
              src={laurelRightArt}
              alt=""
              aria-hidden
              draggable={false}
              className="vfd-broadcast-showdown-reveal__laurel vfd-broadcast-showdown-reveal__laurel--right"
            />

            <div className="vfd-broadcast-showdown-reveal__content">
              {variant === 'side' && sidePotLines != null && sidePotLines.length > 0 ? (
                <BroadcastSidePotLedger lines={sidePotLines} />
              ) : variant === 'split' ? (
                <BroadcastSplitWinners names={names} amountPerWinner={pot} />
              ) : names.length > 0 ? (
                <div className="vfd-broadcast-showdown-reveal__hero">
                  <p className="vfd-broadcast-showdown-reveal__name">{names[0]}</p>
                  {pot > 0 ? (
                    <p className="vfd-broadcast-showdown-reveal__payout">
                      <ChipText text={formatVenueBankroll(pot)} />
                    </p>
                  ) : null}
                </div>
              ) : null}

              {chipRow != null ? (
                <section
                  className="vfd-broadcast-showdown-reveal__answer"
                  aria-label={`Winning answer ${chipRow.submitted != null ? formatTriviaNumber(chipRow.submitted) : ''}`}
                >
                  <h3 className="vfd-broadcast-showdown-reveal__section-label">Winning Answer</h3>
                  <div className="vfd-broadcast-showdown-reveal__cards">
                    <ShowdownFiveCardsUsed row={chipRow} size={cardSize} />
                  </div>
                </section>
              ) : null}

              {difference != null ? (
                <section
                  className="vfd-broadcast-showdown-reveal__difference"
                  aria-label={`Difference ${difference}`}
                >
                  <div className="vfd-broadcast-showdown-reveal__nameplate">
                    <img
                      src={nameplateArt}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="vfd-broadcast-showdown-reveal__nameplate-art"
                    />
                    <p className="vfd-broadcast-showdown-reveal__diff-value">{difference}</p>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
