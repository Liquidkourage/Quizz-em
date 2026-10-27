/**
 * Live socket coverage for the handler split: HTTP shells, TV pairing,
 * library, sync/layout, seating, late join, blinds, and one human betting street.
 *
 *   node scripts/live-handler-smoke.mjs --url http://127.0.0.1:7788
 */
import { io } from 'socket.io-client'
import { randomUUID } from 'node:crypto'

const LOBBY = 'LOBBY'
const args = process.argv.slice(2)
let url = 'http://127.0.0.1:7788'
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) url = args[++i].replace(/\/$/, '')
}
const room = `LV${Date.now().toString(36).slice(-5).toUpperCase()}`

const results = []
const pass = (name, detail = '') => {
  results.push({ name, ok: true })
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
}
const fail = (name, detail = '') => {
  results.push({ name, ok: false, detail })
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function connect(hello, { waitForState = false } = {}) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 15_000 })
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error(`timeout ${hello.name}`))
    }, 20_000)
    socket.on('connect_error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    socket.on('connect', () => {
      socket.once('ack', (ack) => {
        if (!ack?.ok) {
          clearTimeout(timer)
          socket.close()
          reject(new Error(`${hello.name}: ${ack?.message ?? 'ack failed'}`))
          return
        }
        if (!waitForState) {
          clearTimeout(timer)
          resolve({ socket, ack })
          return
        }
        socket.once('state', (state) => {
          clearTimeout(timer)
          resolve({ socket, ack, state })
        })
      })
      socket.emit('hello', hello)
    })
  })
}

function waitFor(socket, event, pred, label, ms = 12_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, on)
      reject(new Error(`timeout ${label}`))
    }, ms)
    const on = (payload) => {
      try {
        if (pred(payload)) {
          clearTimeout(timer)
          socket.off(event, on)
          resolve(payload)
        }
      } catch {
        /* keep waiting */
      }
    }
    socket.on(event, on)
  })
}

function action(socket, type, payload) {
  socket.emit('action', { type, ...(payload != null ? { payload } : {}) })
}

