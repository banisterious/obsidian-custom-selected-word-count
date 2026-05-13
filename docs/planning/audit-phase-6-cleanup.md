# Audit Phase 6 — Lower-priority cleanup and forward-compat

**Status:** Active
**Branch:** `audit/phase-6-cleanup`
**Release target:** 1.7.1 (patch; closes out the audit)

The grab-bag phase. Each item is independent; the audit plan's brief was "implement any subset." This phase implements:

1. **Housekeeping #1 — Archive completed planning docs.** Move `docs/planning/new-exclusions-feature.md` and `docs/planning/per-note-exclusion-overrides.md` to `docs/planning/archive/`. Both pre-date the audit and are marked complete.
2. **Housekeeping #2 — Sentence-count abbreviation regex dedup.** The alternation list at `src/counting/sentences.ts` contains visible duplication (`mil|museum|name|pro|travel|xxx|tel` appears twice). Deduplicate while preserving every originally-intended abbreviation.
3. **Canvas polling architecture review.** The 500 ms `setInterval` loop polling iframe selections is a heavy approach. Investigate whether an event-driven alternative exists; if not, document the polling as a deliberate design choice.
4. **Mobile decision revisit.** Manifest is currently `isDesktopOnly: true`. Investigate whether Obsidian mobile has a status bar at all (the user flagged this as a potential blocker for the live-count feature). Document the decision either way.
5. **Architecture documentation.** Create `docs/architecture/overview.md` describing the post-Phase-5 module tree, data flow, settings persistence shape, override mechanism, and the Canvas-polling caveat (now resolved by item 3).
6. **CLAUDE.md rewrite.** Deeper rewrite incorporating "do not" patterns from the audit (no `<style>` injection, no bare `document` / timer functions, no `activeLeaf`, no toggleable inline styles) and positive patterns. Pointer to the vitest characterization suite as the load-bearing safety net for future refactors.

Items deferred from earlier phases that this phase closes:

- The audit-plan §Phase 6 brief for Canvas polling.
- The audit-plan §Phase 6 brief for mobile-decision revisit.
- The audit-plan §Phase 1 follow-up on the abbreviation regex (Phase 5 noted the duplication but kept Phase 4's behavior-lock; Phase 6 picks it up).
- The audit-plan §Phase 6 brief for archive + architecture doc + CLAUDE.md rewrite.

---

## Constraints

- **No user-visible behavior change from housekeeping items.** The abbreviation regex dedup is behavior-preserving by construction (removing duplicate alternations doesn't change what the alternation matches).
- **All 134 Phase 4 tests pass.** The sentence regex dedup needs to keep them green; if any test fails, the dedup was wrong.
- **Mobile decision is a judgment call.** If Obsidian mobile lacks the affordances the plugin needs (status bar, modal sizing), the right answer is to keep `isDesktopOnly: true` and document why.

---

## Findings

_To be populated during execution._

---

## Status

- [ ] Item 1 — Archive planning docs
- [ ] Item 2 — Sentence abbreviation regex dedup
- [ ] Item 3 — Canvas polling architecture review
- [ ] Item 4 — Mobile decision revisit
- [ ] Item 5 — Architecture documentation
- [ ] Item 6 — CLAUDE.md rewrite
