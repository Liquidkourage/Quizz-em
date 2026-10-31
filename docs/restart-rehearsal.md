# Restart rehearsal

Goal: prove that a server restart in the middle of a show costs the room about 30 seconds and no seats.
Do this locally first, then once against the real Railway service before the event. Write down what you see; anything marked **Verify** in `host-runbook.md` should be crossed off or fixed afterwards.

## 0. Prepare a local database

Use a throwaway local Postgres (any database name). Example connection string:
`postgres://localhost/quizzem_dev`

## 1. Start the server with recovery on

```
DATABASE_URL=postgres://localhost/quizzem_dev PGSSLMODE=disable PORT=7788 npm start --workspace apps/server
```

Expect these boot lines: `Venue libraries: PostgreSQL (DATABASE_URL)`. No `Restored` line on a clean database.

## 2. Automated check first

In a second terminal:

```
node scripts/live-handler-smoke.mjs --url http://127.0.0.1:7788
```

Expect every line to start with `✓`. If anything fails here, fix it before rehearsing restarts.

## 3. Build a live game

1. Open the host page for a room, for example `http://localhost:7788/host`, and sign in with the host secret (`quizzem-local-host` locally).
2. Join with 2 real phones or browser tabs, then run `npm run sim:lobby -- ROOM@http://127.0.0.1:7788` to add 20 fake players.
3. Assign the lobby so players sit at tables, and start a hand. Get at least one table into the betting phase.
4. Wait 10 seconds so the saver writes (it checks every 5 seconds).

## 4. Restart gracefully (what a Railway deploy does)

Send the process listening on the port a SIGTERM (not Ctrl-C, which is a different signal):

```
lsof -ti :7788 | xargs kill -TERM
```

Expect `[shutdown] SIGTERM received, saving tables before exit`. Start the server again with the same command.

Expect: `Restored N table(s) for venue(s) ROOM. Frozen until the host reconnects.`

## 5. What should happen

| Check | Pass if |
| --- | --- |
| Phones | Reconnect on their own within about 30 seconds, in the same seats, with the same chips |
| Host | After reconnecting, the log says `[restart] host is back, resumed venue ROOM`; no manual resume needed |
| Display wall | Shows the same tables and players |
| Answer countdown | If a question was open, it still has about the time it had before the restart |
| Turn clocks | None running until you press nudge (expected) |
| Next hand | Plays normally to showdown and payout |

## 6. Restart hard (what a crash does)

Repeat steps 3 and 4 but use `lsof -ti :7788 | xargs kill -KILL`. There is no final save, so the room comes back as it was up to 5 seconds before the kill. Expect to lose, at most, the last action.

## 7. The failure cases to try on purpose

- Restart with the host tab closed: players reconnect, the room stays frozen, and the first host to open the page resumes it.
- Unset `DATABASE_URL` and restart: the boot log says `Table snapshots off` and the game is gone. This is the warning case, not a pass.
- Stop the database, then play for a minute: the server keeps running and logs `[snapshot] save failed, will retry`; once the database is back the log stops complaining.

## 8. On Railway

Repeat step 3 against the real service (use a throwaway room code), then restart the service from the Railway dashboard instead of using `kill`. Check the Railway deploy log for the same lines.
