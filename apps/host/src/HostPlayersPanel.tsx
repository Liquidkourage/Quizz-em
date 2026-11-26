import { useState } from 'react'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { cardInputForPlayer, firstMatchingPlayer, handHistoryText, handoffPhoneChoices, hostPlayerCard, lastStreetAction, playerAttention, undoBetOffered, type HostHandLine } from './hostPlayerCard'

export type HostRosterSeat = {
  playerId: string
  name: string
  tableNum: number
  phone?: 'connected' | 'offline' | 'bot'
  offlineSec?: number | null
  triviaPoints?: number
  allIn?: boolean
  excused?: boolean
  handoff?: boolean
  canUndoBet?: boolean
}

export type HostManagedPlayer = {
  playerId: string
  name: string
  /** Null while they are still in the waiting room. */
  tableNum: number | null
}

export type HostFeltChair = {
  name: string
  offFelt?: boolean
  seatIndex?: number
  kind?: 'pot' | 'points'
  reason?: 'folded' | 'busted' | null
  bankroll?: number
  invested?: number
  guess?: number
  guessLocked?: boolean
}

export type HostFeltTable = {
  tableNum: number
  phase?: string
  actingPlayerName?: string | null
  seats: readonly HostFeltChair[]
}

const FELT_SLOTS = [
  { left: '50%', top: '10%' },
  { left: '78%', top: '24%' },
  { left: '90%', top: '50%' },
  { left: '78%', top: '76%' },
  { left: '50%', top: '90%' },
  { left: '22%', top: '76%' },
  { left: '10%', top: '50%' },
  { left: '22%', top: '24%' },
] as const

export function hostManagedPlayers(
  roster: readonly HostRosterSeat[],
  waiting: readonly { id: string; name: string }[] = [],
): HostManagedPlayer[] {
  const seated = new Set(roster.map((player) => player.playerId))
  const rows: HostManagedPlayer[] = [
    ...waiting
      .filter((player) => !seated.has(player.id))
      .map((player) => ({ playerId: player.id, name: player.name, tableNum: null })),
    ...roster.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tableNum: player.tableNum,
    })),
  ]
  return rows.sort((a, b) => (a.tableNum ?? 0) - (b.tableNum ?? 0) || a.name.localeCompare(b.name))
}

