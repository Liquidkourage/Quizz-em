import type { Socket } from 'socket.io'
import type { GameState, Question } from '@qhe/core'
import * as g from '../game-ops'

export async function handleShowAction(
  socket: Socket,
  type: string,
  payload: any,
  sessionKey: string,
  gameStateIn: GameState,
): Promise<GameState | null> {
  let gameState = gameStateIn
  switch (type) {

        case 'startGame': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vnStart = g.normalizeVenueCode(gameState.code)
          const rowsStart = g.venuePlayableSnapshots(vnStart)
          if (rowsStart.length === 0) {
            socket.emit('toast', 'No playable tables yet — assign from lobby first.')
            break
          }
          const sig0 = g.phaseStrictSignature(rowsStart[0]!.gs)
          let startMisaligned = false
          for (let i = 1; i < rowsStart.length; i++) {
            if (g.phaseStrictSignature(rowsStart[i]!.gs) !== sig0) {
              g.toastVenueMisaligned(socket, rowsStart)
              startMisaligned = true
              break
            }
          }
          if (startMisaligned) break

          const sample = rowsStart[0]!.gs
          if (sample.phase === 'question') {
            g.autoDealHoleCardsOnVenue(gameState.code)
            socket.emit(
              'toast',
              'Felts are already in deal setup — skip Start and use Reveal question or Next from setlist.',
            )
            gameState = g.rooms.get(sessionKey)!
            break
          }
          if (sample.phase !== 'lobby') {
            socket.emit(
              'toast',
              `Every table must be in lobby before starting the trivia wave (yours collectively: ${g.humanReadableStrictState(sample)}). Run End round & pay out if the last hand finished.`,
            )
            break
          }
          g.clearVenueWageringOrchestrationState(gameState.code)
          g.clearVenueRevealBeatTimer(vnStart)
          g.venuePostHandBeatStartedAtMs.delete(vnStart)
          g.clearVenueLastHandDisplay(vnStart)
          for (const { tk } of rowsStart) {
            let gs = g.rooms.get(tk)!
            gs = g.startGame(gs)
            gs = g.runVirtualPlayerSimulation(gs)
            g.rooms.set(tk, gs)
            g.emitVenueTableState(tk, gs)
          }
          g.autoDealHoleCardsOnVenue(gameState.code)
          socket.emit(
            'toast',
            'Round started — hole cards dealt on every table. Reveal a question to open wagering.',
          )
          g.markVenueShowStarted(gameState.code)
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'setQuestion': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockQ = g.requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'lobby' || gs.phase === 'question',
            'stay together in lobby or deal setup before changing the question'
          )
          if (!lockQ) break
          const lib = await g.ensureVenueLibrary(gameState.code)
          const bank = lib.questions
          const questionIdRaw = payload?.questionId
          const questionId = typeof questionIdRaw === 'string' ? questionIdRaw.trim() : ''
          let picked: Question | undefined
          if (questionId.length > 0) {
            picked = bank.find((q) => q.id === questionId)
            if (!picked) {
              socket.emit('toast', 'That question is not in your bank.')
              break
            }
          } else {
            picked = g.pickRandomQuestion(bank)
            if (!picked) {
              socket.emit('toast', 'Question bank is empty — add questions or restore the starter pack.')
              break
            }
          }
          const bettingOpened = g.applyQuestionToAllPlayable(gameState.code, picked)
          await g.emitHostLibrary(gameState.code)
          socket.emit(
            'toast',
            bettingOpened
              ? 'Question revealed — wagering round 1 open (all tables).'
              : 'Question synced — deal hole cards first (Start the round), then reveal again if needed.',
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'nextQuestionFromSetlist': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockSl = g.requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'lobby' || gs.phase === 'question',
            'stay together in lobby or deal setup before the next setlist cue'
          )
          if (!lockSl) break
          const venue = g.normalizeVenueCode(gameState.code)
          const lib = await g.ensureVenueLibrary(gameState.code)
          let ph = g.getPlayhead(venue)
          if (!ph.setlistId) {
            socket.emit('toast', 'Select a setlist for this game first.')
            break
          }
          const sl = lib.setlists.find((s) => s.id === ph.setlistId)
          if (!sl) {
            socket.emit('toast', 'Active setlist was removed — pick another.')
            g.venuePlayhead.set(venue, { setlistId: null, nextIndex: 0 })
            await g.emitHostLibrary(venue)
            break
          }
          let dispatched = false
          while (ph.nextIndex < sl.questionIds.length) {
            const qid = sl.questionIds[ph.nextIndex]
            const pos = ph.nextIndex + 1
            ph = { ...ph, nextIndex: ph.nextIndex + 1 }
            g.venuePlayhead.set(venue, ph)
            const qFound = lib.questions.find((q) => q.id === qid)
            if (qFound) {
              const bettingOpened = g.applyQuestionToAllPlayable(gameState.code, qFound)
              await g.emitHostLibrary(gameState.code)
              socket.emit(
                'toast',
                bettingOpened
                  ? `Setlist “${sl.name}”: question ${pos} of ${sl.questionIds.length} — wagering round 1 open.`
                  : `Setlist “${sl.name}”: question ${pos} of ${sl.questionIds.length} → all tables (start the round first if holes are missing).`,
              )
              gameState = g.rooms.get(sessionKey)!
              dispatched = true
              break
            }
          }
          if (!dispatched && ph.nextIndex >= sl.questionIds.length) {
            await g.emitHostLibrary(venue)
            socket.emit(
              'toast',
              `End of setlist “${sl.name}” (or remaining ids missing from bank). Pick another rundown or free play.`
            )
          }
          break
        }

        case 'dealInitialCards': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockDeal = g.requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'question',
            'wait in deal setup before hole cards or opening wagering',
          )
          if (!lockDeal) break
          const vn = g.normalizeVenueCode(gameState.code)
          const rows = g.venuePlayableSnapshots(vn)
          const allHaveQuestion = rows.every((r) => r.gs.round.question != null)
          const allHaveHoles = rows.every((r) => g.playersHaveHoleCards(r.gs))
          if (allHaveQuestion && allHaveHoles) {
            if (g.openBettingAfterQuestionOnVenue(gameState.code)) {
              socket.emit('toast', 'Wagering round 1 open (all tables).')
            } else {
              socket.emit('toast', 'Could not open wagering — check every table has hole cards and a question.')
            }
          } else if (!allHaveHoles) {
            if (g.autoDealHoleCardsOnVenue(gameState.code)) {
              if (allHaveQuestion && g.openBettingAfterQuestionOnVenue(gameState.code)) {
                socket.emit('toast', 'Hole cards dealt — wagering round 1 open (all tables).')
              } else {
                socket.emit('toast', 'Hole cards dealt — reveal a question to open wagering.')
              }
            } else {
              socket.emit('toast', 'Could not deal — every seated table must be in question setup.')
            }
          } else {
            socket.emit('toast', 'Reveal a question first — wagering opens after trivia is shown.')
          }
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'dealCommunityCards': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockBoard = g.requireAllSeatedTablesSatisfy(
            socket,
            gameState.code,
            (gs) =>
              gs.phase === 'betting' &&
              gs.round.bettingRound === 1 &&
              (gs.round.communityCards?.length ?? 0) < 5,
            'be in pre-board wagering (round 1, board empty) before dealing community cards',
          )
          if (!lockBoard) break
          const vnBoard = g.normalizeVenueCode(gameState.code)
          if (g.dealCommunityBoardForVenue(vnBoard, { auto: false })) {
            g.emitDisplayVenueSnapshotNow(vnBoard)
          } else {
            socket.emit('toast', 'Board failed to deal — reload from host if this persists.')
          }
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'startAnswering': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockAns = g.requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) =>
              gs.phase === 'betting' &&
              gs.round.isBettingOpen === false &&
              gs.round.bettingRound === 2 &&
              (gs.round.communityCards?.length ?? 0) >= 5,
            'finish post-board wagering (clock closed) with a complete board before trivia answers open',
          )
          if (!lockAns) break
          const vn = g.normalizeVenueCode(gameState.code)
          g.clearVenueWageringOrchestrationState(vn)
          const durationSec = g.resolveAnswerWindowSecondsForStart(vn, payload)
          const durationMs = durationSec * 1000
          const deadlineMs2 = Date.now() + durationMs
          g.armVenueAnswerGuideDeadline(vn, deadlineMs2)
          for (const { tk } of lockAns) {
            let gs = g.rooms.get(tk)!
            gs = {
              ...gs,
              phase: 'answering',
              round: { ...gs.round, answerDeadline: deadlineMs2 }
            }
            gs = g.runVirtualPlayerSimulation(gs)
            g.rooms.set(tk, gs)
            g.emitVenueTableState(tk, gs, { skipOrchestration: true })
          }
          socket.emit(
            'toast',
            `Answering opened — ${lockAns.length} table(s); ${durationSec}s guide countdown (reveal when ready).`,
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'setVenueAnswerWindow': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vn = g.normalizeVenueCode(gameState.code)
          const raw = Number((payload as { seconds?: unknown })?.seconds)
          if (!Number.isFinite(raw)) {
            socket.emit(
              'toast',
              `Set answer window to a number between ${g.ANSWER_WINDOW_MIN_SEC} and ${g.ANSWER_WINDOW_MAX_SEC} seconds.`,
            )
            break
          }
          const sec = g.setVenueAnswerWindowSecondsPersist(vn, raw)
          await g.emitHostLibrary(vn)
          socket.emit(
            'toast',
            `Default trivia answer window for ${vn} is now ${sec}s (${g.ANSWER_WINDOW_MIN_SEC}–${g.ANSWER_WINDOW_MAX_SEC}).`,
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'submitAnswer': {
          const submitAnswerAction = payload as g.SubmitAnswerAction
          if (gameState.phase !== 'answering') {
            socket.emit('toast', 'Not accepting answers right now.')
            socket.emit('ack', { ok: false, message: 'Not accepting answers right now.' })
            break
          }
          // Guide countdown may hit 0; answers stay open until host revealAnswer.
          if (
            !g.isSubmittedAnswerComposableFromDeal(
              gameState,
              submitAnswerAction.playerId,
              submitAnswerAction.answer
            )
          ) {
            socket.emit(
              'toast',
              'That number cannot be built from your two hole cards and the five board cards (exactly five digit picks, optional decimal).'
            )
            socket.emit('ack', {
              ok: false,
              message: 'Answer is not constructible from the dealt digit cards.',
            })
            break
          }
          const who = g.toastPlayerLabel(gameState, submitAnswerAction.playerId)
          gameState = g.submitAnswer(
            gameState,
            submitAnswerAction.playerId,
            submitAnswerAction.answer,
            submitAnswerAction.composition
          )
          g.io.to(sessionKey).emit(
            'toast',
            `${who} submitted ${g.formatTriviaNumber(submitAnswerAction.answer)}`,
          )
          socket.emit('ack', { ok: true, message: 'Answer recorded.' })
          break
        }
          
        case 'revealAnswer': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vnRev = g.normalizeVenueCode(gameState.code)
          const rowsRev = g.venuePlayableSnapshots(vnRev)
          if (rowsRev.length === 0) {
            socket.emit('toast', 'No playable tables yet — assign the lobby first.')
            break
          }
          const answeringRows = rowsRev.filter((r) => r.gs.phase === 'answering')
          if (answeringRows.length === 0) {
            const sample = rowsRev[0]!.gs
            socket.emit(
              'toast',
              `No table is in the answer window yet (yours collectively: ${g.humanReadableStrictState(sample)}). Wait for answering or use Host overrides.`,
            )
            break
          }
          const stragglers = rowsRev.filter(
            (r) =>
              r.gs.phase !== 'answering' &&
              r.gs.phase !== 'showdown' &&
              r.gs.phase !== 'reveal',
          )
          if (stragglers.length > 0) {
            const nums = stragglers
              .map((r) => (Number.isFinite(r.n) ? String(r.n) : '?'))
              .sort()
              .join(', ')
            socket.emit(
              'toast',
              `Revealing on ${answeringRows.length} table(s) in answering — tables ${nums} are still catching up.`,
            )
          }
          g.clearVenueWageringOrchestrationState(vnRev)
          g.venuePostHandBeatStartedAtMs.delete(vnRev)
          for (const { tk } of answeringRows) {
            let gs = g.rooms.get(tk)
            if (!gs || gs.phase !== 'answering') continue
            gs = g.revealAnswer(gs)
            g.rooms.set(tk, gs)
            g.emitVenueTableState(tk, gs)
          }
          g.scheduleVenueRevealToShowdown(vnRev)
          g.emitDisplayVenueSnapshotNow(vnRev)
          socket.emit(
            'toast',
            stragglers.length === 0
              ? 'Answers revealed — showdown in a few seconds.'
              : `Answers revealed on ${answeringRows.length} table(s) — showdown follows shortly.`,
          )
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'endRound': {
          if (!g.assertVenueHost(socket, gameState)) break
          const lockEnd = g.requireVenueLockstepTables(
            socket,
            gameState.code,
            (gs) => gs.phase === 'showdown' || gs.phase === 'reveal',
            'bring every felt to reveal/showdown before paying / resetting the wave',
          )
          if (!lockEnd) break
          g.clearVenueWageringOrchestrationState(gameState.code)
          g.clearVenueRevealBeatTimer(gameState.code)
          const vnEnd = g.normalizeVenueCode(gameState.code)
          const handResultRows: { tableNum: number; before: GameState; after: GameState }[] = []
          for (const { tk, n } of lockEnd) {
            const gs = g.rooms.get(tk)
            if (!gs) continue
            handResultRows.push({ tableNum: n, before: gs, after: g.endRound(gs) })
          }
          const handBusts = g.recordVenueHostHandResults(vnEnd, handResultRows)
          g.setVenueLastHandDisplay(vnEnd, handBusts)
          g.venuePostHandBeatStartedAtMs.set(vnEnd, Date.now())
          for (let i = 0; i < handResultRows.length; i++) {
            const tk = lockEnd[i]!.tk
            g.rooms.set(tk, handResultRows[i]!.after)
            g.emitVenueTableState(tk, handResultRows[i]!.after)
          }
          const levelMsg = g.recordVenueHandCompleted(vnEnd)
          g.syncVenueBlindsToAllSessions(vnEnd)
          await g.emitHostLibrary(vnEnd)
          const shuffleTick = g.recordVenueShuffleHandCompleted(vnEnd)
          const condenseResult = g.runVenueCondenseAfterRound(
            vnEnd,
            gameState.hostId,
            shuffleTick.shuffleThisRound,
          )
          g.attachVenueLastHandSeating(vnEnd, g.venueSeatingAnnouncementFromResult(condenseResult))
          g.emitDisplayVenueSnapshotNow(vnEnd)
          socket.emit('toast', `Round cleared — lobby on all ${lockEnd.length} felts at this venue.`)
          for (const msg of condenseResult.hostToasts) {
            socket.emit('toast', msg)
            g.io.to(g.hostVenueRoom(vnEnd)).emit('toast', msg)
          }
          if (levelMsg) socket.emit('toast', levelMsg)
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'newGame': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vn = g.normalizeVenueCode(gameState.code)
          g.clearVenueWageringOrchestrationState(vn)
          g.clearVenueRevealBeatTimer(vn)
          g.venuePostHandBeatStartedAtMs.delete(vn)
          const hostIdSnap = gameState.hostId
          const lobbyKey = g.tableSessionKey(vn, g.LOBBY_TABLE_ID)
          for (const tk of g.allTableSessionsInVenue(vn)) {
            g.io.to(tk).emit('toast', 'Venue reset — use the lobby link to rejoin.')
            g.rooms.delete(tk)
          }
          const freshLobby = g.applyEffectiveBlindsToGameState(
            {
              ...g.createEmptyGame(vn, hostIdSnap, g.LOBBY_TABLE_ID),
              smallBlind: gameState.smallBlind,
              bigBlind: gameState.bigBlind,
            },
            vn,
            lobbyKey,
          )
          g.rooms.set(lobbyKey, freshLobby)
          const hostSock = g.io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            for (const r of [...hostSock.rooms]) {
              if (r === hostSock.id) continue
              if (typeof r === 'string' && r.startsWith(g.venueSessionKeyPrefix(vn))) {
                hostSock.leave(r)
              }
            }
            hostSock.join(lobbyKey)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = lobbyKey
          }
          g.emitVenueTableState(lobbyKey, freshLobby)
          socket.emit('toast', 'New game — numbered tables cleared; lobby reset.')
          g.venueAudienceWelcomeExpired.delete(vn)
          g.venueSeatingChartPinnedUntilMs.delete(vn)
          g.clearVenueHostLog(vn)
          g.clearPlayerSocketRegistry()
          g.resetVenueShuffleCounter(vn)
          g.emitDisplayVenueSnapshotNow(gameState.code)
          gameState = g.rooms.get(lobbyKey)!
          break
        }

        case 'assignTablesFromLobby': {
          if (!g.isLobbySessionKey(sessionKey)) {
            socket.emit(
              'toast',
              'Run “Assign” from the lobby session only (join host as table LOBBY).'
            )
            break
          }
          if (!g.assertVenueHost(socket, gameState)) break
          if (gameState.phase !== 'lobby') {
            socket.emit('toast', 'Assign only while still in lobby phase.')
            break
          }
          const lobbyKey = sessionKey
          const lobbyGs = g.rooms.get(lobbyKey)!
          const roster = [...lobbyGs.players]
          if (roster.length === 0) {
            socket.emit('toast', 'No players in the lobby.')
            break
          }
          const hostIdSnap = lobbyGs.hostId
          const N = roster.length
          let tableCount = g.computeOptimalTableCount(
            N,
            g.VENUE_CONDENSE_MAX_SEATS,
            g.VENUE_CONDENSE_MIN_SEATS,
          )
          tableCount = Math.min(tableCount, g.VENUE_NUMBERED_TABLE_MAX)
          const sizes = g.splitIntoTableSizes(N, tableCount)
          const shuffled = g.shuffle(roster)
          let offset = 0
          for (let ti = 0; ti < tableCount; ti++) {
            const slice = shuffled.slice(offset, offset + sizes[ti])
            offset += sizes[ti]
            const tid = String(ti + 1)
            const tk = g.tableSessionKey(lobbyGs.code, tid)
            let gsNew = g.applyEffectiveBlindsToGameState(
              {
                ...g.createEmptyGame(lobbyGs.code, hostIdSnap, tid),
                smallBlind: lobbyGs.smallBlind,
                bigBlind: lobbyGs.bigBlind,
                players: slice,
              },
              lobbyGs.code,
              tk,
            )
            /** Humans expect lobby after assign until the host starts play — VP auto-run skips unless the table is CPU-only. */
            if (g.tableIsCpuOnly(gsNew)) {
              gsNew = g.runVirtualPlayerSimulation(gsNew)
            }
            g.rooms.set(tk, gsNew)
            for (const p of slice) {
              if (p.id.startsWith('vp:')) continue
              const sock = g.getSocketForPlayer(p.id)
              if (sock) {
                sock.leave(lobbyKey)
                sock.join(tk)
                ;(sock.data as { sessionKey?: string }).sessionKey = tk
                sock.emit('seated', { tableId: tid })
              }
            }
            g.emitVenueTableState(tk, gsNew)
          }

          const emptyLobby = g.applyEffectiveBlindsToGameState(
            {
              ...g.createEmptyGame(g.normalizeVenueCode(lobbyGs.code), hostIdSnap, g.LOBBY_TABLE_ID),
              smallBlind: lobbyGs.smallBlind,
              bigBlind: lobbyGs.bigBlind,
            },
            g.normalizeVenueCode(lobbyGs.code),
            lobbyKey,
          )
          g.rooms.set(lobbyKey, emptyLobby)
          g.io.to(lobbyKey).emit('state', emptyLobby)

          const t1Key = g.tableSessionKey(lobbyGs.code, '1')
          const hostSock = g.io.sockets.sockets.get(hostIdSnap)
          if (hostSock) {
            hostSock.leave(lobbyKey)
            hostSock.join(t1Key)
            ;(hostSock.data as { sessionKey?: string }).sessionKey = t1Key
            g.bindSocketAsVenueHost(hostSock, lobbyGs.code)
            hostSock.emit('hostBoundTable', { tableId: '1' })
          }

          socket.emit(
            'toast',
            `Seated ${N} players randomly across ${tableCount} tables (${sizes.join(', ')}). You are now on table 1.`
          )
          g.markVenueShowStarted(lobbyGs.code)
          g.venueSeatingChartPinnedUntilMs.set(
            g.normalizeVenueCode(lobbyGs.code),
            Date.now() + g.SEATING_CHART_MIN_VISIBLE_MS,
          )
          g.emitDisplayVenueSnapshotNow(lobbyGs.code)
          gameState = g.rooms.get(t1Key)!
          break
        }

        case 'seedRehearsalVenue': {
          if (!g.isLobbySessionKey(sessionKey)) {
            socket.emit(
              'toast',
              'Run “Seed rehearsal” from the lobby session (join host as table LOBBY).',
            )
            break
          }
          if (!g.assertVenueHost(socket, gameState)) break
          const tableCount = g.normalizeRehearsalTableCount(
            (payload as { tableCount?: number })?.tableCount,
          )
          const seeded = g.seedRehearsalVenueRooms(gameState, tableCount)
          g.moveVenueHostToTableOne(seeded.vn, gameState.hostId, sessionKey)
          g.markVenueShowStarted(seeded.vn)
          g.venueAudienceWelcomeExpired.add(seeded.vn)
          g.emitDisplayVenueSnapshotNow(seeded.vn)
          socket.emit(
            'toast',
            `Rehearsal: ${seeded.tableCount} tables, ${seeded.totalBots} CPUs (${seeded.sizes.join(', ')} per table). Host on table 1.`,
          )
          gameState = g.rooms.get(seeded.t1Key)!
          break
        }

        case 'rehearsalPreviewWinnerScreen': {
          if (!g.assertVenueHost(socket, gameState)) break
          const tableCount = g.normalizeRehearsalTableCount(
            (payload as { tableCount?: number })?.tableCount,
          )
          const seeded = g.seedRehearsalVenueRooms(gameState, tableCount)
          const t1Key = g.moveVenueHostToTableOne(seeded.vn, gameState.hostId, sessionKey)
          const { advanced } = await g.fastForwardVenueRehearsalToShowdown(seeded.vn)
          socket.emit(
            'toast',
            advanced > 0
              ? `Rehearsal: winner screen on ${seeded.tableCount} table(s) (${seeded.totalBots} CPUs).`
              : `Rehearsal: ${seeded.tableCount} table(s) already in showdown.`,
          )
          gameState = g.rooms.get(t1Key)!
          break
        }

        case 'rehearsalSkipToShowdown': {
          if (!g.assertVenueHost(socket, gameState)) break
          const vnSkip = g.normalizeVenueCode(gameState.code)
          const rowsSkip = g.venuePlayableSnapshots(vnSkip)
          if (rowsSkip.length === 0) {
            socket.emit('toast', 'No tables yet — seed rehearsal or assign from lobby first.')
            break
          }
          if (!rowsSkip.every((r) => g.tableIsCpuOnly(r.gs))) {
            socket.emit(
              'toast',
              'Skip to winner screen works in CPU-only rehearsal — run Seed rehearsal first (no human seats).',
            )
            break
          }
          const { advanced, already } = await g.fastForwardVenueRehearsalToShowdown(vnSkip)
          if (advanced > 0) {
            socket.emit(
              'toast',
              already > 0
                ? `Rehearsal: winner screen on ${advanced} table(s) (${already} already in showdown).`
                : `Rehearsal: winner screen on ${advanced} table(s).`,
            )
          } else {
            socket.emit('toast', `All ${already} table(s) already in showdown.`)
          }
          gameState = g.rooms.get(sessionKey)!
          break
        }

        case 'addVirtualPlayers': {
          if (!g.assertVenueHost(socket, gameState)) break
          const raw = Number((payload as { count?: number })?.count ?? 2)
          const asked = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2
          gameState = g.spawnVirtualPlayers(gameState, asked)
          const nVirt = g.liveVirtualCount(gameState)
          g.io.to(sessionKey).emit('toast', `Test mode: added virtual seats (CPU total: ${nVirt}).`)
          break
        }

        case 'clearVirtualPlayers': {
          if (!g.assertVenueHost(socket, gameState)) break
          const cleared = g.liveVirtualCount(gameState)
          gameState = g.removeAllVirtualPlayers(gameState)
          g.io.to(sessionKey).emit(
            'toast',
            cleared > 0 ? `Removed ${cleared} virtual seat(s).` : 'No virtual seats to remove.'
          )
          break
        }

    default:
      return null
  }
  return gameState
}
