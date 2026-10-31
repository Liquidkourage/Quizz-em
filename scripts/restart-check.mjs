/**
 * Two-phase restart check. Proves a live hand survives a server restart.
 *
 *   node scripts/restart-check.mjs setup  --url http://127.0.0.1:7788
 *   (restart the server: lsof -ti :7788 | xargs kill -TERM, then start it again)
 *   node scripts/restart-check.mjs verify --url http://127.0.0.1:7788
 *
 * setup  builds a room with a host and two players mid-hand and saves what it saw.
 * verify reconnects the same players with the same ids, as a phone would, and compares.
 * The server needs DATABASE_URL set, otherwise there is nothing to restore.
 */
import { io } from 'socket.io-client'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const LOBBY = 'LOBBY'
const STATE_FILE = new URL('./.restart-check.json', import.meta.url)
const [phase, ...rest] = process.argv.slice(2)
let url = 'http://127.0.0.1:7788'
for (let i = 0; i < rest.length; i++) if (rest[i] === '--url' && rest[i + 1]) url = rest[++i].replace(/\/$/, '')
const hostSecret = process.env.HOST_SECRET?.trim() || 'quizzem-local-host'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (ok, name, detail = '') => {
  results.push(ok)
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

function connect(hello) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 15_000 })
    const timer = setTimeout(() => (socket.close(), reject(new Error(`timeout ${hello.name}`))), 20_000)
    socket.on('connect_error', (e) => (clearTimeout(timer), reject(e)))
    socket.on('connect', () => {
      let ack
      let state
      const done = () => ack && state && (clearTimeout(timer), resolve({ socket, ack, state }))
      socket.once('ack', (a) => {
        if (!a?.ok) return clearTimeout(timer), socket.close(), reject(new Error(`${hello.name}: ${a?.message}`))
        ack = a
        done()
      })
      socket.once('state', (s) => ((state = s), done()))
      socket.emit('hello', hello)
    })
  })
}

function waitFor(socket, event, pred, label, ms = 15_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => (socket.off(event, on), reject(new Error(`timeout ${label}`))), ms)
    const on = (p) => {
      try {
        if (pred(p)) (clearTimeout(timer), socket.off(event, on), resolve(p))
      } catch {
        /* keep waiting */
      }
    }
    socket.on(event, on)
  })
}

const act = (socket, type, payload) => socket.emit('action', { type, ...(payload ? { payload } : {}) })
const hostHello = (room) => ({ role: 'host', name: 'Restart Host', roomCode: room, tableId: LOBBY, hostSecret })
const brief = (s) => ({
  phase: s.phase,
  pot: s.round?.pot,
  isBettingOpen: s.round?.isBettingOpen,
  players: (s.players ?? []).map((p) => ({ id: p.id, name: p.name, bankroll: p.bankroll })),
})

async function setup() {
  const room = `RST${Date.now().toString(36).slice(-4).toUpperCase()}`
  const names = ['Ada Restart', 'Bea Restart']
  const ids = names.map((n) => `human:restart-${n.split(' ')[0].toLowerCase()}-${randomUUID().slice(0, 8)}`)
  console.log(`\nRestart check: setup → ${url} room=${room}\n`)
  const { socket: host } = await connect(hostHello(room))
  const players = []
  for (let i = 0; i < 2; i++) {
    players.push(await connect({ role: 'player', name: names[i], roomCode: room, tableId: LOBBY, playerId: ids[i] }))
  }
  const seated = players.map((p) => waitFor(p.socket, 'seated', (x) => typeof x?.tableId === 'string', 'seated'))
  act(host, 'assignTablesFromLobby')
  const tables = await Promise.all(seated)
  check(true, 'players seated', tables.map((t) => t.tableId).join(','))
  const q = waitFor(host, 'state', (s) => s.phase === 'question' && s.round?.question != null, 'question', 20_000)
  act(host, 'setQuestion', {})
  await q
  const betting = waitFor(host, 'state', (s) => s.phase === 'betting' && s.round?.isBettingOpen, 'betting', 20_000)
  act(host, 'startGame')
  const before = brief(await betting)
  check(before.phase === 'betting', 'hand is in the betting phase', `pot ${before.pot}`)
  console.log('Waiting 8 seconds so the saver writes…')
  await sleep(8000)
  writeFileSync(STATE_FILE, JSON.stringify({ room, names, ids, before }, null, 2))
  for (const p of players) p.socket.close()
  host.close()
  console.log(`\nSaved ${STATE_FILE.pathname}\nNow restart the server, then run: node scripts/restart-check.mjs verify --url ${url}\n`)
}

async function verify() {
  const { room, names, ids, before } = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  console.log(`\nRestart check: verify → ${url} room=${room}\n`)
  const players = []
  for (let i = 0; i < 2; i++) {
    try {
      const joined = await connect({ role: 'player', name: names[i], roomCode: room, tableId: LOBBY, playerId: ids[i] })
      players.push({ name: names[i], ...joined })
      check(true, `${names[i]} reconnected`)
    } catch (e) {
      check(false, `${names[i]} reconnected`, e.message)
    }
  }
  const { socket: host, state: hostState } = await connect(hostHello(room))
  check(true, 'host reconnected')
  const after = brief(hostState)
  check(after.phase === before.phase, 'phase unchanged', `${before.phase} → ${after.phase}`)
  check(after.pot === before.pot, 'pot unchanged', `${before.pot} → ${after.pot}`)
  for (const b of before.players) {
    const a = after.players.find((p) => p.id === b.id)
    check(a != null && a.bankroll === b.bankroll, `${b.name} seat and chips`, a ? `${b.bankroll} → ${a.bankroll}` : 'seat missing')
  }
  const actor = hostState.players?.[hostState.round?.currentPlayerIndex]
  const actorSock = players.find((p) => actor && p.name === actor.name)?.socket
  if (!actorSock) {
    check(false, 'play continues', 'no acting player found')
  } else {
    const owed = (hostState.round.currentBet || 0) - ((hostState.round.playerBets || {})[actor.id] || 0)
    const verb = owed > 0 ? 'call' : 'check'
    const moved = waitFor(host, 'state', (s) => s.round?.currentPlayerIndex !== hostState.round.currentPlayerIndex || s.round?.isBettingOpen === false, 'after action')
    actorSock.emit('action', { type: verb, payload: { playerId: actor.id } })
    try {
      await moved
      check(true, 'play continues', `${actor.name} ${verb}`)
    } catch (e) {
      check(false, 'play continues', `${e.message} (the room may still be frozen: look for "[restart] host is back" in the server log)`)
    }
  }
  for (const p of players) p.socket.close()
  host.close()
  const failed = results.filter((r) => !r).length
  console.log(`\n--- ${results.length - failed}/${results.length} checks passed ---\n`)
  process.exit(failed ? 1 : 0)
}

if (phase === 'setup') await setup()
else if (phase === 'verify') await verify()
else console.log('Usage: node scripts/restart-check.mjs setup|verify [--url http://127.0.0.1:7788]')
