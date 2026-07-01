# Venue seating: balancing, breaks, and what the room sees

**Audience:** product, host operators, display designers, and anyone tuning tournament feel.  
**Status:** describes **current behavior** (as of the venue-condense implementation in `@qhe/core` + `apps/server`) and a **proposed v2** direction.  
**Not legal copy** — this is an internal explainer in plain language.

---

## Executive summary

Quizz’em Hold’em venues run many numbered tables at once. As players bust out, the room must keep every table playable **and** eventually run fewer tables when the field shrinks.

The software does two related jobs:

| Job | Poker-room word | What it means here |
|-----|-----------------|-------------------|
| **Balance** | *Table balance* | Move a few players so no table is stuck with one person while neighbors are full. Same number of tables before and after (usually). |
| **Break** | *Table break / combine* | Shut down excess tables and redistribute everyone. Fewer tables after. |

**When does any of this happen?** Only when the host finishes a **venue-wide End Round** — after every active felt has reached showdown, payouts and busts are applied, blinds tick, and then the server runs the seating pass.

**What the TV often says:** *“91 remaining · Re-seating at 74.”* That line is **not** a promise that everyone will move seats at 74 players. It is a **forecast** for the next **big table combine** (shotgun shuffle). Small balance moves can happen every round without changing that number.

---

## Why we need both balance and breaks

**Balancing** answers: *“Given N tables, who should sit where so sizes are fair?”*

**Breaking** answers: *“Given M players left, how many tables should we still be running?”*

You can balance perfectly and still have **too many tables**. Example: 110 players spread evenly across 20 tables (~5–6 each) is fair but wasteful; the math says ~18 tables is enough. Only a **break** (or closing tables) removes those two extra felts.

Live poker works the same way: floor staff balance constantly; they **announce breaks** when whole tables close.

---

## The one trigger: End Round

Nothing in the seating engine runs mid-hand or mid-question. The sequence is:

1. Host triggers **End Round** on the venue (all felts must be at showdown first).
2. Server runs **`endRound`** on each table — trivia payout, busted players removed (`bankroll === 0`), dealer rotates, phase returns to lobby.
3. Server runs **`applyVenueCondenseAfterRound`** — the seating pass (balance + optional break).
4. Server emits a fresh **venue wall snapshot** to displays and a **player brief** to phones.

Players who still have chips may receive a toast when they are moved. The host sees toasts such as *“Table 7 closed — player rescued to Table 3”* or *“Tables combined — 20 → 18.”*

---

## Part 1 — Balancing (sticky, incremental)

Balancing is designed to be **gentle**: move as few people as possible, prefer destinations that keep table sizes even, and never leave someone alone on a table if it can be avoided.

The planner runs three steps **in order**, each using only players with **`bankroll > 0`** (chip survivors).

### Step A — Solo rescue

**When:** A table has exactly **one** chip survivor and there is at least one other table in play.

**What happens:** That player is moved to the **best** open seat on another table (prefer tables with 2–6 players; avoid creating a new solo table).

**Why:** A one-handed table cannot run a normal hand. This is the digital equivalent of *“Table 14, please move to Table 9.”*

**Limit:** Repeats until no solo tables remain (guard cap 64 moves).

### Step B — Soft rebalance *(removed — Phase 1)*

**Previously:** up to 3 moves when size spread > 1 at the correct table count.

**Now:** uneven sizes are tolerated until table closure, scheduled combine, or (planned) the 5-hand shuffle pass. Solo rescue still runs first.

### Step C — Table closure (soft break)

**When:** The room still has **more tables than the optimal count** for current survivors, and there is a **sparse** table to close (smallest roster first).

**What happens:** Up to **2 tables closed** per End Round. Every player from a closed table is moved individually to open seats on surviving tables (same scoring rules as solo rescue).

**Why:** This is a **gradual break** — close the lightest tables first instead of shuffling the entire field.

**Important:** If closure removes enough tables in one pass, the **big combine (Part 2) may not run** that round.

---

## Part 2 — Break (scheduled combine / shotgun merge)

**When:** After all balance steps, the room is still **at least 2 tables above** the **optimal table count** for the survivor headcount.

Constants (today):

- **Max seats per table:** 8  
- **Min seats per table (for math):** 2  
- **Target seats per table (for math):** ~6  
- **Minimum table drop to force a combine:** 2 (won’t shotgun-merge for a 1-table trim if closure can handle it)

**What happens:**

