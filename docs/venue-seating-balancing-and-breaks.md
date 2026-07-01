# Venue seating: balancing, breaks, and what the room sees

**Audience:** product, host operators, display designers, and anyone tuning tournament feel.  
**Status:** describes **current behavior** after the scheduled 5-hand shuffle model.  
**Not legal copy** — this is an internal explainer in plain language.

---

## Executive summary

Quizz’em Hold’em venues run many numbered tables at once. Seating is intentionally simple:

| When | What |
|------|------|
| **Every End Round** | **Solo rescue** — move anyone stuck alone on a table |
| **Every 5 venue hands** (End Round 5, 10, 15…) | **Table shuffle** — randomly seat all chip survivors into the optimal number of tables, evenly |
| **Between shuffles** | No rebalance, no closure, no emergency combine |

**Display copy:** `91 remaining · Shuffle in 3 hands` (not survivor-threshold “re-seating at N”).

---

## End Round order

After busts are applied on every felt:

```
1. Solo rescue (repeat until no solo tables)
2. Is this hand #5, 10, 15… at this venue?
     YES → shuffle all chip survivors into optimal N tables (skip if only 1 table)
     NO  → done
```

---

## Solo rescue (balance)

**When:** A numbered table has exactly one chip survivor and at least one other table exists.

**Why:** A one-handed table cannot run a normal hand.

**Audience:** Quiet player toast; no TV announcement.

---

## Scheduled shuffle (break)

**When:** Venue hand count is a multiple of **5** (`VENUE_SHUFFLE_EVERY_HANDS`).

**What:**

- Collect all players with `bankroll > 0`
- `N = optimalVenueTableCount(survivors)` (~6 per table, max 8)
- Random shuffle into tables `1…N` with near-equal sizes
- Empty felts above `N` until the next assign/shuffle

**Skipped when:** Only one live table (final table).

**Host toast:** `Tables shuffled — 20 → 18 (110 players remaining).`

**TV overlay:** Full-screen pop-up (like eliminations) for solo moves, closed felts, and shuffles — via `lastHandSeating` on the venue snapshot. Plays after the bust overlay when both happen on the same End Round.

**Display copy:** `91 remaining · Shuffle in 3 hands` countdown on the stats pill.

---

## What we removed

- Per-round **rebalance** (evening 8-5-5 without changing table count)
- **Table closure** between shuffles
- **Survivor-threshold combine** between shuffles
- Display forecast **“Re-seating at N players”**

Between shuffles the room may run **too many tables** or **uneven sizes** until the next shuffle hand. That is intentional (option **B**).

---

## Wire fields

| Field | Meaning |
|-------|---------|
| `venueHandsUntilShuffle` | Countdown (null at final table) |
| `venueShuffleEveryHands` | Usually `5` |
| `venueChipSurvivorCount` | Seated headcount on snapshot |
| `venueLiveTableCount` | Felts with ≥1 seated player |

Server counter: `apps/server/src/venue-shuffle-settings.ts` (persisted per venue). Resets on **New Game**.

---

## Code map

| Concern | Location |
|---------|----------|
| Shuffle schedule math | `packages/core/src/venueCondense.ts` |
| Plan solo + shuffle | `planVenueCondense({ shuffle })` |
| Hand counter + persist | `apps/server/src/venue-shuffle-settings.ts` |
| Apply moves | `apps/server/src/venue-condense.ts` |
| Trigger | `apps/server/src/index.ts` — host `endRound` |
| Display copy | `apps/display/src/venueWallModel.ts` |
| Player strip | `apps/player/src/components/VenueStatusStrip.tsx` |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Solo rescue** | Move a lone player off a 1-handed table |
| **Shuffle** | Full random redraw into optimal N tables |
| **End Round** | Host lockstep wave; busts, then seating pass |

---

*End of document.*
