#!/usr/bin/env node
/**
 * Scripted multi-client convention dry-run.
 *
 * Exercises: host venue code, lobby join, assign, reconnect-to-seat,
 * duplicate-name rejection, venue-wide advance turn, seating chart pin.
 *
 * Usage:
 *   npm start --workspace apps/server   # separate terminal
 *   node scripts/venue-convention-dry-run.mjs
 *   node scripts/venue-convention-dry-run.mjs --room DRYRUN --url http://127.0.0.1:7777
 */

import { io } from 'socket.io-client'
import { randomUUID } from 'node:crypto'

const LOBBY = 'LOBBY'
const DEFAULT_URL = 'http://127.0.0.1:7777'
const DEFAULT_ROOM = `DRY${Date.now().toString(36).slice(-4).toUpperCase()}`

function parseArgs() {
  const raw = process.argv.slice(2)
  let url = (process.env.SOCKET_URL || DEFAULT_URL).replace(/\/$/, '')
  let room = (process.env.ROOM || DEFAULT_ROOM).trim().toUpperCase()
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]
    if (a === '--url' && raw[i + 1]) {
      url = raw[++i].replace(/\/$/, '')
    } else if (a.startsWith('--url=')) {
      url = a.slice(6).replace(/\/$/, '')
    } else if (a === '--room' && raw[i + 1]) {
      room = raw[++i].trim().toUpperCase()
    } else if (a.startsWith('--room=')) {
      room = a.slice(7).trim().toUpperCase()
    }
  }
  return { url, room }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function playerId(label) {
  return `human:dryrun-${label}-${randomUUID()}`
}

async function probeHealth(url) {
  const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  if (!res.ok || !text.startsWith('ok')) {
    throw new Error(`Health check failed at ${url}/health`)
  }
}

function connectClient(url, hello, { waitForState = false } = {}) {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 20_000,
    })
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error(`Timeout waiting for ${hello.name}`))
    }, 25_000)

  const finish = (result) => {
      clearTimeout(timer)
      resolve({ socket, ...result })
    }

    socket.on('connect', () => {
      socket.once('ack', (ack) => {
        if (!ack?.ok) {
          socket.close()
          reject(new Error(`${hello.name} hello failed: ${ack?.message ?? 'unknown'}`))
          return
        }
        if (!waitForState) {
          finish({ ack })
          return
        }
        socket.once('state', (state) => finish({ ack, state }))
      })
      socket.emit('hello', hello)
    })

    socket.on('connect_error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function hostAction(socket, type, payload, { waitAckMs = 0 } = {}) {
  socket.emit('action', { type, ...(payload != null ? { payload } : {}) })
  if (waitAckMs <= 0) return Promise.resolve(null)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), waitAckMs)
    socket.once('ack', (ack) => {
      clearTimeout(timer)
      resolve(ack)
    })
  })
}

function waitForSeated(socket, label, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('seated', onSeated)
      socket.off('state', onState)
      reject(new Error(`Timeout waiting for seated: ${label}`))
    }, timeoutMs)

    const onSeated = ({ tableId }) => {
      clearTimeout(timer)
      socket.off('state', onState)
      resolve(tableId)
    }

    const onState = (state) => {
      if ((state.tableId ?? LOBBY) !== LOBBY) {
        clearTimeout(timer)
        socket.off('seated', onSeated)
        resolve(state.tableId)
      }
    }

    socket.on('seated', onSeated)
    socket.on('state', onState)
  })
}

function waitForState(socket, predicate, label, timeoutMs = 20_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('state', onState)
      reject(new Error(`Timeout waiting for state: ${label}`))
    }, timeoutMs)

    const onState = (state) => {
      if (predicate(state)) {
        clearTimeout(timer)
        socket.off('state', onState)
        resolve(state)
      }
    }
    socket.on('state', onState)
  })
}

