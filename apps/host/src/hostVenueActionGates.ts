import type { GameState } from '@qhe/core'
import type { HostVenueFeltBeatRow } from '@qhe/net'

export type VenueBetPhaseSig = { br: number; open: boolean; cc: number }

/** Matches server `phaseStrictSignature` for betting phases. */
export function parseVenueBetPhaseSig(sig: string | null | undefined): VenueBetPhaseSig | null {
  if (sig == null || sig === '') return null
  const m = /^bet\|(\d+)\|([TF?])\|cc(\d+)$/.exec(sig)
  if (!m) return null
  return {
    br: Number(m[1]),
    open: m[2] === 'T',
    cc: Number(m[3]) || 0,
  }
}

function seatedVenueRows(rows: HostVenueFeltBeatRow[] | null): HostVenueFeltBeatRow[] {
  return rows?.filter((r) => r.active && r.seated > 0) ?? []
}

function venueBeatLockstep(rows: HostVenueFeltBeatRow[]): {
  misaligned: boolean
  rowsWithSig: HostVenueFeltBeatRow[]
} {
  const rowsWithSig = rows.filter((r) => r.phaseStrictSig != null && r.phaseStrictSig !== '')
  if (rowsWithSig.length < 2) {
    return { misaligned: false, rowsWithSig }
  }
  const sigs = new Set(rowsWithSig.map((r) => r.phaseStrictSig!))
  return { misaligned: sigs.size > 1, rowsWithSig }
}

export function feltInPreBoardBetting(row: HostVenueFeltBeatRow): boolean {
  if (row.phase !== 'betting') return false
  const parsed = parseVenueBetPhaseSig(row.phaseStrictSig)
  return parsed != null && parsed.br === 1 && parsed.cc === 0
}

/** Venue-wide gate for Deal Community Cards — every seated felt must be pre-board with wagering closed. */
export function venueDealCommunityBlockedHint(rows: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueRows(rows)
  if (seated.length === 0) {
    return 'No seated tables at this venue — assign from lobby or seed rehearsal first.'
  }
  const notPreBoard = seated.filter((r) => !feltInPreBoardBetting(r))
  if (notPreBoard.length > 0) {
    const nums = notPreBoard
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    return `Tables ${nums} are not ready for the board (need wagering round 1, no community cards yet). Check Venue felts · beat.`
  }
  const stillOpen = seated.filter((r) => parseVenueBetPhaseSig(r.phaseStrictSig)?.open === true)
  if (stillOpen.length > 0) {
    const nums = stillOpen
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    return `Tables ${nums} still have wagering open — close round 1 on every felt before dealing the board.`
  }
  return null
}

/** Venue-wide gate for admin close betting — lockstep + every felt has the clock open. */
export function venueCloseBettingBlockedHint(rows: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueRows(rows)
  if (seated.length === 0) {
    return 'No seated tables at this venue.'
  }
  const { misaligned } = venueBeatLockstep(seated)
  if (misaligned) {
    return 'Tables are out of sync — align every felt before closing wagering venue-wide.'
  }
  const notOpen = seated.filter((r) => {
    const parsed = parseVenueBetPhaseSig(r.phaseStrictSig)
    return !(r.phase === 'betting' && parsed?.open === true)
  })
  if (notOpen.length > 0) {
    return 'Not every table has wagering open — wait for lockstep or check Venue felts · beat.'
  }
  return null
}

/** Venue-wide gate for start answering — lockstep post-board, clock closed, full board. */
export function venueStartAnswerBlockedHint(rows: HostVenueFeltBeatRow[] | null): string | null {
  const seated = seatedVenueRows(rows)
  if (seated.length === 0) {
    return 'No seated tables at this venue.'
  }
  const { misaligned } = venueBeatLockstep(seated)
  if (misaligned) {
    return 'Tables are out of sync — align every felt before opening the answer window.'
  }
  const notReady = seated.filter((r) => {
    const parsed = parseVenueBetPhaseSig(r.phaseStrictSig)
    return !(r.phase === 'betting' && parsed?.br === 2 && parsed.open === false && parsed.cc >= 5)
  })
  if (notReady.length > 0) {
    const nums = notReady
      .map((r) => r.tableNum)
      .sort((a, b) => a - b)
      .join(', ')
    return `Tables ${nums} are not ready (need post-board wagering closed with a full board).`
  }
  return null
}

export function hostDealCommunityGate(args: {
  hasVenueBeat: boolean
  venueBeat: HostVenueFeltBeatRow[] | null
  controlState: GameState
}): { blocked: boolean; hint: string | null } {
  if (args.hasVenueBeat) {
    const hint = venueDealCommunityBlockedHint(args.venueBeat)
    return { blocked: hint != null, hint }
  }
  const round = args.controlState.round
  const bettingRound = round.bettingRound ?? 0
  const communityLen = round.communityCards?.length ?? 0
  const bettingOpen = round.isBettingOpen !== false
  if (args.controlState.phase !== 'betting' || bettingRound !== 1 || communityLen >= 5) {
    const hint =
      args.controlState.phase !== 'betting'
        ? 'Available during wagering (betting phase).'
        : bettingRound !== 1
          ? 'Board already dealt — you are in wagering round 2.'
          : communityLen >= 5
            ? 'Board is already complete.'
            : null
    return { blocked: true, hint }
  }
  if (bettingOpen) {
    return {
      blocked: true,
      hint: 'Close wagering round 1 before dealing the board.',
    }
  }
  return { blocked: false, hint: null }
}

export function hostCloseBettingGate(args: {
  hasVenueBeat: boolean
  venueBeat: HostVenueFeltBeatRow[] | null
  controlState: GameState
}): { blocked: boolean; hint: string | null } {
  const bettingOpen = args.controlState.round.isBettingOpen !== false
  if (args.controlState.phase !== 'betting' || !bettingOpen) {
    return { blocked: true, hint: null }
  }
  if (args.hasVenueBeat) {
    const hint = venueCloseBettingBlockedHint(args.venueBeat)
    return { blocked: hint != null, hint }
  }
  return { blocked: false, hint: null }
}

export function hostStartAnswerGate(args: {
  hasVenueBeat: boolean
  venueBeat: HostVenueFeltBeatRow[] | null
  controlState: GameState
}): { blocked: boolean; hint: string | null } {
  if (args.hasVenueBeat) {
    const hint = venueStartAnswerBlockedHint(args.venueBeat)
    return { blocked: hint != null, hint }
  }
  const round = args.controlState.round
  const bettingRound = round.bettingRound ?? 0
  const communityLen = round.communityCards?.length ?? 0
  const bettingOpen = round.isBettingOpen !== false
  if (
    args.controlState.phase !== 'betting' ||
    bettingOpen ||
    communityLen < 5 ||
    bettingRound !== 2
  ) {
    return {
      blocked: true,
      hint: 'Needs full board (5 community cards) and both wagering rounds closed.',
    }
  }
  return { blocked: false, hint: null }
}
