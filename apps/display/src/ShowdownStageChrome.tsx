import type { ReactNode } from 'react'
import crownArt from './assets/showdown/crown.png'
import flourishLineArt from './assets/showdown/flourish-line.png'
import laurelLeftArt from './assets/showdown/laurel-left.png'
import laurelRightArt from './assets/showdown/laurel-right.png'
import nameplateArt from './assets/showdown/nameplate.png'
import type { ShowdownStageDensityTier } from './showdownStageArtLayout'
import { showdownStageDenseFrameStyle } from './showdownStageDenseRubric'

function ShowdownFlourishBanner({ variant }: { variant: 'split' | 'side' }) {
  const isSplit = variant === 'split'
  return (
    <div className="vfd-showdown-stage-flourish">
      <img
        src={flourishLineArt}
        alt=""
        aria-hidden
        draggable={false}
        className="vfd-showdown-stage-flourish-art"
      />
      <span
        className={`vfd-showdown-stage-flourish-label${
          isSplit ? ' vfd-showdown-stage-flourish-label--split' : ' vfd-showdown-stage-flourish-label--side'
        }`}
      >
        <span className="vfd-showdown-stage-flourish-a">{isSplit ? 'Split' : 'Side'}</span>
        <span className="vfd-showdown-stage-flourish-b">Pot</span>
      </span>
    </div>
  )
}

/**
 * Layered winner-stage chrome — crown, laurels, flourish, and nameplate as separate assets.
 * Live text (names, pot, cards, diff) renders in the center column.
 */
export function ShowdownStageChrome({
  variant,
  densityTier,
  sideLedgerRows = 0,
  sideLedgerCompact = false,
  layoutPayoutLineCount = 1,
  difference = null,
  children,
}: {
  variant: 'winner' | 'split' | 'side'
  densityTier: ShowdownStageDensityTier
  sideLedgerRows?: number
  sideLedgerCompact?: boolean
  layoutPayoutLineCount?: number
  difference?: string | null
  children: ReactNode
}) {
  const payoutLines = Math.max(1, Math.min(layoutPayoutLineCount, 4))
  return (
    <div
      className="vfd-showdown-stage"
      data-showdown-winner-comp
      data-stage-variant={variant}
      data-stage-density={densityTier}
      data-stage-layout="composed"
      data-side-ledger-rows={sideLedgerRows > 0 ? String(sideLedgerRows) : undefined}
      data-side-ledger-compact={sideLedgerCompact ? '' : undefined}
      data-layout-payout-lines={payoutLines > 1 ? String(payoutLines) : undefined}
      data-layout-payout-lines-many={payoutLines >= 3 ? '' : undefined}
    >
      <div
        className="vfd-showdown-stage-frame vfd-showdown-stage-frame--composed"
        style={densityTier === 'dense' ? showdownStageDenseFrameStyle() : undefined}
      >
        <img
          src={laurelLeftArt}
          alt=""
          aria-hidden
          draggable={false}
          className="vfd-showdown-stage-laurel vfd-showdown-stage-laurel--left"
        />
        <img
          src={laurelRightArt}
          alt=""
          aria-hidden
          draggable={false}
          className="vfd-showdown-stage-laurel vfd-showdown-stage-laurel--right"
        />
        <div className="vfd-showdown-stage-column">
          {variant === 'split' || variant === 'side' ? (
            <div className="vfd-showdown-stage-crown-stack">
              <ShowdownFlourishBanner variant={variant} />
              <img
                src={crownArt}
                alt=""
                aria-hidden
                draggable={false}
                className="vfd-showdown-stage-crown"
              />
            </div>
          ) : (
            <img
              src={crownArt}
              alt=""
              aria-hidden
              draggable={false}
              className="vfd-showdown-stage-crown"
            />
          )}
          <div className="vfd-showdown-stage-content">{children}</div>
          {difference != null ? (
            <div className="vfd-showdown-stage-nameplate-wrap" aria-label={`Difference ${difference}`}>
              <img
                src={nameplateArt}
                alt=""
                aria-hidden
                draggable={false}
                className="vfd-showdown-stage-nameplate"
              />
              <p className="vfd-showdown-stage-diff-value vfd-showdown-difference-value tabular-nums leading-none">
                {difference}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
