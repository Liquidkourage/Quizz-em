#!/usr/bin/env node
/**
 * Virtual smoke for second-life / dual trophy / answer drama / post-hand beats.
 *
 * Requires a running server:
 *   QHE_CPU_VP_ACTION_DELAY_MS=0 npm run dev --workspace apps/server
 *   node scripts/virtual-feature-smoke.mjs
 */

import { io } from 'socket.io-client'

const LOBBY = 'LOBBY'
const DEFAULT_URL = 'http://127.0.0.1:7777'
const DEFAULT_ROOM = `VT${Date.now().toString(36).slice(-4).toUpperCase()}`

function parseArgs() {
  const raw = process.argv.slice(2)
  let url = (process.env.SOCKET_URL || DEFAULT_URL).replace(/\/$/, '')
  let room = (process.env.ROOM || DEFAULT_ROOM).trim().toUpperCase()
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i]
    if (a === '--url' && raw[i + 1]) url = raw[++i].replace(/\/$/, '')
    else if (a.startsWith('--url=')) url = a.slice(6).replace(/\/$/, '')
    else if (a === '--room' && raw[i + 1]) room = raw[++i].trim().toUpperCase()
    else if (a.startsWith('--room=')) room = a.slice(7).trim().toUpperCase()
  }
  return { url, room }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function probeHealth(url) {
  const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) })
  const text = await res.text()
  if (!res.ok || !text.startsWith('ok')) {
    throw new Error(`Health check failed at ${url}/health — start the server first`)
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
      reject(new Error(`Timeout connecting ${hello.role}/${hello.name}`))
    }, 25_000)

    socket.on('connect', () => {
      socket.once('ack', (ack) => {
        if (!ack?.ok) {
          clearTimeout(timer)
          socket.close()
          reject(new Error(`${hello.name} hello failed: ${ack?.message ?? 'unknown'}`))
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
    socket.on('connect_error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function action(socket, type, payload) {
  socket.emit('action', { type, ...(payload != null ? { payload } : {}) })
}

function waitEvent(socket, event, predicate, label, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEv)
      reject(new Error(`Timeout waiting for ${label}`))
    }, timeoutMs)
    const onEv = (payload) => {
      try {
        if (predicate(payload)) {
          clearTimeout(timer)
          socket.off(event, onEv)
          resolve(payload)
        }
      } catch {
        /* ignore */
      }
    }
    socket.on(event, onEv)
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

  console.log(`Virtual feature smoke → ${url} room=${room}`)
  await probeHealth(url)
  pass('server health')

  const { socket: host } = await connectClient(
    url,
    { role: 'host', name: 'Virtual Host', roomCode: room, tableId: LOBBY },
    { waitForState: true },
  )
  host.on('toast', (msg) => console.log(`  [host] ${msg}`))
  pass('host connected')

  const { socket: display } = await connectClient(url, {
    role: 'display',
    name: 'Virtual TV',
    roomCode: room,
    tableId: '1',
    displayVenueWall: true,
  })
  pass('display connected')

  let latestWall = null
  display.on('displayVenueSnapshot', (wall) => {
    latestWall = wall
  })

  // Path A: seed rehearsal + skip to showdown (CPU-only) → endRound beats
  action(host, 'seedRehearsalVenue', { tableCount: 1 })
  await sleep(1200)

  // After seed, host is moved to table 1 — reconnect host actions from current socket.
  action(host, 'rehearsalSkipToShowdown')
  await sleep(1500)

  let wall = latestWall
  if (!wall || !wall.tiles?.length) {
    try {
      wall = await waitEvent(
        display,
        'displayVenueSnapshot',
        (w) => Array.isArray(w?.tiles) && w.tiles.length > 0,
        'any venue tiles',
        15_000,
      )
    } catch (err) {
      fail('venue tiles after rehearsal', String(err.message || err))
    }
  }

  if (wall?.tiles?.length) {
    const seated = wall.tiles.reduce((n, t) => n + (t.seated ?? 0), 0)
    pass('rehearsal tiles', `${wall.tiles.length} table(s), ${seated} seats`)
    if (wall.tiles.some((t) => Array.isArray(t.seatAnswerPoints))) {
      pass('seatAnswerPoints on wire')
    } else {
      fail('seatAnswerPoints on wire')
    }
  }

  const phaseOf = (w) => w?.headlinePhase ?? w?.tiles?.[0]?.phase
  let ph = phaseOf(latestWall)
  console.log(`  [phase] ${ph}`)

  // If still not showdown/reveal, try skip again after a beat
  if (ph !== 'showdown' && ph !== 'reveal') {
    action(host, 'rehearsalSkipToShowdown')
    try {
      await waitEvent(
        display,
        'displayVenueSnapshot',
        (w) => {
          const p = phaseOf(w)
          return p === 'showdown' || p === 'reveal'
        },
        'showdown/reveal after skip',
        20_000,
      )
      pass('rehearsal at showdown/reveal', phaseOf(latestWall))
    } catch (err) {
      fail('rehearsal at showdown/reveal', String(err.message || err))
    }
  } else {
    pass('rehearsal at showdown/reveal', ph)
  }

  // Path B: full answering flow on a fresh room — use addVirtualPlayers if skip left us in showdown
  // End round first to exercise post-hand beats, then start a new hand for answering drama.
  action(host, 'endRound')
  try {
    const post = await waitEvent(
      display,
      'displayVenueSnapshot',
      (w) =>
        w?.tiles?.length > 0 &&
        w.tiles.every((t) => t.phase === 'lobby') &&
        typeof w.postHandBeatStartedAtMs === 'number',
      'postHandBeatStartedAtMs',
      25_000,
    )
    pass('postHandBeatStartedAtMs', String(post.postHandBeatStartedAtMs))
  } catch (err) {
    fail('postHandBeatStartedAtMs', String(err.message || err))
  }

  // New hand: question first, then deal → force streets → answering drama → reveal → showdown
  action(host, 'setQuestion', {})
  await sleep(600)
  action(host, 'startGame')
  await sleep(1000)

  for (let i = 0; i < 16; i++) {
    const p = phaseOf(latestWall)
    console.log(`  [hand] ${p}`)
    if (p === 'answering' || p === 'reveal' || p === 'showdown') break
    if (p === 'betting') {
      action(host, 'adminCloseBetting')
      await sleep(400)
      // After R1 close, board may auto-deal; otherwise deal then close R2.
      action(host, 'dealCommunityCards')
      await sleep(400)
      action(host, 'adminCloseBetting')
      await sleep(400)
      action(host, 'startAnswering')
      await sleep(500)
    } else if (p === 'question') {
      action(host, 'startGame')
      await sleep(600)
    } else {
      await sleep(400)
    }
  }

  async function ensurePhase(want, label, timeoutMs) {
    if (phaseOf(latestWall) === want) return latestWall
    return waitEvent(
      display,
      'displayVenueSnapshot',
      (w) => phaseOf(w) === want,
      label,
      timeoutMs,
    )
  }

  try {
    const answering = await ensurePhase('answering', 'answering phase', 45_000)
    pass('answering phase')

    // Wait for at least one CPU lock if possible
    for (let i = 0; i < 20; i++) {
      if ((latestWall?.answerSubmitCount ?? 0) > 0) break
      await sleep(250)
    }
    const live = latestWall ?? answering
    if (typeof live.answerEligibleCount === 'number' && live.answerEligibleCount > 0) {
      pass('answerEligibleCount', String(live.answerEligibleCount))
    } else {
      fail('answerEligibleCount', `got ${live.answerEligibleCount}`)
    }
    if (typeof live.answerSubmitCount === 'number') {
      pass('answerSubmitCount', `${live.answerSubmitCount}/${live.answerEligibleCount ?? '?'}`)
    } else {
      fail('answerSubmitCount', `got ${live.answerSubmitCount}`)
    }

    const leaked = live.tiles?.some(
      (t) =>
        t.phase === 'answering' &&
        Array.isArray(t.seatSubmittedAnswers) &&
        t.seatSubmittedAnswers.some((v) => typeof v === 'number'),
    )
    if (!leaked) pass('no guess leak during answering')
    else fail('no guess leak during answering')
  } catch (err) {
    fail('answering phase', String(err.message || err))
  }

  action(host, 'revealAnswer')
  try {
    await ensurePhase('reveal', 'reveal beat', 15_000)
    pass('reveal beat')
  } catch (err) {
    fail('reveal beat', String(err.message || err))
  }

  try {
    await ensurePhase('showdown', 'auto showdown', 20_000)
    pass('auto-advanced to showdown')
  } catch (err) {
    fail('auto-advanced to showdown', String(err.message || err))
  }

  host.close()
  display.close()

  const failed = results.filter((r) => !r.ok)
  console.log('')
  console.log(`Done: ${results.length - failed.length}/${results.length} passed`)
  if (failed.length) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
