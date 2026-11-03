import { formatTriviaNumber } from '@qhe/core'
import { ChipText } from '@qhe/ui'
import crownArt from './assets/showdown/crown.png'
import flourishLineArt from './assets/showdown/flourish-line.png'
import laurelLeftArt from './assets/showdown/laurel-left.png'
import laurelRightArt from './assets/showdown/laurel-right.png'
import nameplateArt from './assets/showdown/nameplate.png'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankroll } from './venueLeaderboard'
import type { ShowdownSidePotLine } from './venueFloorSidePotDisplay'
import { splitSharesMatch, splitWinnerPayouts, type SplitWinnerShare } from './VenueFloorShowdownOverlay'

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

function BroadcastSplitWinners({ shares }: { shares: readonly SplitWinnerShare[] }) {
  const visible = shares.length > 3 ? shares.slice(0, 3) : shares
  const extra = Math.max(0, shares.length - visible.length)
  const even = splitSharesMatch(visible)
  return (
    <div className="vfd-broadcast-showdown-reveal__hero vfd-broadcast-showdown-reveal__hero--split">
      {even ? (
        <>
          <ul className="vfd-broadcast-showdown-reveal__split-names" aria-label={shares.map((share) => share.name).join(', ')}>
            {visible.map((share) => (
              <li key={share.name} className="vfd-broadcast-showdown-reveal__split-name" title={share.name}>
                {share.name}
              </li>
            ))}
            {extra > 0 ? (
              <li className="vfd-broadcast-showdown-reveal__split-name vfd-broadcast-showdown-reveal__split-name--extra">
                +{extra} more
              </li>
            ) : null}
          </ul>
          <p className="vfd-broadcast-showdown-reveal__payout vfd-broadcast-showdown-reveal__payout--split">
            <ChipText text={formatVenueBankroll(visible[0]?.amount ?? 0)} />
            <span className="vfd-broadcast-showdown-reveal__payout-each"> each</span>
          </p>
        </>
      ) : (
        <ul className="vfd-broadcast-showdown-reveal__split-names" aria-label={visible.map((share) => `${share.name} ${formatVenueBankroll(share.amount)}`).join(', ')}>
          {visible.map((share) => (
            <li key={share.name} className="vfd-broadcast-showdown-reveal__split-name" title={share.name}>
              {share.name} <ChipText text={formatVenueBankroll(share.amount)} />
            </li>
          ))}
          {extra > 0 ? (
            <li className="vfd-broadcast-showdown-reveal__split-name vfd-broadcast-showdown-reveal__split-name--extra">
              +{extra} more
            </li>
          ) : null}
        </ul>
      )}
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
                <BroadcastSplitWinners shares={splitWinnerPayouts(winners, pot)} />
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