function connectDisplay(url, room) {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      transports: ['polling', 'websocket'],
      reconnection: false,
      timeout: 20_000,
    })
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error('Display connect timeout'))
    }, 20_000)
    socket.on('connect', () => {
      socket.once('ack', (ack) => {
        clearTimeout(timer)
        if (!ack?.ok) {
          socket.close()
          reject(new Error(`Display hello failed: ${ack?.message}`))
          return
        }
        resolve(socket)
      })
      socket.emit('hello', {
        role: 'display',
        name: 'DryRun TV',
        roomCode: room,
        tableId: '1',
        displayVenueWall: true,
      })
    })
    socket.on('connect_error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

async function main() {
  const { url, room } = parseArgs()
  const results = []

  const pass = (name, detail = '') => {
    results.push({ name, ok: true, detail })
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`)
  }
  const fail = (name, detail = '') => {
    results.push({ name, ok: false, detail })
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }

  console.log(`\nQuizz'em convention dry-run → ${url}  room=${room}\n`)

  await probeHealth(url)
  pass('Server health')

  const hostHello = {
    role: 'host',
    name: 'DryRun Host',
    roomCode: room,
    tableId: LOBBY,
  }

  const { socket: host } = await connectClient(url, hostHello, { waitForState: true })
  pass('Host connected', room)

  const display = await connectDisplay(url, room)
  pass('Display connected', room)

  let snapshot = null
  display.on('displayVenueSnapshot', (payload) => {
    snapshot = payload
  })

  const players = [
    { label: 'a', name: 'Alex M.', id: playerId('a') },
    { label: 'b', name: 'Blake T.', id: playerId('b') },
    { label: 'c', name: 'Casey R.', id: playerId('c') },
    { label: 'd', name: 'Drew K.', id: playerId('d') },
  ]

  const connected = []
  for (const p of players) {
    const { socket, ack } = await connectClient(
      url,
      {
        role: 'player',
        name: p.name,
        roomCode: room,
        tableId: LOBBY,
        playerId: p.id,
      },
      { waitForState: true },
    )
    connected.push({ ...p, socket, ack })
  }
  pass('Four players joined lobby', `${connected.length} sockets`)

  try {
    const dupe = await connectClient(url, {
      role: 'player',
      name: 'Alex M.',
      roomCode: room,
      tableId: LOBBY,
      playerId: playerId('dupe'),
    })
    dupe.socket.close()
    fail('Duplicate name rejected')
  } catch (e) {
    if (String(e.message).includes('already in the lobby')) {
      pass('Duplicate name rejected')
    } else {
      fail('Duplicate name rejected', e.message)
    }
  }

  host.on('toast', (msg) => console.log(`  [host toast] ${msg}`))

  const seatedPromises = connected.map((p) =>
    waitForSeated(p.socket, p.name).then((tableId) => {
      p.tableId = tableId
    }),
  )

  await hostAction(host, 'assignTablesFromLobby')
  await Promise.all(seatedPromises)
  await sleep(300)
  pass('Assign seated all players', connected.map((p) => `${p.name}→T${p.tableId}`).join(', '))

  if (snapshot?.seatingChartPinnedUntilMs && snapshot.seatingChartPinnedUntilMs > Date.now()) {
    pass('Seating chart pin active', `until +${Math.round((snapshot.seatingChartPinnedUntilMs - Date.now()) / 1000)}s`)
  } else {
    fail('Seating chart pin active', 'missing or expired seatingChartPinnedUntilMs')
  }

  const victim = connected[0]
  const victimTableBefore = victim.tableId
  victim.socket.disconnect()
  await sleep(400)

  const { socket: reconnected, ack: reack } = await connectClient(
    url,
    {
      role: 'player',
      name: victim.name,
      roomCode: room,
      tableId: LOBBY,
      playerId: victim.id,
    },
    { waitForState: true },
  )
  victim.socket = reconnected
  if (reack.restoredTableId === victimTableBefore) {
    pass('Reconnect restored table', `table ${reack.restoredTableId}`)
  } else {
    fail('Reconnect restored table', `expected ${victimTableBefore}, got ${reack.restoredTableId}`)
  }

  const startPromise = waitForState(
    host,
    (s) => s.phase === 'question' || s.phase === 'betting',
    'host table started',
    30_000,
  )

  await hostAction(host, 'startGame')
  const hostOnTable = await startPromise
  if (hostOnTable.phase === 'question' || hostOnTable.phase === 'betting') {
    pass('Host startGame advanced venue', hostOnTable.phase)
  } else {
    fail('Host startGame advanced venue', hostOnTable.phase)
  }

  await hostAction(host, 'adminAdvanceTurnVenue')
  await sleep(800)
  pass('Venue-wide advance turn (no throw)')

  for (const p of connected) {
    try {
      p.socket.close()
    } catch {
      /* ignore */
    }
  }
  display.close()
  host.close()

  const failed = results.filter((r) => !r.ok)
  console.log(`\n--- ${results.length - failed.length}/${results.length} checks passed ---\n`)
  if (failed.length > 0) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('\nDry-run aborted:', e.message || e)
  process.exit(1)
})
