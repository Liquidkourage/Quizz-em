# Quizz'em question packs

Ten **25-question sets** (250 total) for numeric-answer trivia nights. Each CSV matches the host **Content → Import** format.

## Files

| File | Theme |
|------|--------|
| `set-01-general-mix.csv` | Warm-up mix |
| `set-02-history.csv` | History & years |
| `set-03-science.csv` | Science, astronomy, tech |
| `set-04-sports.csv` | Sports by the numbers |
| `set-05-geography.csv` | Geography (easy–medium) |
| `set-06-math.csv` | Math, time, conversions |
| `set-07-entertainment.csv` | TV, film, music, literature |
| `set-08-animals.csv` | Animals & biology |
| `set-09-world-facts.csv` | World facts (harder geo) |
| `set-10-challenge.csv` | Challenge round (difficulty 3) |
| `set-11-toss-up.csv` | **Toss Up** — 26 curated toss-up style questions |

See `manifest.json` for build metadata.

## Import on host

1. Open **Content** tab.
2. For each set: **Import append** → pick the CSV (or **Import replace bank** for a fresh bank on first set only).
3. Create a **setlist** with 25 cues in file order → target **25/25** in the UI.
4. Activate the setlist on **Run show** → **Next from setlist**.

Columns: `text`, `answer`, `category`, `difficulty` (1–5).

## Regenerate

```bash
npm run build:question-packs
```

Curated bank lives in `scripts/build-question-packs.mjs`. The script optionally pulls numeric-answer extras from [Open Trivia DB](https://opentdb.com/) (CC BY-SA 4.0) and partitions everything into themed sets.

## Sourcing notes

- **No bulk numeric trivia API exists** — these packs are curated for Quizz'em (single numeric answer, units in prompt where needed).
- OpenTDB contributes only when `correct_answer` is a pure number; most MC trivia is text.
- Review answers before a live show if you regenerate packs (especially stats that change over time).
