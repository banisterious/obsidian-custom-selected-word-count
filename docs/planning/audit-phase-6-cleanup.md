# Audit Phase 6 — Lower-priority cleanup and forward-compat

**Status:** Complete
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

### Canvas polling — keep, document as deliberate

**Decision:** keep the 500 ms `setInterval` loop. Document the reasoning in the architecture doc (Phase 6 item 5).

**Why polling exists in the first place.** Obsidian Canvas embeds individual cards in iframes. The DOM `selectionchange` event fires on the document where the selection lives — for selections inside a Canvas card, that's the iframe's `contentDocument`, NOT the parent document the plugin listens to via `registerDomEvent(window.document, 'selectionchange', ...)`. So selections in Canvas iframes never trigger the parent-side `selectionchange` listener, and the plugin can't observe them through normal event flow. Polling `iframe.contentWindow.getSelection().toString()` is the workaround.

**Why event-driven is uncertain.** A true event-driven alternative would attach a `selectionchange` listener to each Canvas iframe's `contentDocument`. This is technically possible because Canvas iframes are same-origin (Obsidian renders them itself), but it introduces lifecycle management:

- The iframes are created and destroyed dynamically as the user pans, zooms, and navigates Canvas cards. The plugin would need to detect iframe DOM mutations (via a `MutationObserver` on the Canvas container) to know when to attach and detach listeners.
- Multiple iframes can be active simultaneously (one per visible card). Each needs its own listener and its own cleanup.
- The behavior of `selectionchange` events inside iframes is browser- and Electron-version-dependent. Whether the event fires reliably for all selection methods (mouse drag, double-click, programmatic) is something the polling approach doesn't have to worry about.

The complexity-to-benefit ratio doesn't favor switching. The polling is well-isolated (single `setInterval`, gated by `enableLiveCount`, no-ops outside Canvas view), and it works.

**Cost is bounded.** The polling already gates its work:

- Only runs when `enableLiveCount` is on (user-controlled; off by default).
- Only does iframe-selection lookup when the active view is Canvas.
- Cadence is 500 ms (2 callbacks/sec); each callback does a workspace lookup + string compare + early return when not in Canvas. Modern hardware doesn't notice.

**Optional future optimization (not in Phase 6):** pause the timer entirely when not in a Canvas view, via a `workspace.on('active-leaf-change', ...)` hook that calls `startCanvasPolling()` when the user enters a Canvas view and `stopCanvasPolling()` when they leave. This would cut overhead to zero outside Canvas. Skipped for Phase 6 because the current always-on polling is already cheap; the optimization is a tightening, not a fix.

### Mobile decision — keep `isDesktopOnly: true`

**Decision:** keep the manifest at `isDesktopOnly: true`. The Phase 0 defensive default holds.

**The blocker.** The Obsidian developer documentation is explicit:

- `docs/developer/obsidian-developer-docs/en/Plugins/User interface/Status bar.md`:
  > Custom status bar items are **not** supported on Obsidian mobile apps.
- `docs/developer/obsidian-developer-docs/en/Reference/TypeScript API/Plugin/addStatusBarItem.md`:
  > Adds a status bar item to the bottom of the app. Not available on mobile.

The plugin's `setupStatusBar()` method, the live-count feature, "Hide core word count," and the "Status bar label" setting all rely on the status bar being available. On mobile, `this.addStatusBarItem()` either returns nothing useful or errors, depending on the runtime — either way the feature silently fails and the related settings become dead UI.

**Why not partial mobile support.** A `Platform.isMobileApp` gate could disable the status-bar features while leaving the "Count selected words" command, the modal, and the context-menu items working. But:

- Five of the plugin's twenty-some settings are status-bar-specific. They'd need to be hidden on mobile, adding code complexity.
- The plugin's headline value is the live status-bar count; without it, the plugin reduces to a manual "count this selection" command — a thinner offering.
- Mobile selection mechanics differ from desktop (no easy keyboard-driven Select All, different copy/paste affordances), so the existing handlers would need re-validation.
- Testing on real iOS and Android devices would be required.

The cost/benefit doesn't favor the partial approach right now. Keeping `isDesktopOnly: true` is the right call until either:

1. Obsidian adds mobile status-bar support (in which case the plugin should "just work" after flipping the manifest), or
2. There's specific user interest in a mobile-only feature subset, at which point the partial-support path is justified.

**Documentation impact.** README's "Mobile Compatibility" note already reflects `isDesktopOnly: true`. CLAUDE.md's "do not" patterns should note that any new status-bar work assumes desktop-only; if mobile support is ever revisited, the assumption needs reviewing.

---

## Status

- [x] Item 1 — Archive planning docs (commit 9dafb56)
- [x] Item 2 — Sentence abbreviation regex dedup (commit 0c1dfc6)
- [x] Item 3 — Canvas polling architecture review — kept polling, documented decision (commit 2335672)
- [x] Item 4 — Mobile decision revisit — kept isDesktopOnly: true, documented decision (commit 2335672)
- [x] Item 5 — Architecture documentation (commit 55b2bc9)
- [x] Item 6 — CLAUDE.md rewrite — local file only (CLAUDE.md is gitignored)