async function main() {
  console.log(`\nLive handler smoke → ${url} room=${room}\n`)

  for (const path of ['/health', '/host', '/player', '/display']) {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    if (!res.ok) fail(`GET ${path}`, String(res.status))
    else if (path === '/health' && text.startsWith('ok')) pass('GET /health')
    else if (path !== '/health' && text.includes('<div id="root">')) pass(`GET ${path} shell`)
    else if (path !== '/health') fail(`GET ${path} shell`, 'missing #root')
  }

  const { socket: host } = await connect(
    { role: 'host', name: 'Live Host', roomCode: room, tableId: LOBBY },
    { waitForState: true },
  )
  pass('Host hello')

  const libWait = waitFor(host, 'hostLibrary', (l) => Array.isArray(l?.questions), 'hostLibrary')
  action(host, 'syncState')
  const lib0 = await libWait
  pass('Host library on sync', `${lib0.questions.length} questions`)

  const unknown = waitFor(host, 'toast', (m) => m === 'Unknown action', 'unknown action')
  action(host, 'notARealAction')
  await unknown
  pass('Unknown action toast')

  const synced = waitFor(host, 'state', (s) => s?.code === room, 'syncState')
  action(host, 'syncState')
  const syncedState = await synced
  if (syncedState.phase === 'lobby' && (syncedState.tableId ?? LOBBY) === LOBBY) {
    pass('syncState lobby snapshot')
  } else {
    fail('syncState lobby snapshot', `${syncedState.phase}/${syncedState.tableId}`)
  }

  const pairing = io(url, { transports: ['websocket'], reconnection: false, timeout: 15_000 })
  let latestWall = null
  pairing.on('displayVenueSnapshot', (w) => {
    latestWall = w
  })
  const codePromise = waitFor(pairing, 'displayPairingCode', (p) => typeof p?.code === 'string' && p.code.length === 4, 'pairing code')
  await new Promise((resolve, reject) => {
    pairing.on('connect', resolve)
    pairing.on('connect_error', reject)
  })
  pairing.emit('hello', {
    role: 'display',
    name: "Quizz'em TV",
    roomCode: 'PAIRING',
    tableId: '1',
    displayAwaitPairing: true,
  })
  const { code } = await codePromise
  pass('Display pairing code', code)

  const assigned = waitFor(pairing, 'displayVenueAssigned', (p) => p?.venueCode === room, 'venue assigned')
  const wallWait = waitFor(
    pairing,
    'displayVenueSnapshot',
    (w) => w && typeof w === 'object',
    'display snapshot',
  )
  const pairedAck = waitFor(host, 'ack', (a) => a?.ok === true && String(a.message).includes('paired'), 'pair ack')
  action(host, 'pairDisplayWithHost', { code })
  await pairedAck
  await assigned
  pass('Host paired TV into venue')

  const wall = await wallWait
  if (wall.showAudienceWelcome !== false) pass('Welcome wall still up before seating')
  else fail('Welcome wall still up before seating')

  action(pairing, 'displayHeartbeat')
  await sleep(200)
  if (pairing.connected) pass('Display heartbeat keeps socket')
  else fail('Display heartbeat keeps socket')

  const layoutEv = waitFor(
    pairing,
    'displayLayout',
    (l) => l?.layout === 'venueWall' && l?.focusTable === 1,
    'display layout',
  )
  action(host, 'displaySetLayout', { layout: 'venueWall', focusTable: 1 })
  await layoutEv
  pass('displaySetLayout')

  const added = waitFor(
    host,
    'hostLibrary',
    (l) => l.questions?.some((q) => q.text === 'Live smoke numeric'),
    'bank add',
  )
  action(host, 'questionBankAdd', { text: 'Live smoke numeric', answer: 42, category: 'smoke' })
  const libAdd = await added
  const q = libAdd.questions.find((row) => row.text === 'Live smoke numeric')
  pass('questionBankAdd', q.id)

  const saved = waitFor(host, 'toast', (m) => m === 'Question saved.', 'question saved')
  action(host, 'questionBankUpdate', { id: q.id, text: 'Live smoke numeric', answer: 43 })
  await saved
  pass('questionBankUpdate')

  const created = waitFor(host, 'toast', (m) => String(m).startsWith('Setlist created:'), 'setlist')
  action(host, 'setlistCreate', { name: 'Live smoke rundown' })
  await created
  pass('setlistCreate')

  const blindsToast = waitFor(host, 'toast', (m) => String(m).includes('Venue blinds saved'), 'blinds')
  action(host, 'setVenueBlinds', { smallBlind: 15, bigBlind: 30 })
  await blindsToast
  pass('setVenueBlinds')

  const removed = waitFor(host, 'toast', (m) => m === 'Question removed.', 'question removed')
  action(host, 'questionBankDelete', { id: q.id })
  await removed
  pass('questionBankDelete')

  const players = []
  for (const name of ['Ada Live', 'Bea Live']) {
    const joined = await connect(
      {
        role: 'player',
        name,
        roomCode: room,
        tableId: LOBBY,
        playerId: `human:live-${name}-${randomUUID()}`,
      },
      { waitForState: true },
    )
    players.push({ name, ...joined })
  }
  pass('Two players joined')

  try {
    const dupe = await connect({
      role: 'player',
      name: 'Ada Live',
      roomCode: room,
      tableId: LOBBY,
      playerId: `human:live-dupe-${randomUUID()}`,
    })
    dupe.socket.close()
    fail('Duplicate name rejected')
  } catch (err) {
    if (String(err.message).includes('already in the lobby')) pass('Duplicate name rejected')
    else fail('Duplicate name rejected', err.message)
  }

  const seated = players.map((p) =>
    waitFor(p.socket, 'seated', (info) => typeof info?.tableId === 'string', `${p.name} seated`),
  )
  action(host, 'assignTablesFromLobby')
  const tables = await Promise.all(seated)
  pass('assignTablesFromLobby', tables.map((t) => t.tableId).join(','))

  const welcomeGone = await (async () => {
    const deadline = Date.now() + 12_000
    while (Date.now() < deadline) {
      if (latestWall?.showAudienceWelcome === false) return latestWall
      await sleep(100)
    }
    throw new Error('timeout welcome expired')
  })()
  if (welcomeGone.showAudienceWelcome === false) pass('Late-join gate armed on seating chart')

  try {
    const late = await connect({
      role: 'player',
      name: 'Cara Late',
      roomCode: room,
      tableId: LOBBY,
      playerId: `human:live-late-${randomUUID()}`,
    })
    late.socket.close()
    fail('Late join rejected')
  } catch (err) {
    if (String(err.message).includes('already started')) pass('Late join rejected')
    else fail('Late join rejected', err.message)
  }

  const revealed = waitFor(
    host,
    'state',
    (s) => s.phase === 'question' && s.round?.question != null && !s.players?.some((p) => (p.hand?.length ?? 0) >= 2),
    'question before cards',
    20_000,
  )
  action(host, 'setQuestion', {})
  const afterQuestion = await revealed
  pass('setQuestion before deal', afterQuestion.round?.question?.text ?? 'question')

  const betting = waitFor(host, 'state', (s) => s.phase === 'betting' && s.round?.isBettingOpen, 'betting open', 20_000)
  action(host, 'startGame')
  const betState = await betting
  pass('deal opens wagering', `pot ${betState.round?.pot}`)

  const idx = betState.round.currentPlayerIndex
  const actor = betState.players[idx]
  const actorSock = players.find((p) => actor && p.name === actor.name)?.socket
  if (!actor || !actorSock) {
    fail('Human wager', `no socket for seat ${idx} (${actor?.name ?? 'none'})`)
  } else {
    const owed =
      (betState.round.currentBet || 0) - ((betState.round.playerBets || {})[actor.id] || 0)
    const verb = owed > 0 ? 'call' : 'check'
    const moved = waitFor(
      host,
      'state',
      (s) =>
        s.round?.currentPlayerIndex !== idx ||
        s.round?.isBettingOpen === false ||
        (s.round?.pot ?? 0) !== (betState.round?.pot ?? 0),
      `after ${verb}`,
      15_000,
    )
    actorSock.emit('action', { type: verb, payload: { playerId: actor.id } })
    const next = await moved
    pass('Human wager', `${actor.name} ${verb} → idx ${next.round?.currentPlayerIndex}`)
  }

  const closed = waitFor(
    host,
    'state',
    (s) => s.phase === 'betting' && s.round?.isBettingOpen === false && (s.round?.bettingRound ?? 1) === 1,
    'close street',
    15_000,
  )
  action(host, 'adminCloseBetting')
  await closed
  pass('adminCloseBetting')

  for (const p of players) p.socket.close()
  pairing.close()
  host.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n--- ${results.length - failed.length}/${results.length} checks passed ---\n`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error('\nLive smoke aborted:', err?.message || err)
  process.exit(1)
})