1. All chip survivors are collected.
2. Target table count is computed (`optimalVenueTableCount`).
3. Players are **shuffled** and dealt into new table assignments in near-equal sizes (e.g. 110 players → 18 tables).
4. Every numbered felt session is rewritten; human sockets are moved to their new table rooms.
5. Host toast: *“Tables combined — 20 → 18 (110 players remaining).”*

**Why a shotgun merge exists:** Closure is capped at **2 tables per round**. If the field collapses and you need to drop **many** tables at once (e.g. 20 → 13), incremental closure would take several rounds. The combine does it in **one** End Round.

**Example from tests:** 20 live tables, **134** survivors → no combine yet. At **110** survivors → combine **20 → 18** (unless soft closure already reached 18).

---

## How “optimal table count” is calculated

Plain language:

> *“How many tables do we need so nobody sits more than 8, nobody is forced below 2 if we can help it, and we aim for about six players per table?”*

The engine uses `computeOptimalTableCount` with those min/max/target rules. This number drives:

- Which tables closure tries to eliminate  
- Whether a shotgun merge fires  
- What the display uses for **“next combine at N players”** milestones  

It is **structural math**, not a live read of “how crowded tables feel right now.”

---

## What each audience sees today

### Venue display (TV / wall)

| Element | Source | Plain meaning |
|---------|--------|---------------|
| **“91 remaining”** | Seated headcount across numbered tables | Bodies still in seats (includes players at **$0 bankroll mid-hand** until End Round busts them) |
| **“Re-seating at 74”** | `venueNextCondenseAtSurvivors` | Forecast: *if table count stays similar, the next **scheduled combine** is due around 74 survivors* |
| **“Re-seating now”** | `survivors <= nextAt` | Math says a combine is due; **actual moves wait for the next End Round** |
| **“Combining to X tables now”** | Headline when at/below threshold | Stronger combine messaging on the primary headline line |
| **Progress thermometer** | `listVenueCondenseMilestones` | Ladder of future combine thresholds for drama / orientation |

### Player phones

Short status strip: **`Combine at 74`** (same threshold field, different wording — no “Re-seating now”).

### Host

Toasts on each move type (solo rescue, rebalance, closure, combine). No advance schedule UI beyond what displays show.

---

## Known gaps (why it can feel “unreal”)

These are **documented mismatches**, not bugs in isolation — they explain operator confusion.

1. **“Re-seating” vs reality**  
   The label sounds like *the next time anyone changes seats*. In code it only tracks the **scheduled combine** milestone. Solo rescue and rebalance happen silently on the TV.

2. **“Re-seating now” is not instant**  
   The pill can flip before the host ends the round. Moves apply on **End Round**, not when the count crosses the line.

3. **Two different survivor counts**  
   - **Display snapshot:** counts **every seated player** (so mid-hand $0 stacks still count as “remaining”).  
   - **Seating pass:** uses **`bankroll > 0`** only (after busts on End Round they usually match).  
   Mid-hand, the TV number and merge math can disagree.

4. **Balance is invisible on the wall**  
   Players move every round sometimes; the audience sees no “balancing now” state.

5. **Forecast assumes table count is stable**  
   `nextAt` is computed from **current** live table count. Closures that drop tables early can shift the next milestone without the room noticing.

6. **Terminology split**  
   Core: *condense / merge / closure*. Display pill: *Re-seating*. Player app: *Combine*. Host: *Tables combined*.

---

## Comparison to a live poker tournament

| Live room | Quizz’em today | Gap |
|-----------|----------------|-----|
| Quiet balance between hands | Solo + rebalance toasts to players/host only | OK for players; invisible to audience |
| “Table X is breaking” when it happens | Closure + combine toasts to host; TV may say “Re-seating now” early | Announce **events**, not forecasts |
| Players remaining on board | “N remaining” on TV | Good |
| Rarely pre-announces break thresholds | “Re-seating at N” on TV | Over-specific vs live ops |
| Final table moment | “Final table” copy when ≤1 table | Good direction |

---

## Proposed v2 — direction for improvement

Goal: **feel like a real tournament floor** — honest copy, event-driven announcements, one survivor number — without changing the core need for both balance and breaks.

### V2.1 — Language and communication (low risk, high clarity)

| Today | Proposed |
|-------|----------|
| Re-seating at N | **Combine at N** or **Next table break ~N** (pick one term venue-wide) |
| Re-seating now | **Combining next round** or **Table break pending** (only after host ends round: **Combining to X tables**) |
| Silent balance | Optional host-only log line; **no TV copy** for solo/rebalance |
| Closure / combine | TV headline **only when moves actually run**: *“Tables combining — 20 → 18”* for ~30s after End Round |