export function alphabeticalPlayers(
  players: readonly HostManagedPlayer[],
  label: (name: string) => string,
): HostManagedPlayer[] {
  return [...players].sort(
    (a, b) => label(a.name).localeCompare(label(b.name)) || a.playerId.localeCompare(b.playerId),
  )
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function claimSlot(wanted: number, used: Set<number>): number {
  for (let step = 0; step < FELT_SLOTS.length; step++) {
    const slot = (wanted + step) % FELT_SLOTS.length
    if (!used.has(slot)) {
      used.add(slot)
      return slot
    }
  }
  return wanted
}

function feltSeatsForTable(
  tableNum: number,
  seats: readonly HostFeltChair[],
  roster: readonly HostRosterSeat[],
): { playerId: string; name: string; seatIndex: number }[] {
  const pool = roster.filter((player) => player.tableNum === tableNum)
  const onFelt = seats.filter((seat) => seat.offFelt !== true && seat.name.trim())
  const used = new Set<number>()
  const placed: { playerId: string; name: string; seatIndex: number }[] = []
  const source = onFelt.length > 0 ? onFelt : pool.map((player) => ({ name: player.name }))
  for (const seat of source) {
    const index = pool.findIndex((player) => sameName(player.name, seat.name))
    if (index < 0) continue
    const player = pool.splice(index, 1)[0]!
    const wanted = 'seatIndex' in seat && typeof seat.seatIndex === 'number' ? seat.seatIndex : placed.length
    placed.push({ playerId: player.playerId, name: player.name, seatIndex: claimSlot(wanted, used) })
  }
  return placed
}

function tableNumbers(roster: readonly HostRosterSeat[], tables: readonly HostFeltTable[]): number[] {
  const nums = new Set<number>()
  for (const table of tables) nums.add(table.tableNum)
  for (const player of roster) nums.add(player.tableNum)
  return [...nums].sort((a, b) => a - b)
}

function destinationFor(player: HostManagedPlayer, chosen: number | undefined): number {
  if (chosen != null) return chosen
  return player.tableNum === 1 ? 2 : 1
}

function HostPlayerFelt({
  tableNum,
  tableNums: nums,
  seats,
  selectedId,
  hostPlayerLabel,
  onShowTable,
  onSelect,
}: {
  tableNum: number | null
  tableNums: number[]
  seats: readonly { playerId: string; name: string; seatIndex: number; attention?: { offline: boolean; toAct: boolean; noGuess: boolean } }[]
  selectedId: string | null
  hostPlayerLabel: (name: string) => string
  onShowTable: (tableNum: number) => void
  onSelect: (playerId: string) => void
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Tables">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Show table ${n}`}
            aria-pressed={n === tableNum}
            onClick={() => onShowTable(n)}
            className={`min-h-11 rounded-lg border px-3 text-sm font-bold ${
              n === tableNum
                ? 'border-emerald-300 bg-emerald-900/70 text-white'
                : 'border-white/15 bg-black/35 text-white/75'
            }`}
          >
            Table {n}
          </button>
        ))}
      </div>
      <div className="host-player-felt relative mx-auto aspect-[8/5] w-full max-w-xl rounded-[50%] border border-emerald-700/70 bg-emerald-950/80">
        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-100/50">
          {tableNum == null ? 'No felt' : `Table ${tableNum}`}
        </p>
        {seats.map((seat) => {
          const slot = FELT_SLOTS[seat.seatIndex] ?? FELT_SLOTS[0]
          const label = hostPlayerLabel(seat.name)
          const selected = selectedId === seat.playerId
          return (
            <button
              key={seat.playerId}
              type="button"
              aria-label={`Select ${label}`}
              aria-pressed={selected}
              onClick={() => onSelect(seat.playerId)}
              style={{ left: slot.left, top: slot.top }}
              className={`absolute flex min-h-11 min-w-11 max-w-[9rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-3 text-sm font-semibold leading-tight ${
                seat.attention?.offline ? 'opacity-40' : ''
              } ${seat.attention?.toAct ? 'ring-2 ring-amber-300' : ''} ${
                seat.attention?.noGuess ? 'border-dashed' : ''
              } ${
                selected
                  ? 'border-amber-200 bg-amber-400 text-black'
                  : 'border-white/30 bg-black/70 text-white'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function HostPlayerIndex({
  players,
  selectedId,
  hostPlayerLabel,
  attentionFor,
  onSelect,
}: {
  players: readonly HostManagedPlayer[]
  selectedId: string | null
  hostPlayerLabel: (name: string) => string
  attentionFor: (player: HostManagedPlayer) => { offline: boolean; toAct: boolean; noGuess: boolean }
  onSelect: (player: HostManagedPlayer) => void
}) {
  return (
    <ul className="host-player-index min-h-0 space-y-0.5 overflow-y-auto" aria-label="Players A to Z">
      {players.map((player) => {
        const label = hostPlayerLabel(player.name)
        const selected = selectedId === player.playerId
        const attention = attentionFor(player)
        return (
          <li key={player.playerId}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(player)}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm ${
                attention.offline ? 'opacity-40' : ''
              } ${attention.toAct ? 'ring-2 ring-amber-300' : ''} ${
                attention.noGuess ? 'border border-dashed border-white/40' : ''
              } ${selected ? 'bg-amber-400/20 text-amber-50' : 'text-white hover:bg-white/5'}`}
            >
              <span className="break-words font-semibold">{label}</span>
              <span className="shrink-0 text-white/55">
                {player.tableNum == null ? 'Waiting' : `Table ${player.tableNum}`}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function HostHandHistory({ lines }: { lines: readonly HostHandLine[] }) {
  if (lines.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Hand history</p>
      <ul className="mt-1 max-h-48 space-y-2 overflow-y-auto">
        {lines.map((line) => {
          const text = handHistoryText(line)
          return (
            <li key={`${line.playerId}-${line.questionNum}`} className="text-sm text-white">
              <p className="font-semibold">{text.title}</p>
              {text.prompt ? <p className="break-words text-white/70">{text.prompt}</p> : null}
              <p className="break-words text-white/80">{text.detail}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function guessPhase(phase: string | null): boolean {
  return phase === 'answering' || phase === 'reveal' || phase === 'showdown'
}

function PhoneRuling({
  phones,
  onHand,
}: {
  phones: readonly { id: string; name: string }[]
  onHand?: (waitingPlayerId: string) => void
}) {
  const [phoneId, setPhoneId] = useState(phones[0] ? phones[0].id : '')
  if (!onHand || phones.length === 0) return null
  const chosen = phones.length === 1 ? phones[0].id : phoneId
  return (
    <>
      {phones.length > 1 ? (
        <select
          aria-label="New phone"
          value={phoneId}
          onChange={(event) => setPhoneId(event.target.value)}
          className="min-h-11 rounded-md border border-white/20 bg-zinc-950 px-2 text-sm text-white"
        >
          {phones.map((phone) => (
            <option key={phone.id} value={phone.id}>
              {phone.name}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        className="min-h-11 rounded-md border border-emerald-300/50 px-3 text-sm font-bold text-emerald-100"
        onClick={() => onHand(chosen)}
      >
        This phone
      </button>
    </>
  )
}

function GuessRuling({
  phase,
  guessText,
  onReplace,
  onExcuse,
}: {
  phase: string | null
  guessText: string
  onReplace?: (answer: number) => void
  onExcuse?: () => void
}) {
  const [draft, setDraft] = useState(guessText)
  if (!guessPhase(phase)) return null
  return (
    <>
      {onReplace ? (
        <>
          <input
            aria-label="Replacement guess"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 w-28 rounded-md border border-white/20 bg-zinc-950 px-2 text-sm text-white"
          />
          <button
            type="button"
            className="min-h-11 rounded-md border border-amber-300/50 px-3 text-sm font-bold text-amber-100"
            onClick={() => onReplace(Number(draft))}
          >
            Replace guess
          </button>
        </>
      ) : null}
      {onExcuse ? (
        <button
          type="button"
          className="min-h-11 rounded-md border border-white/20 px-3 text-sm font-bold text-white/80"
          onClick={onExcuse}
        >
          Excuse
        </button>
      ) : null}
    </>
  )
}

function HostPlayerRulings({
  phase,
  canUndo,
  guessText,
  waitingPhones,
  onHandPhone,
  onUndoBet,
  onReplaceGuess,
  onExcuse,
}: {
  phase: string | null
  canUndo: boolean
  guessText: string
  waitingPhones: readonly { id: string; name: string }[]
  onHandPhone?: (waitingPlayerId: string) => void
  onUndoBet?: () => void
  onReplaceGuess?: (answer: number) => void
  onExcuse?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PhoneRuling phones={waitingPhones} onHand={onHandPhone} />
      {undoBetOffered(phase, canUndo) && onUndoBet ? (
        <button
          type="button"
          className="min-h-11 rounded-md border border-sky-300/50 px-3 text-sm font-bold text-sky-100"
          onClick={onUndoBet}
        >
          Undo last bet
        </button>
      ) : null}
      <GuessRuling phase={phase} guessText={guessText} onReplace={onReplaceGuess} onExcuse={onExcuse} />
    </div>
  )
}

function HostSelectedPlayer({
  player,
  lines,
  hostPlayerLabel,
  armed,
  destination,
  onDestination,
  onMove,
  onRemove,
  phase,
  canUndo,
  guessText,
  waitingPhones,
  onHandPhone,
  onUndoBet,
  onReplaceGuess,
  onExcuse,
  history,
}: {
  player: HostManagedPlayer | null
  lines: { label: string; value: string }[]
  hostPlayerLabel: (name: string) => string
  armed: boolean
  destination: number
  onDestination: (tableNum: number) => void
  onMove?: (playerId: string, toTableNum: number) => void
  onRemove: () => void
  phase: string | null
  canUndo: boolean
  guessText: string
  waitingPhones: readonly { id: string; name: string }[]
  onHandPhone?: (waitingPlayerId: string) => void
  onUndoBet?: () => void
  onReplaceGuess?: (answer: number) => void
  onExcuse?: () => void
  history: readonly HostHandLine[]
}) {
  if (player == null) {
    return <p className="text-sm text-white/55">Select a player on the felt or the list.</p>
  }
  const label = hostPlayerLabel(player.name)
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
      <div>
        <p className="break-words text-base font-semibold text-white">{label}</p>
        {lines.length > 0 ? (
          <dl className="mt-2 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
            {lines.map((line) => (
              <div key={line.label} className="contents">
                <dt className="text-white/50">{line.label}</dt>
                <dd className="break-words text-white">{line.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      <HostHandHistory lines={history} />
      <HostPlayerRulings
        key={player.playerId}
        phase={phase}
        canUndo={canUndo}
        guessText={guessText}
        waitingPhones={waitingPhones}
        onHandPhone={onHandPhone}
        onUndoBet={onUndoBet}
        onReplaceGuess={onReplaceGuess}
        onExcuse={onExcuse}
      />
      <div className="flex flex-wrap items-center gap-2">
      {onMove && player.tableNum != null ? (
        <>
          <select
            aria-label={`Move ${label} to`}
            value={destination}
            onChange={(event) => onDestination(Number(event.target.value))}
            className="min-h-11 rounded-md border border-white/20 bg-zinc-950 px-2 text-sm text-white [color-scheme:dark]"
          >
            {Array.from({ length: VENUE_NUMBERED_TABLE_MAX }, (_, index) => index + 1).map((n) => (
              <option key={n} value={n}>
                Table {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="min-h-11 rounded-md border border-sky-300/50 px-3 text-sm font-bold text-sky-100 disabled:opacity-40"
            disabled={destination === player.tableNum}
            onClick={() => onMove(player.playerId, destination)}
          >
            Move
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="min-h-11 rounded-md border border-rose-400/50 px-3 text-sm font-bold text-rose-100"
        aria-label={armed ? `Remove ${label} from the room` : `Remove ${label}`}
        onClick={onRemove}
      >
        {armed ? 'Remove them' : 'Remove'}
      </button>
      </div>
    </div>
  )
}

function seatForPlayer(
  player: HostManagedPlayer,
  roster: readonly HostRosterSeat[],
  table: HostFeltTable | null,
): HostFeltChair | null {
  if (player.tableNum == null || table == null) return null
  const mates = roster.filter((row) => row.tableNum === player.tableNum)
  const pool = table.seats.filter((seat) => seat.offFelt !== true)
  for (const mate of mates) {
    const index = pool.findIndex((seat) => seat.name.trim().toLowerCase() === mate.name.trim().toLowerCase())
    const seat = index < 0 ? undefined : pool.splice(index, 1)[0]
    if (mate.playerId === player.playerId) return seat ?? null
  }
  return null
}

function markPhone(
  playerId: string,
  roster: readonly HostRosterSeat[],
  waiting: readonly { id: string; phone?: HostRosterSeat['phone'] }[],
): HostRosterSeat['phone'] | undefined {
  const facts = roster.find((row) => row.playerId === playerId)
  if (facts) return facts.phone
  const lobby = waiting.find((row) => row.id === playerId)
  return lobby ? lobby.phone : undefined
}

function attentionOf(
  player: HostManagedPlayer,
  roster: readonly HostRosterSeat[],
  waiting: readonly { id: string; phone?: HostRosterSeat['phone'] }[],
  tables: readonly HostFeltTable[],
) {
  const table = tables.find((row) => row.tableNum === player.tableNum)
  const seat = seatForPlayer(player, roster, table ?? null)
  const actingName = table && table.actingPlayerName ? table.actingPlayerName : ''
  const phase = table && table.phase ? table.phase : null
  return playerAttention({
    phone: markPhone(player.playerId, roster, waiting),
    toAct: actingName.trim().toLowerCase() === player.name.trim().toLowerCase() && phase === 'betting',
    phase,
    guess: seat && typeof seat.guess === 'number' ? seat.guess : null,
    guessLocked: seat ? seat.guessLocked === true : false,
  })
}

function selectedCardLines(
  player: HostManagedPlayer | null,
  roster: readonly HostRosterSeat[],
  waiting: readonly { id: string; phone?: HostRosterSeat['phone']; offlineSec?: number | null; triviaPoints?: number; allIn?: boolean }[],
  tables: readonly HostFeltTable[],
  moves: readonly { tableNum: number; playerName: string; kind: string; summary: string }[],
  correctAnswer: number | null,
): { label: string; value: string }[] {
  if (player == null) return []
  const facts = roster.find((row) => row.playerId === player.playerId)
  const lobby = waiting.find((row) => row.id === player.playerId)
  const table = tables.find((row) => row.tableNum === player.tableNum) ?? null
  return hostPlayerCard(
    cardInputForPlayer({
      tableNum: player.tableNum,
      seat: seatForPlayer(player, roster, table),
      phone: facts?.phone ?? lobby?.phone,
      offlineSec: facts?.offlineSec ?? lobby?.offlineSec,
      allIn: facts?.allIn ?? lobby?.allIn,
      triviaPoints: facts?.triviaPoints ?? lobby?.triviaPoints,
      phase: table?.phase ?? null,
      actingName: table?.actingPlayerName ?? null,
      playerName: player.name,
      lastAction: lastStreetAction(moves, player.tableNum, player.name),
      correctAnswer,
      excused: facts?.excused,
    }),
  )
}

function matchingPlayers(
  listed: readonly HostManagedPlayer[],
  query: string,
  label: (name: string) => string,
): readonly HostManagedPlayer[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return listed
  return listed.filter((player) => label(player.name).toLowerCase().includes(needle))
}

export function HostPlayersPanel({
  roster,
  waiting = [],
  tables = [],
  moves = [],
  correctAnswer = null,
  hostPlayerLabel,
  onRemove,
  onMove,
  onHandPhone,
  onUndoBet,
  onReplaceGuess,
  onExcuse,
  handHistory = [],
}: {
  roster: readonly HostRosterSeat[]
  waiting?: readonly {
    id: string
    name: string
    phone?: HostRosterSeat['phone']
    offlineSec?: number | null
    triviaPoints?: number
    allIn?: boolean
  }[]
  tables?: readonly HostFeltTable[]
  moves?: readonly { tableNum: number; playerName: string; kind: string; summary: string }[]
  correctAnswer?: number | null
  hostPlayerLabel: (name: string) => string
  onRemove: (playerId: string) => void
  onMove?: (playerId: string, toTableNum: number) => void
  onHandPhone?: (playerId: string, waitingPlayerId: string) => void
  onUndoBet?: (playerId: string) => void
  onReplaceGuess?: (playerId: string, answer: number) => void
  onExcuse?: (playerId: string) => void
  handHistory?: readonly HostHandLine[]
}) {
  const players = hostManagedPlayers(roster, waiting)
  const nums = tableNumbers(roster, tables)
  const [feltTable, setFeltTable] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [destinations, setDestinations] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  const currentTable = feltTable != null && nums.includes(feltTable) ? feltTable : (nums[0] ?? null)
  const chairs = tables.find((table) => table.tableNum === currentTable)?.seats ?? []
  const felt = currentTable == null ? [] : feltSeatsForTable(currentTable, chairs, roster)
  const selected = players.find((player) => player.playerId === selectedId) ?? null
  const lines = selectedCardLines(selected, roster, waiting, tables, moves, correctAnswer)
  const listed = alphabeticalPlayers(players, hostPlayerLabel)
  const shown = matchingPlayers(listed, query, hostPlayerLabel)
  const waitingPhones = handoffPhoneChoices(
    waiting,
    roster.map((seat) => ({ id: seat.playerId, name: seat.name, handoff: seat.handoff })),
    hostPlayerLabel,
  ).filter((phone) => phone.id !== selectedId)
  const selectedTable = tables.find((table) => table.tableNum === (selected ? selected.tableNum : null))
  const selectedPhase = selectedTable && selectedTable.phase ? selectedTable.phase : null
  const guessLine = lines.find((line) => line.label === 'Guess')
  const guessText = guessLine && /^\d/.test(guessLine.value) ? guessLine.value : ''
  if (players.length === 0) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/25 p-4" aria-label="Players">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white/45">Players</h2>
        <p className="mt-3 text-base text-white/50">No one in the room yet.</p>
      </section>
    )
  }
  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-xl border border-white/10 bg-black/25 p-4" aria-label="Players">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-white/45">Players</h2>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
        <HostPlayerFelt
          tableNum={currentTable}
          tableNums={nums}
          seats={felt.map((seat) => ({
            ...seat,
            attention: attentionOf(
              { playerId: seat.playerId, name: seat.name, tableNum: currentTable },
              roster,
              waiting,
              tables,
            ),
          }))}
          selectedId={selectedId}
          hostPlayerLabel={hostPlayerLabel}
          onShowTable={setFeltTable}
          onSelect={(playerId) => {
            setSelectedId(playerId)
            setArmedId(null)
          }}
        />
        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <label className="text-xs font-semibold uppercase tracking-wide text-white/45">
            Find a player
            <input
              aria-label="Find a player"
              value={query}
              onChange={(event) => {
                const next = event.target.value
                setQuery(next)
                const hit = firstMatchingPlayer(listed, next, hostPlayerLabel)
                if (hit == null) return
                setSelectedId(hit.playerId)
                setArmedId(null)
                if (hit.tableNum != null) setFeltTable(hit.tableNum)
              }}
              className="mt-1 min-h-11 w-full rounded-md border border-white/20 bg-zinc-950 px-2 text-sm font-normal normal-case tracking-normal text-white"
            />
          </label>
          <HostPlayerIndex
            players={shown}
            selectedId={selectedId}
            hostPlayerLabel={hostPlayerLabel}
            attentionFor={(player) => attentionOf(player, roster, waiting, tables)}
            onSelect={(player) => {
              setSelectedId(player.playerId)
              setArmedId(null)
              if (player.tableNum != null) setFeltTable(player.tableNum)
            }}
          />
        </div>
      </div>
      <HostSelectedPlayer
        player={selected}
        lines={lines}
        hostPlayerLabel={hostPlayerLabel}
        armed={armedId === selected?.playerId}
        destination={selected ? destinationFor(selected, destinations[selected.playerId]) : 1}
        onDestination={(tableNum) => {
          if (selected == null) return
          setDestinations((current) => ({ ...current, [selected.playerId]: tableNum }))
        }}
        onMove={onMove}
        phase={selectedPhase}
        canUndo={roster.some((seat) => seat.playerId === selectedId && seat.canUndoBet === true)}
        guessText={guessText}
        waitingPhones={waitingPhones}
        onHandPhone={
          selected && onHandPhone ? (waitingPlayerId) => onHandPhone(selected.playerId, waitingPlayerId) : undefined
        }
        onUndoBet={selected && onUndoBet ? () => onUndoBet(selected.playerId) : undefined}
        onReplaceGuess={
          selected && onReplaceGuess ? (answer) => onReplaceGuess(selected.playerId, answer) : undefined
        }
        onExcuse={selected && onExcuse ? () => onExcuse(selected.playerId) : undefined}
        history={handHistory.filter((line) => line.playerId === selected?.playerId)}
        onRemove={() => {
          if (selected == null) return
          if (armedId !== selected.playerId) {
            setArmedId(selected.playerId)
            return
          }
          onRemove(selected.playerId)
          setArmedId(null)
          setSelectedId(null)
        }}
      />
    </section>
  )
}
