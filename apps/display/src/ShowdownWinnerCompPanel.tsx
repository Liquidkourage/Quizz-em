import { Fragment, useCallback, useState } from 'react'
import { formatTriviaNumber } from '@qhe/core'
import { ShowdownFiveCardsUsed } from './showdownCardChips'
import { ShowdownWinnerStageArtPortal, WINNER_STAGE_ART_SCALE } from './ShowdownWinnerStageArtPortal'
import type { ShowdownResultRow } from './showdownDisplay'
import { formatVenueBankrollDigits } from './venueLeaderboard'
import type { ShowdownSidePotLine } from './venueFloorSidePotDisplay'

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
  if (variant === 'split' || variant === 'side') {
    return null
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

function ShowdownStageVariantBanner({ variant }: { variant: 'split' | 'side' }) {
  const isSplit = variant === 'split'
  return (
    <div
      className={`vfd-showdown-stage-slot vfd-showdown-stage-slot--variant-banner${
        isSplit ? ' vfd-showdown-stage-slot--split-banner' : ' vfd-showdown-stage-slot--side-banner'
      }`}
    >
      <div
        className={`vfd-showdown-stage-variant-banner${
          isSplit ? ' vfd-showdown-stage-variant-banner--split' : ' vfd-showdown-stage-variant-banner--side'
        }`}
      >
        <ShowdownGoldDiamond />
        <span className="vfd-showdown-stage-variant-banner-text">
          {isSplit ? (
            <>
              <span className="vfd-showdown-stage-variant-banner-a">Split</span>
              <span className="vfd-showdown-stage-variant-banner-b">Pot</span>
            </>
          ) : (
            <>
              <span className="vfd-showdown-stage-variant-banner-a">Side</span>
              <span className="vfd-showdown-stage-variant-banner-b">Pot</span>
            </>
          )}
        </span>
        <ShowdownGoldDiamond />
      </div>
    </div>
  )
}

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
          <span className="vfd-showdown-stage-side-ledger-name" title={line.name}>
            {line.name}
          </span>
          <span className="vfd-showdown-stage-side-ledger-amount">
            ${line.amount.toLocaleString()}
          </span>
        </div>
      ))}
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
  const showTitleStrip = variant !== 'winner' && variant !== 'split' && variant !== 'side'

  const splitDensity =
    variant === 'split' ? (names.length >= 4 ? 'quad' : names.length === 3 ? 'triple' : 'pair') : null

  return (
    <div
      className={`vfd-showdown-stage-slot vfd-showdown-stage-slot--crown${
        variant === 'split'
          ? ` vfd-showdown-stage-slot--crown-split${
              splitDensity === 'quad'
                ? ' vfd-showdown-stage-slot--crown-split-quad'
                : splitDensity === 'triple'
                  ? ' vfd-showdown-stage-slot--crown-split-triple'
                  : ''
            }`
          : showTitleStrip
            ? ' vfd-showdown-stage-slot--crown-labelled'
            : ' vfd-showdown-stage-slot--crown-winner'
      }`}
    >
      {showTitleStrip ? <ShowdownStageHeaderStrip title={title} variant={variant} /> : null}
      <ShowdownStageName names={names} variant={variant} />
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
        className="vfd-showdown-stage-pot-inline-each vfd-mosaic-stack vfd-mosaic-dollar vfd-mosaic-dollar--live vfd-showdown-stage-pot inline-flex items-baseline justify-center leading-none"
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

function ShowdownStageDifference({ value }: { value: string }) {
  return (
    <div
      className="vfd-showdown-stage-slot vfd-showdown-stage-slot--difference"
      aria-label={`Difference ${value}`}
    >
      <p className="vfd-showdown-stage-diff-value vfd-showdown-difference-value tabular-nums leading-none">
        {value}
      </p>
    </div>
  )
}

function ShowdownStageCardsBlock({ chipRow }: { chipRow: ShowdownResultRow | null }) {
  return (
    <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--cards">
      {chipRow != null ? (
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
              {variant === 'split' || variant === 'side' ? (
                <ShowdownStageVariantBanner variant={variant} />
              ) : null}

              {variant !== 'side' ? (
                <ShowdownStageCrownBlock title={headerTitle} names={names} variant={variant} />
              ) : null}

              {variant === 'side' && sidePotLines != null && sidePotLines.length > 0 ? (
                <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--side-ledger">
                  <ShowdownStageSidePotSummary lines={sidePotLines} />
                </div>
              ) : pot > 0 ? (
                <div className="vfd-showdown-stage-slot vfd-showdown-stage-slot--pot">
                  <ShowdownStagePotAmount amount={pot} each={each} eachInline={variant === 'split'} />
                </div>
              ) : null}

              <ShowdownStageCardsBlock chipRow={chipRow} />

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
