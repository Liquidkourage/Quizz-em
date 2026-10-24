import type { Socket } from 'socket.io'
import type { GameState, Question } from '@qhe/core'
import type { ServerAck } from '@qhe/net'
import * as g from '../game-ops'

export async function handleLibraryAction(
  socket: Socket,
  type: string,
  payload: any,
  sessionKey: string,
  gameStateIn: GameState,
): Promise<GameState | null> {
  let gameState = gameStateIn
  switch (type) {
        case 'selectTriviaSetlist': {
          if (!g.assertHostRole(socket)) break
          const venue = g.normalizeVenueCode(gameState.code)
          const lib = await g.ensureVenueLibrary(venue)
          const raw = payload?.setlistId
          if (raw == null || raw === '') {
            g.venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
            await g.emitHostLibrary(venue)
            socket.emit('toast', 'Setlist rundown cleared — free play from the full bank.')
            break
          }
          const id = String(raw).trim()
          if (!lib.setlists.some((s) => s.id === id)) {
            socket.emit('toast', 'That setlist does not exist.')
            break
          }
          g.venuePlayhead.set(venue, { setlistId: id, nextIndex: 0 })
          await g.emitHostLibrary(venue)
          const sel = lib.setlists.find((s) => s.id === id)!
          socket.emit(
            'toast',
            `Active rundown: “${sel.name}” — ${sel.questionIds.length} question(s); use Next from setlist for cue 1.`
          )
          break
        }

        case 'setlistCreate': {
          if (!g.assertHostRole(socket)) break
          const name = String(payload?.name ?? '').trim()
          if (!name) {
            socket.emit('toast', 'Setlist needs a name.')
            break
          }
          const lib = await g.ensureVenueLibrary(gameState.code)
          const id = `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
          lib.setlists.push({ id, name, questionIds: [] })
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', `Setlist created: ${name}`)
          break
        }

        case 'setlistSave': {
          if (!g.assertHostRole(socket)) break
          const id = String(payload?.id ?? '').trim()
          if (!id) {
            socket.emit('toast', 'setlistSave requires id.')
            break
          }
          const lib = await g.ensureVenueLibrary(gameState.code)
          const idx = lib.setlists.findIndex((s) => s.id === id)
          if (idx < 0) {
            socket.emit('toast', 'Setlist not found.')
            break
          }
          const prev = lib.setlists[idx]
          const name =
            typeof payload?.name === 'string' && payload.name.trim()
              ? payload.name.trim()
              : prev.name
          let questionIds = prev.questionIds
          if (Array.isArray(payload?.questionIds)) {
            questionIds = g.sanitizeSetlistQuestionIds(
              lib,
              (payload.questionIds as unknown[]).filter((x): x is string => typeof x === 'string').map((x) => x.trim()),
            )
          }
          lib.setlists[idx] = { id: prev.id, name, questionIds }
          await g.persistVenues()
          const ph = g.getPlayhead(g.normalizeVenueCode(gameState.code))
          if (ph.setlistId === id && ph.nextIndex > questionIds.length) {
            g.venuePlayhead.set(g.normalizeVenueCode(gameState.code), {
              setlistId: id,
              nextIndex: Math.max(0, questionIds.length),
            })
          }
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', `Setlist “${name}” saved (${questionIds.length} questions).`)
          break
        }

        case 'setlistDelete': {
          if (!g.assertHostRole(socket)) break
          const id = String(payload?.id ?? '').trim()
          const venue = g.normalizeVenueCode(gameState.code)
          const lib = await g.ensureVenueLibrary(venue)
          const next = lib.setlists.filter((s) => s.id !== id)
          if (next.length === lib.setlists.length) {
            socket.emit('toast', 'Setlist not found.')
            break
          }
          lib.setlists = next
          await g.persistVenues()
          const ph = g.getPlayhead(venue)
          if (ph.setlistId === id) {
            g.venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
          }
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', 'Setlist removed.')
          break
        }

        case 'questionBankAdd': {
          if (!g.assertHostRole(socket)) break
          const lib = await g.ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const text = String(payload?.text ?? '').trim()
          const answer = Number(payload?.answer)
          if (!text || Number.isNaN(answer)) {
            socket.emit('toast', 'Question text and a numeric answer are required.')
            break
          }
          const id = `qb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
          const catRaw = payload?.category != null ? String(payload.category).trim() : ''
          const diff = Number(payload?.difficulty)
          const q: Question = {
            id,
            text,
            answer,
            category: catRaw.length > 0 ? catRaw : undefined,
            difficulty: Number.isFinite(diff) && diff >= 1 && diff <= 5 ? diff : undefined,
          }
          bank.push(q)
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question added.')
          break
        }

        case 'questionBankUpdate': {
          if (!g.assertHostRole(socket)) break
          const lib = await g.ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const id = String(payload?.id ?? '').trim()
          const idx = bank.findIndex((q) => q.id === id)
          if (idx < 0) {
            socket.emit('toast', 'Question not found.')
            break
          }
          const prev = bank[idx]
          const text =
            typeof payload?.text === 'string' ? payload.text.trim() : prev.text
          const ans =
            payload?.answer !== undefined ? Number(payload.answer) : prev.answer
          if (!text || Number.isNaN(ans)) {
            socket.emit('toast', 'Invalid text or answer.')
            break
          }
          let cat: string | undefined
          if (!('category' in (payload ?? {}))) {
            cat = prev.category
          } else if (payload?.category === null || payload?.category === '') {
            cat = undefined
          } else {
            const c = typeof payload.category === 'string' ? payload.category.trim() : ''
            cat = c.length > 0 ? c : undefined
          }
          let diff: number | undefined
          if (!('difficulty' in (payload ?? {}))) {
            diff = prev.difficulty
          } else if (payload?.difficulty === null) {
            diff = undefined
          } else {
            const d = Number(payload.difficulty)
            diff = Number.isFinite(d) && d >= 1 && d <= 5 ? d : undefined
          }
          bank[idx] = {
            ...prev,
            id: prev.id,
            text,
            answer: ans,
            category: cat,
            difficulty: diff,
          }
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question saved.')
          break
        }

        case 'questionBankDelete': {
          if (!g.assertHostRole(socket)) break
          const lib = await g.ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const id = String(payload?.id ?? '').trim()
          const filtered = bank.filter((q) => q.id !== id)
          if (filtered.length === bank.length) {
            socket.emit('toast', 'Question not found.')
            break
          }
          g.pruneIdFromAllSetlists(lib, id)
          lib.questions = filtered
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', 'Question removed.')
          break
        }

        case 'questionBankMove': {
          if (!g.assertHostRole(socket)) break
          const lib = await g.ensureVenueLibrary(gameState.code)
          const bank = [...lib.questions]
          const id = String(payload?.id ?? '').trim()
          const dir = payload?.direction === 'down' ? 'down' : 'up'
          const idx = bank.findIndex((q) => q.id === id)
          if (idx < 0) break
          const j = dir === 'up' ? idx - 1 : idx + 1
          if (j < 0 || j >= bank.length) break
          ;[bank[idx], bank[j]] = [bank[j], bank[idx]]
          lib.questions = bank
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          break
        }

        case 'questionBankImportRows': {
          if (!g.assertHostRole(socket)) break
          const replace = !!payload?.replace
          const rows = payload?.rows
          if (!Array.isArray(rows) || rows.length === 0) {
            socket.emit('toast', 'Import payload must contain a rows array.')
            break
          }
          const venue = g.normalizeVenueCode(gameState.code)
          const validated = g.coerceImportQuestions(venue, rows)
          if (validated.length === 0) {
            socket.emit('toast', 'No valid rows (each needs text plus a numeric answer).')
            break
          }
          const lib = await g.ensureVenueLibrary(venue)
          if (replace) {
            lib.questions = validated
          } else {
            lib.questions = [...lib.questions, ...validated]
          }
          g.pruneSetlistRefs(lib)
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          socket.emit(
            'toast',
            replace
              ? `Replaced bank with ${validated.length} question(s); setlists pruned to valid ids.`
              : `Appended ${validated.length} question(s).`
          )
          break
        }

        case 'questionBankResetSamples': {
          if (!g.assertHostRole(socket)) break
          const lib = await g.ensureVenueLibrary(gameState.code)
          lib.questions = g.STARTER_QUESTION_SET.map((q) => ({ ...q }))
          const starterIdx = lib.setlists.findIndex((s) => s.id === g.STARTER_SETLIST_ID)
          const starter = g.createStarterSetlist(g.STARTER_QUESTION_SET)
          if (starterIdx >= 0) {
            lib.setlists[starterIdx] = starter
          } else {
            lib.setlists.unshift(starter)
          }
          g.pruneSetlistRefs(lib)
          await g.persistVenues()
          await g.emitHostLibrary(gameState.code)
          socket.emit('toast', `Starter pack restored (${g.STARTER_QUESTION_SET.length} questions).`)
          break
        }
          
    default:
      return null
  }
  return gameState
}