**Principle:** Communicate **events** (what just happened / what will happen **this** End Round), not a distant forecast dressed as seating.

### V2.2 — One survivor number (medium risk)

Use **`bankroll > 0` chip survivors** everywhere public-facing:

- Wall snapshot  
- Player brief  
- Combine threshold input  

**Exception:** If you need mid-hand stability, show **“N in · M seated”** only when they differ (rare edge: all-in at $0 before bust removal).

### V2.3 — Split balance from break in the UI model (medium risk)

Expose two concepts to display code:

| Field | Meaning |
|-------|---------|
| `playersRemaining` | Chip survivors |
| `tablesInPlay` | Live felts |
| `lastSeatingEvent` | `none \| balanced \| tables_closed \| combined` + `{ fromTables, toTables }` |
| `nextCombineForecast` | Optional; staff/advanced layout only — not the main headline |

Main headline default: **`{N} remaining · {T} tables`**.  
Secondary line appears **only** when `lastSeatingEvent` fired this round or combine is queued for **this** End Round.

### V2.4 — Engine tuning (optional, needs playtesting)

| Knob | Today | v2 candidate | Tradeoff |
|------|-------|--------------|----------|
| Max closures / round | 2 | 2–3 based on `live − optimal` | Faster soft breaks; more moves per round |
| Merge min table drop | 2 | Keep 2, or merge when `live > optimal` by 1 after closures | More aggressive felts reduction |
| Rebalance moves / round | 3 | 3–5 in late stages | Smoother sizes; more churn |
| Combine shuffle | Full shotgun | **Sticky combine**: keep table pairs where possible, shuffle only overflow | Less disorientation; harder to implement |

Recommendation: **ship V2.1 + V2.2 first**; tune knobs after observing a full mock tournament.

### V2.5 — Acceptance criteria (how we know v2 worked)

1. A host can explain seating in one sentence: *“We balance quietly every round; we announce combines when they happen.”*  
2. TV headline never says “Re-seating at N” unless N is tied to an **imminent** combine (same End Round or next).  
3. After End Round with no combine, caption is only **`N remaining · T tables`**.  
4. After End Round with combine, caption shows **`Combining to X tables`** for one beat, then reverts.  
5. Player app and TV use the **same words** for the same state.  
6. Documented survivor count matches merge logic after bust processing.

---

## Quick reference — current rules of thumb

**Balance (every End Round, as needed)**

- Solo table → rescue player
- ~~Size spread > 1 → up to 3 rebalance moves~~ *(removed)*
- Too many tables → close up to 2 sparse tables

**Break (End Round, if still needed)**

- Still ≥2 tables above optimal → shotgun combine to optimal count  

**Display forecast (continuous)**

- Smallest survivor count where combine would trigger, given current table count  
- Shown as “Re-seating at N” today — **forecast only**, not a schedule  

**Final table**

- At one table, combine copy turns off; special “Final table” messaging when field is small enough  

---

## Code map (for implementers)

| Concern | Location |
|---------|----------|
| Plan balance + break | `packages/core/src/venueCondense.ts` — `planVenueCondense()` |
| Threshold / milestones | `computeNextCondenseAtSurvivors`, `listVenueCondenseMilestones` |
| Apply moves to rooms | `apps/server/src/venue-condense.ts` — `applyVenueCondenseAfterRound()` |
| Trigger after busts | `apps/server/src/index.ts` — host `endRound` / lockstep wave |
| Display copy | `apps/display/src/venueWallModel.ts` — `venueHeadlineCondenseCaptionParts()` |
| TV pill styling | `VenueHeadlineCondenseStatsPill.tsx`, `VenueCondenseProgressBar.tsx` |
| Player strip | `apps/player/src/components/VenueStatusStrip.tsx` |
| Tests | `packages/core/src/venueCondense.test.ts`, `apps/display/src/venueWallModel.test.ts` |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Balance** | Move players between tables without changing table count (usually). |
| **Break / combine / condense** | Reduce table count; may shuffle many players. |
| **Closure** | Soft break — close 1–2 sparse tables by moving everyone off. |
| **Shotgun merge** | Hard break — reshuffle all survivors into fewer tables at once. |
| **Survivor** | Player still in the tournament with chips (`bankroll > 0`) after bust processing. |
| **Optimal table count** | Math answer to “how many tables for this many survivors?” |
| **End Round** | Host action that settles hands, removes busts, then runs seating. |

---

*End of document.*
