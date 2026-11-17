import { useState } from 'react'
import { VENUE_NUMBERED_TABLE_MAX } from '@qhe/core'
import { cardInputForPlayer, hostPlayerCard, lastStreetAction } from './hostPlayerCard'

export type HostRosterSeat = {
  playerId: string
  name: string
  tableNum: number
  phone?: 'connected' | 'offline' | 'bot'
  offlineSec?: number | null
  triviaPoints?: number
  allIn?: boolean
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
  seats: readonly { playerId: string; name: string; seatIndex: number }[]
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
              className={`absolute max-w-[9rem] -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-sm font-semibold leading-tight ${
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
  onSelect,
}: {
  players: readonly HostManagedPlayer[]
  selectedId: string | null
  hostPlayerLabel: (name: string) => string
  onSelect: (player: HostManagedPlayer) => void
}) {
  return (
    <ul className="host-player-index min-h-0 space-y-0.5 overflow-y-auto" aria-label="Players A to Z">
      {players.map((player) => {
        const label = hostPlayerLabel(player.name)
        const selected = selectedId === player.playerId
        return (
          <li key={player.playerId}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(player)}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 text-left text-sm ${
                selected ? 'bg-amber-400/20 text-amber-50' : 'text-white hover:bg-white/5'
              }`}
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

function HostSelectedPlayer({
  player,
  lines,
  hostPlayerLabel,
  armed,
  destination,
  onDestination,
  onMove,
  onRemove,
}: {
  player: HostManagedPlayer | null
  lines: { label: string; value: string }[]
  hostPlayerLabel: (name: string) => string
  armed: boolean
  destination: number
  onDestination: (tableNum: number) => void
  onMove?: (playerId: string, toTableNum: number) => void
  onRemove: () => void
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
    }),
  )
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
}) {
  const players = hostManagedPlayers(roster, waiting)
  const nums = tableNumbers(roster, tables)
  const [feltTable, setFeltTable] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [destinations, setDestinations] = useState<Record<string, number>>({})
  const currentTable = feltTable != null && nums.includes(feltTable) ? feltTable : (nums[0] ?? null)
  const chairs = tables.find((table) => table.tableNum === currentTable)?.seats ?? []
  const felt = currentTable == null ? [] : feltSeatsForTable(currentTable, chairs, roster)
  const selected = players.find((player) => player.playerId === selectedId) ?? null
  const lines = selectedCardLines(selected, roster, waiting, tables, moves, correctAnswer)
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
          seats={felt}
          selectedId={selectedId}
          hostPlayerLabel={hostPlayerLabel}
          onShowTable={setFeltTable}
          onSelect={(playerId) => {
            setSelectedId(playerId)
            setArmedId(null)
          }}
        />
        <HostPlayerIndex
          players={alphabeticalPlayers(players, hostPlayerLabel)}
          selectedId={selectedId}
          hostPlayerLabel={hostPlayerLabel}
          onSelect={(player) => {
            setSelectedId(player.playerId)
            setArmedId(null)
            if (player.tableNum != null) setFeltTable(player.tableNum)
          }}
        />
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
