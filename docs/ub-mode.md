# ub-mode in Quizz'em

[ub-mode](https://github.com/unclebob/ub-mode) is installed as a Cursor skill at `.cursor/skills/ub-mode/SKILL.md`
(copied unchanged) and enforced by the always-apply rule `.cursor/rules/ub-mode.mdc`.

Its quality-gate tools (crapper, dryer, mutator) are not used here; this repo is TypeScript, so each gate has an
equivalent below.

| ub-mode gate | Intent | Here | Command |
| --- | --- | --- | --- |
| Tests | Behavior pinned by tests | Vitest, every workspace | `npm run test:all` |
| Crapper (CRAP < 10) | Keep functions small and covered | ESLint `complexity` (max 10) plus V8 coverage | `npm run gate:complexity`, `npm run test:coverage` |
| Dryer (duplication) | Remove duplicated blocks | jscpd | `npm run gate:dry` |
| Mutator | Cover the uncovered, kill survivors | Stryker (Vitest runner) | `npm run gate:mutate -- --mutate "<glob>"` |

## Install

The gate tooling is declared in the root `package.json` but not yet installed. Run `npm install` once and commit the
updated `package-lock.json`.

## Ratchet, not a big bang

This codebase was written quickly and will not pass the gates everywhere. The gates report today; they do not fail the
build. Tighten them over time:

1. Run `npm run test:all` and fix or quarantine anything red. Then point `npm test` at it.
2. Run `npm run gate:complexity` and `npm run gate:dry` once and record the counts. New code must not add to them.
3. When a file is touched, bring that file under the thresholds in the same change.
4. When the counts reach zero, change the ESLint rule from `warn` to `error` in `eslint.gates.config.js` and add
   `--threshold 0` to `gate:dry`.

Mutation testing is slow. Always scope it to the files you changed with `--mutate`. The default in
`stryker.config.json` covers `packages/core` only.

## Notes

- `apps/server`, `apps/host`, `packages/net` and `packages/ui` have few or no tests. Expect coverage there to be low
  until tests are added as code is touched.
- True CRAP needs per-function coverage. Complexity is the practical proxy: with full coverage, CRAP < 10 means
  complexity under 10.
