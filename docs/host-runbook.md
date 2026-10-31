# Host runbook: if the server restarts during the show

This describes what the server does now. A scripted local rehearsal (`scripts/restart-check.mjs`) has passed for both a clean stop and a hard kill. Items marked **Verify** still need a real phone or the Railway service.

## What happens on a restart

- The server saves every table to the database about every 5 seconds, but only when something changed.
- On boot it loads the saved tables and **freezes** each venue. Nobody is folded by a clock while the room is frozen.
- Players reconnect on their own: their phone sends its saved player id and gets its old seat back. The script reconnects with the same ids and passes; **Verify** on a real phone.
- When the **host** reconnects to the venue, the room resumes by itself. Answer countdowns are pushed back by the whole time the server was down.
- A planned deploy sends the server a shutdown signal first; it saves once more before it exits, so almost nothing is lost.

## What the host should do

1. Keep the host screen open. It reconnects without a reload; if it does not within 30 seconds, reload the host page.
2. Wait for the players to reappear on the display (about 30 seconds).
3. If the room is still frozen after you reconnect, press **Resume** on the host screen.
4. If a table looks wrong, check the host screen's table state before the next hand. Do not move players mid-hand.

## What is NOT saved

- Host nudge countdowns (the 30 second auto check or fold). Turn clocks only run after a host nudge, so after a restart no player is on a clock; nudge again if you want one.
- Display pairing codes and who has a phone connected. These rebuild as phones and TVs reconnect.
- If no database is configured (`DATABASE_URL` unset) nothing is saved and a restart ends the live games. The boot log says so: `Table snapshots off`.

## Boot log lines to look for in Railway

- `Venue libraries: PostgreSQL (DATABASE_URL)` means questions are on Postgres. `SQLite file` means they are lost on redeploy.
- `Restored N table(s) for venue(s) ...` means recovery worked.
- `[snapshot] save failed` repeating means the database is unreachable. Tables are not being saved.

## Before the event (checklist)

- [ ] Confirm the Railway server service has `DATABASE_URL` set.
- [ ] Rehearse: start a game with a few phones, restart the service from Railway, confirm seats return and play resumes.
- [ ] Open `/health/details` and confirm `persistence` is `postgres`.
- [ ] Freeze deploys during the show.
- [ ] Optional, off by default: to stop other websites from calling the server, set `ALLOWED_ORIGINS` (comma-separated, for example `https://quizzem.example.com,https://www.quizzem.example.com`) and `ENFORCE_CORS_ALLOWLIST=true` on the server service. Include every address people really use, including any custom domain. Without the flag, the list is ignored. All variables are listed in [environment.md](environment.md). Test the host, player and display pages after changing it.
