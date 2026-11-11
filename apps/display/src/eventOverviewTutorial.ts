export const EVENT_OVERVIEW_STEPS = [
  {
    label: 'GETTING STARTED',
    title: 'There are two ways to compete throughout Quizz’em.',
    body: 'Players at the poker tables compete for chips. Every player who submits an answer also appears on a separate accuracy leaderboard, regardless of whether they still have chips.',
    note: 'Your chip stack and your accuracy standing are two separate things.',
    remaining: 18,
    accuracy: 18,
    tables: 3,
    durationMs: 9000,
  },
  {
    label: 'EACH QUESTION COUNTS TWICE',
    title: 'A question can change both competitions.',
    body: 'At the table, you decide how much to bet and try to win the pot. Your submitted numeric answer also contributes to your accuracy ranking against everyone playing in the event.',
    note: 'Winning the pot and giving the most accurate answer are not necessarily the same thing.',
    remaining: 18,
    accuracy: 18,
    tables: 3,
    durationMs: 9500,
  },
  {
    label: 'CHIP STACKS',
    title: 'The poker tournament continues from hand to hand.',
    body: 'Chip stacks carry over, and the blinds and betting keep the action moving. You can win more chips on one hand and lose them on the next, while your guesses continue to count toward accuracy.',
    note: 'Your poker position depends on chips; your other standing depends on your guesses.',
    remaining: 18,
    accuracy: 18,
    tables: 3,
    durationMs: 9500,
  },
  {
    label: 'RUN OUT OF CHIPS?',
    title: 'You can bust out of poker and still keep playing.',
    body: 'When your chip stack reaches zero, you stop competing for pots. But you can still submit an answer to every new question and continue climbing the all-player accuracy leaderboard.',
    note: 'Purple player markers show people with no chips who are still answering.',
    remaining: 10,
    accuracy: 18,
    tables: 3,
    durationMs: 10500,
  },
  {
    label: 'JOINING LATE',
    title: 'Arriving late doesn’t mean missing the rest of the game.',
    body: 'Late arrivals can join the accuracy competition and begin submitting guesses while the poker tournament is already underway. Everyone stays on the same accuracy leaderboard.',
    note: 'The example leaderboard now includes someone who joined after the opening hands.',
    remaining: 10,
    accuracy: 21,
    tables: 3,
    durationMs: 10000,
  },
  {
    label: 'TABLES COMBINE',
    title: 'The poker tables shrink, but the guessing continues.',
    body: 'As players run out of chips, the host can rebalance and combine tables until only the final poker players remain. Meanwhile, the accuracy leaderboard continues to include everybody.',
    note: 'Moving poker seats changes nothing about the accuracy competition.',
    remaining: 6,
    accuracy: 21,
    tables: 1,
    durationMs: 10500,
  },
  {
    label: 'TWO RESULTS',
    title: 'The poker champion and accuracy leader are separate results.',
    body: 'The last player with chips wins the poker tournament. The accuracy leaderboard ranks all participating players based on how accurate their guesses were, including late arrivals and players who busted earlier.',
    note: 'The same player could lead both competitions, but they don’t have to.',
    remaining: 1,
    accuracy: 21,
    tables: 1,
    durationMs: 11000,
  },
] as const

export const EVENT_OVERVIEW_SEAT_SLOTS = [
  [50, 5],
  [83, 23],
  [88, 71],
  [50, 96],
  [12, 71],
  [17, 23],
] as const

const FINAL_TABLE_LABELS = [2, 6, 8, 11, 14, 17] as const

export type EventSeatKind = 'plain' | 'strong' | 'low' | 'bust' | 'winner'

export type EventOverviewFrame = {
  stepIndex: number
  stepLabel: string
  label: string
  title: string
  body: string
  note: string
  remaining: number
  remainingWord: string
  accuracy: number
  tables: number
  tablesWord: string
  durationMs: number
  tableName: string
  emptyTables: readonly boolean[]
  ranks: readonly { name: string; status: string; special: boolean }[]
}

function wrapStep(index: number): number {
  const count = EVENT_OVERVIEW_STEPS.length
  return ((index % count) + count) % count
}

function ranksFor(step: number): EventOverviewFrame['ranks'] {
  const rows =
    step < 3
      ? [
          [2, 'At a table'],
          [4, 'At a table'],
          [8, 'At a table'],
        ]
      : step === 3
        ? [
            [4, 'No chips; still playing'],
            [8, 'At a table'],
            [3, 'At a table'],
          ]
        : [
            [4, 'No chips; still playing'],
            [20, 'Joined late'],
            [8, 'At a table'],
          ]
  return rows.map(([num, status]) => ({
    name: `Player ${num}`,
    status: String(status),
    special: status !== 'At a table',
  }))
}

export function eventSeatFace(tableIndex: number, seatIndex: number, step: number): { label: string; kind: EventSeatKind } {
  const shown = wrapStep(step)
  if (shown >= 5 && tableIndex === 2) {
    const kind: EventSeatKind = shown === 6 && seatIndex === 2 ? 'winner' : shown === 6 ? 'bust' : 'plain'
    return { label: String(FINAL_TABLE_LABELS[seatIndex] ?? seatIndex + 1), kind }
  }
  let kind: EventSeatKind = 'plain'
  if (shown === 1 && seatIndex === (tableIndex + 1) % 6) kind = 'strong'
  if (shown === 2 && (seatIndex === (tableIndex + 1) % 6 || seatIndex === (tableIndex + 4) % 6)) kind = 'strong'
  if (shown >= 3) {
    const keep = (tableIndex === 0 ? [0, 2, 5] : tableIndex === 1 ? [1, 3, 5] : [0, 1, 3, 4]).includes(seatIndex)
    if (!keep) kind = 'bust'
    else if (seatIndex === (tableIndex + 4) % 6) kind = 'low'
  }
  return { label: String(1 + tableIndex * 6 + seatIndex), kind }
}

export function eventOverviewFrame(index: number): EventOverviewFrame {
  const stepIndex = wrapStep(index)
  const beat = EVENT_OVERVIEW_STEPS[stepIndex]!
  return {
    stepIndex,
    stepLabel: `STEP ${stepIndex + 1} OF ${EVENT_OVERVIEW_STEPS.length}`,
    label: beat.label,
    title: beat.title,
    body: beat.body,
    note: beat.note,
    remaining: beat.remaining,
    remainingWord: beat.remaining === 1 ? 'player with chips' : 'players with chips',
    accuracy: beat.accuracy,
    tables: beat.tables,
    tablesWord: beat.tables === 1 ? 'active table' : 'active tables',
    durationMs: beat.durationMs,
    tableName: stepIndex >= 5 ? 'FINAL TABLE' : 'TABLE 3',
    emptyTables: [stepIndex >= 5, stepIndex >= 5, false],
    ranks: ranksFor(stepIndex),
  }
}
