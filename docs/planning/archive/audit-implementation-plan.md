# Audit Implementation Plan

**Status:** Active
**Created:** May 12, 2026
**Authors:** John Banister

This document is the master plan for implementing the recommendations from the Custom Selected Word Count architectural audit conducted in May 2026. The audit followed the same pattern as Sonigraph, Draft Bench, and Charted Roots: structural review of the codebase, decision on whether to rewrite or refactor, and a phased plan that ships independently.

The audit found a working, published plugin (v1.6.2, 827 downloads, zero open issues) built around a single 120 KB `main.ts`. The features are mature; the architecture is the artifact of this being the developer's first Obsidian plugin. The plan is a phased refactor rather than a rewrite, on the grounds that the features work, the user-facing contracts (`cswc-disable` frontmatter property, inline override markers, persisted settings shape) are now load-bearing, and the file is mechanical to split. Sonigraph's rewrite-scope outcome doesn't apply here.

The audit incorporated the automated scan results from the new Obsidian Community website, which transformed the API conformance phase from speculative inventory into a known list of warnings with file:line anchors. The one Error-level finding (illegal `<style>` element creation) is release-blocking and drives Phase 0.

The plan is six phases plus a Phase 0 release-blocker pass. Each phase has its own branch, its own planning doc, and its own release boundary. Phase 1 produces no code changes. Phases 2, 3, and 5 ship to users. Phase 4 introduces test infrastructure without shipping to users. Phase 6 is opportunistic cleanup.

---

## Project conventions

All work under this plan follows the project's existing conventions:

- Conventional Commits prefixes (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- No AI references in commits, PRs, or commit-trailer co-authors (per CLAUDE.md).
- CSS classes carry the `word-count-` prefix; frontmatter properties carry the `cswc-` prefix.
- CHANGELOG follows Keep-a-Changelog; entries land under `[Unreleased]` and move to a version section on release.
- Each phase opens a branch named `audit/phase-N-<short-name>` and produces a planning doc at `docs/planning/audit-phase-N-<short-name>.md`.

## Per-phase workflow

1. Branch from current `main`: `audit/phase-N-<short-name>`.
2. Create a planning doc at `docs/planning/audit-phase-N-<short-name>.md` capturing scope, decisions made during execution, and any deviations from this plan.
3. Implement with incremental commits per logical unit rather than one large commit.
4. Run quality gates: `npm run build`, `npm run lint`. Once Phase 4 ships, `npm test` is added to the gates from that phase onward.
5. Add a `[Unreleased]` CHANGELOG entry summarizing the phase's user-visible or developer-visible changes.
6. Merge to `main`; mark the phase's planning doc as `Complete` in its status header. Leave it in `docs/planning/` until the audit plan as a whole concludes, then archive together.

---

## Phase 0 — 1.6.3 release-blocker pass

**Goal:** Restore the green-checkmark status on the new Obsidian Community website by fixing the one Error-level finding and the release-pipeline items, while landing the cheap cosmetic cleanup that shouldn't wait for later phases.

This phase ships as version 1.6.3 — a single patch release whose visible payoff is the community-site banner clearing. The cosmetic cleanup rides along to avoid a second small release for the same set of files.

### Error fix

`main.ts:2031` creates a `<style>` element via `document.createElement('style')` and attaches it to `document.head` in `addCoreWordCountStyle`. The Obsidian guidelines disallow this; CSS must go through `styles.css`, which Obsidian loads automatically. Move the rule into `styles.css` gated on a body class, and toggle the class from `addCoreWordCountStyle` based on the `hideCoreWordCount` setting. The rule itself:

```css
body.word-count-hide-core .status-bar-item.mod-clickable:not(.plugin-word-count) {
    display: none !important;
}
```

`addCoreWordCountStyle` becomes a one-liner that adds or removes the `word-count-hide-core` class from `document.body`. The dynamically-injected style element is removed entirely, and the cleanup in `onunload` that removes the style element by id is replaced with a class-removal call.

### Release-pipeline items

The release uploaded for v1.6.2 contains `custom-selected-word-count-v1.6.2.zip` alongside `main.js`, `manifest.json`, and `styles.css`. Obsidian only downloads the three supported files; the zip is at best wasted bytes and at worst a confusion vector for users who download the release manually. Two changes:

1. The zip file is removed from the repo root and added to `.gitignore` so it doesn't get accidentally recommitted.
2. The release workflow (if one exists) is audited to confirm only the three supported files are uploaded. If the project doesn't have a release workflow and uploads are manual, document the three-files rule in `CONTRIBUTING.md` or a new `docs/developer/release.md`.

Both `main.js` and `styles.css` are flagged for missing GitHub artifact attestations. Add `actions/attest-build-provenance` to whatever workflow builds the release artifacts. If no GitHub Actions workflow exists for releases yet, create one — the standard Obsidian plugin release workflow template handles attestation cleanly.

### Cosmetic cleanup

The following land together as small commits:

- Remove the `// BUILD: 2025-05-07` comment at `main.ts:1`. Build dates aren't versioned via source comments.
- Remove the `// Remember to rename these classes and interfaces!` placeholder comment at `main.ts:5`, left over from the Obsidian plugin template.
- Replace the hardcoded `version: '1.1.0'` literal in the log export function (near the end of `WordCountSettingTab.display`) with `this.plugin.manifest.version`. The literal has been stale since 1.2.0; users sending log exports for diagnostic purposes have been reporting an incorrect version.
- Fix the broken Buy Me a Coffee anchor in `README.md` — the href is wrapped in markdown link syntax: `<a href="[https://...](https://...)">`. The result is a non-functional link in rendered Markdown.
- Remove broken doc path references. CLAUDE.md references `@src/testing/TestSuiteModal.ts` (no `src/` exists) and `docs/developer/architecture/overview.md` (doesn't exist); README references the same nonexistent architecture path. Remove these references; the architecture doc gets created in Phase 6 after the split has produced something to describe. CLAUDE.md's reference to `TestSuiteModal` is replaced with a note that tests are added in Phase 4.
- Reconcile the mobile statement. `manifest.json` declares `isDesktopOnly: false`; README warns mobile is untested. Flip the manifest to `isDesktopOnly: true` for now. Phase 6 revisits this with the option to actually test on mobile if there's interest.

### Acceptance

- `npm run build` produces a clean build.
- The community-site scan, re-run after release, shows zero Error-level findings. The Warning-level findings remain — those are Phases 2 and 3.
- The release uploads only the three supported files.
- Both `main.js` and `styles.css` carry valid GitHub artifact attestations.
- The `word-count-hide-core` class system works in source/preview modes when the setting is toggled.

### CHANGELOG entry

User-visible: "Fixed an issue causing the plugin to fail the Obsidian Community automated review. Internal CSS handling now goes through `styles.css` rather than dynamically-injected style elements."

Developer-visible (if maintaining a separate section): release pipeline now produces attested artifacts; release artifacts no longer include the source zip.

**Branch:** `audit/phase-0-release-blockers`.

**Release target:** 1.6.3 patch.

---

## Phase 1 — Investigation

**Goal:** Produce the evidence base for Phases 2 through 6. No source-code changes.

The community-site scan has already done most of the inventory work that Phase 1 would otherwise do, which makes this phase lighter than the equivalent phase in the Charted Roots or Draft Bench audits. The remaining investigation is targeted.

### Tasks

**Exclusion-pipeline duplication map.** `countSelectedWords`, `countSelectedCharacters`, and `countSelectedSentences` each independently orchestrate the same chain of exclusion processors (code blocks → inline code → Obsidian comments → HTML comments → links → headings → words/phrases). Walk each function, identify the precise duplicated regions, and produce a unified pseudo-code for the extracted `applyExclusions` orchestrator that Phase 5 will introduce. Document any subtle differences between the three pipelines that aren't immediately obvious — for instance, `countSelectedSentences` does a second URL-and-path stripping pass after the override-processing wrapper, which appears to be redundant with the link processor; verify whether that's intentional or a vestige.

**Unused-declaration triage.** The bot flagged roughly 15 declarations as unused. Walk each and classify: genuinely dead (remove in Phase 2), dormant-intentional (preserved with an explanatory comment), or actually used in a way the linter doesn't detect. Particular attention to `DEFAULT_WORD_REGEX` at `main.ts:59` — the constant is declared but the regex is duplicated inline at the use site. Decide whether to delete the constant or repoint the use site at it; the latter is the better fix because it gives one source of truth for the default regex.

**Test infrastructure design.** Phase 4 introduces vitest. Phase 1 produces the design doc: what test runner config (vitest with `node` environment, `obsidian` module mocked), what shape of tests (characterization tests on the public counting entry points — `countSelectedWords`, `countSelectedCharacters`, `countSelectedSentences`, `countSelectedText` — capturing current behavior on a corpus of sample inputs covering each exclusion type plus combinations), what coverage target (the three count entry points, all exclusion modes, and the four override mechanisms — frontmatter array, frontmatter string, frontmatter `all`, and inline comment markers). The Obsidian-module mock is the load-bearing piece; document the minimal surface needed (`App`, `MarkdownView`, the `Plugin` base class — though most tests should be able to operate on the pure text-processing functions without instantiating the plugin at all).

**Mobile decision documentation.** Phase 0 flipped the manifest to `isDesktopOnly: true`. Phase 1 records the rationale and the conditions under which mobile support might be revisited: would require testing the Canvas iframe polling path, the CTRL/Cmd-A reading-view handler, and the status bar layout on iOS and Android. Not a Phase 6 deliverable per se, but a documented decision point.

**TestSuiteModal disposition.** CLAUDE.md references a `src/testing/TestSuiteModal.ts` that doesn't exist. Phase 1 decides what this should become. Three options: (a) it was aspirational and gets removed from CLAUDE.md entirely, replaced with a reference to the Phase 4 vitest suite; (b) it was a real thing that got deleted, and the intent is to recreate it as an in-Obsidian test runner modal that complements the vitest suite; (c) it's reinterpreted as the vitest suite itself, and CLAUDE.md is rewritten accordingly. Without prior knowledge of the original intent, recommend (a) — the vitest suite gives the safety net; an in-app test modal is duplicative effort.

### Deliverable

`docs/planning/audit-phase-1-investigation.md` containing:

- Exclusion-pipeline duplication map with the proposed `applyExclusions` signature and orchestration logic
- Unused-declaration disposition table (declaration, file:line, classification, action)
- Test infrastructure design spec ready to be the prompt for Phase 4
- Mobile decision record
- TestSuiteModal disposition decision

### Acceptance

Planning doc exists, is reviewed, and informs the prompts for Phases 2 through 6. No source-code changes.

**Branch:** `audit/phase-1-investigation`.

**Release target:** None (no code changes).

---

## Phase 2 — Hygiene and bug fixes

**Goal:** Fix the two real bugs uncovered by the audit and clear the trivially-mechanical findings from the bot scan. Behavior-preserving except for the two intentional bug fixes.

### The two real bugs

**`exclusionList` overwritten on every load.** `loadSettings` ends with `this.settings.exclusionList = DEFAULT_EXCLUSION_LIST; await this.saveSettings();`. Any user customization is destroyed on every Obsidian restart. The comment claims this "ensures up-to-date" but the actual effect is data loss.

The fix has two layers. First, remove the unconditional reset — `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` already handles the default-population for missing fields, so the explicit reset is wrong. Second, accept that existing user data on disk may already contain the default list (because every load wrote it back), so there's no way to recover lost customization; the bug fix prevents future loss but can't undo past loss. Document this in the CHANGELOG entry: "Fixed an issue where customized exclusion lists were reset to the default on every plugin load. Note: any customization made before this version was not preserved and will need to be re-entered."

**History persistence shape mismatch.** `WordCountPluginSettings.history` is typed as `{ count: number; date: string }[]` with no `characterCount` or `sentenceCount` fields, but `WordCountHistoryEntry` (the runtime type) includes both. Persistence drops the character and sentence counts on every save; on reload, history entries show words-only regardless of what the user saw at the time.

The fix: update the settings type to include optional `characterCount` and `sentenceCount` fields, update the load logic in `loadSettings` to read them back (currently it maps only `count` and `date`), and update the save logic to write them. Existing user data lacks the fields and will produce undefined-valued history entries on first load post-fix — handle this by coalescing to undefined and letting the modal's conditional rendering skip missing counts (which it already does correctly). CHANGELOG: "Fixed an issue where character and sentence counts in history were lost when Obsidian restarted. New entries persist all three counts. Existing history entries continue to show word counts only."

### Dead code removal

Per Phase 1's unused-declaration triage:

- The orphan `addExclusionInfo` helper at `main.ts:2452` and its associated CSS classes if not used elsewhere.
- The empty-body `setupRibbonButton` method whose comment says "Ribbon button functionality removed as per Obsidian guidelines." Remove the method and its call sites in `saveSettings`.
- The empty-body `updateClasses` method whose comment says "All styling is now handled directly by individual methods." Remove the method and its three call sites.
- The `saveHistory` method that just delegates to `saveSettings`. Replace call sites with direct `saveSettings` calls.
- Unused imports: `Editor`, `TFile`, `parseYaml` from the top-of-file import block.
- Unused declarations confirmed dead by Phase 1: `headingText` at `main.ts:487`, `formatDateISO` at `main.ts:1292`, `view` at `main.ts:1339`, the caught error `e` at `main.ts:1619`, `titleEl` at `main.ts:2198`, `textEl` at `main.ts:2300`, `originalIcon` at `main.ts:2389`, `overrideSummary` at `main.ts:2625`, `advSep` / `advSummary` / `advToggle` / `testDesc` in the advanced regex section.

`DEFAULT_WORD_REGEX` is the exception per Phase 1's disposition — the inline regex at the use site gets replaced with a reference to the constant rather than deleting either.

### Trivial mechanical fixes

- Unnecessary regex escapes at `main.ts:396, 402, 848, 1072, 1084, 1096, 1133, 1155`. Remove the escapes.
- "Unexpected lexical declaration in case block" at `main.ts:717`. Wrap the `case 'letters-only':` body in braces.
- "Unexpected `confirm`" at `main.ts:2271` is the clear-history confirmation dialog. Replace `confirm('Clear all history entries?')` with a small Obsidian Modal subclass that surfaces the same question with Confirm/Cancel buttons. The UX intent is preserved; the implementation moves to a documented API.
- Replace the `(this as any).renderHeadingsList = renderHeadingsList` and `(this as any).renderPhrasesList = renderPhrasesList` escape hatches with properly-typed fields on the settings tab class, or hoist the renderers to private methods.
- Address the "Promise-returning method provided where a void return was expected" warning at `main.ts:1310` on the `onload` method. Obsidian's `Plugin.onload` signature is `() => Promise<void> | void`, but the bot is reading it strictly. Verify the lint config doesn't accidentally have `no-misused-promises` over-tightened; if it's a genuine type issue, return `Promise<void>` explicitly or split the async work into a separate awaited block.

### Acceptance

- The bot scan, re-run after release, no longer shows the dead-code or trivial-mechanical warnings addressed in this phase.
- `npm run build` and `npm run lint` pass.
- Manual test: customize the exclusion list, restart Obsidian, confirm the customization persists.
- Manual test: generate a count with characters and sentences enabled, restart Obsidian, open the history modal, confirm character and sentence counts persist for newly-created entries.

### CHANGELOG entry

User-visible: two bug-fix entries (exclusionList preservation, history persistence) plus a "Internal cleanup" line for the dead-code and mechanical fixes.

**Branch:** `audit/phase-2-hygiene`.

**Release target:** 1.6.4 patch.

---

## Phase 3 — Obsidian API conformance

**Goal:** Clear the remaining bot-scan warnings related to Obsidian API usage. No behavior change for users beyond the popout-window compatibility wins.

### Scope

The work breaks into seven buckets. Each bucket lands as its own commit (or small commit series) on the phase branch so changes are reviewable in coherent chunks.

**3a — DOM creation patterns.** Replace `document.createElement('input')` / `document.createElement('a')` / `document.createElement('style')` with the Obsidian `createEl` API. Replace `regexRow.createEl('span', ...)` with `regexRow.createSpan(...)`, `details.createEl('div', ...)` with `details.createDiv(...)`, `testArea.createEl('div', ...)` with `testArea.createDiv(...)`. Bot-flagged sites: `main.ts:2465, 2477, 2920, 3043, 3174, 3187, 3188, 3189, 3288`. The style element at `main.ts:2031` was already removed in Phase 0.

**3b — Window-aware globals.** The bot wants `activeDocument` instead of `document` and `activeWindow.setInterval` / `activeWindow.clearInterval` / `activeWindow.setTimeout` / `activeWindow.clearTimeout` instead of the bare globals, all for popout-window compatibility. Bot-flagged sites for `document`: `main.ts:1415, 1416, 1419, 1423, 1432, 1513, 1606, 1749, 1829, 1830, 1833, 1930, 1959, 2027, 2031, 2039, 2920, 3043, 3288, 3291, 3293`. For timer functions: `main.ts:1530, 1533, 1556, 1600, 1618, 1644, 1818, 2332, 2395, 2470`. Note that several of the `document` sites are inside event-handler arrow methods (`handleSelectionChange`, `handleKeyDown`) and several are inside the Canvas polling code — those need consistent treatment to avoid mixing `activeDocument` and `document` in adjacent lines.

**3c — `activeLeaf` deprecation.** Four sites at `main.ts:1500, 1601, 1730, 1919`. Replace with `getActiveViewOfType(MarkdownView)` for the markdown-view path and `getMostRecentLeaf()` for the Canvas fallback. The view-type discrimination logic stays the same; only the leaf-acquisition call changes.

**3d — Inline styles to CSS classes.** Eight bot-flagged sites: `main.ts:2329, 2335, 2392, 2398` set `element.style.background`; `main.ts:2330, 2336, 2393, 2399` set `element.style.color`; `main.ts:3206, 3216, 3221` set `element.style.display`. These are the copy-button visual-feedback animation (background and color toggle during the 1-second confirmation flash) and the `updateSettingsUI` show/hide logic. The copy-button feedback becomes a `word-count-copy-confirmed` class toggle with the colors specified in `styles.css`. The show/hide logic was already partly using `toggleClass('word-count-hidden', ...)` — extend the same pattern to the remaining `style.display` sites. The modal's `applyDynamicFontSize` `.style.fontSize` set (not bot-flagged because it's set once, not toggled) gets the same treatment with a series of `word-count-value-size-N` classes, where N is the digit count bucket.

**3e — Settings tab typing.** Roughly 35 sites typed as `(toggle: any)`, `(text: any)`, `(dropdown: any)`, `(button: any)` in the settings callback functions. Import the proper component types from Obsidian (`ToggleComponent`, `TextComponent`, `DropdownComponent`, `ButtonComponent`, `MomentFormatComponent`) and type the callbacks. The bot-flagged sites for `any` are extensive — see the scan output — but the work is largely search-and-replace once the imports are in place.

**3f — Settings heading pattern.** `main.ts:2639` creates an `h4` element directly. Replace with `new Setting(containerEl).setName(...).setHeading()` per Obsidian's UI consistency guideline. There's only one site, but it's the kind of thing the bot flags consistently across plugins.

**3g — Platform API for OS detection.** Four sites at `main.ts:3272, 3273, 3274, 3275` in the log-export function use `navigator.userAgent.includes('Windows')` etc. to detect the operating system. Replace with Obsidian's `Platform` API (`Platform.isMacOS`, `Platform.isMobileApp`, etc.). The log export's "system" object becomes more accurate as a side benefit — Platform-based detection is more reliable than user-agent string sniffing.

### Additional items

- **Promise hygiene.** The bot flagged "Promises must be awaited" at `main.ts:1409, 2274, 2468, 2946, 3069` and "Promise returned where void return was expected" at `main.ts:2322, 2384, 2953, 3076`. Walk each; the typical fix is either adding `await` or wrapping in `void (...)`. The void-wrapping is appropriate where the promise is fire-and-forget and the failure mode is handled elsewhere (notifying the user via Notice); the await is appropriate where the next operation depends on the promise's completion.
- **Avoid unnecessary console logging.** `main.ts:126` is the `console.log` inside `debugLog`. That's gated on `enableDebugLogging` and is the entire point of the function — the bot's warning is a false positive for this site. Add an eslint-disable comment on that one line with a rationale.
- **`builtin-modules` dependency.** `package.json:33`. Same finding Draft Bench resolved by switching to `node:module`'s `builtinModules` export. The fix is in `esbuild.config.mjs` — change `import builtins from "builtin-modules"` to `import { builtinModules as builtins } from "node:module"`, and remove the dependency from `package.json`.

### Acceptance

- The bot scan, re-run after release, shows substantially fewer warnings (target: under 10 remaining, ideally zero in the buckets listed above).
- `npm run build` and `npm run lint` pass.
- Manual test: open the plugin in a popout window; confirm the status bar, settings tab, and modal all work in that context. The popout-window compatibility is the main behavior win from this phase.
- Manual test: exercise every settings toggle, dropdown, text input, and button at least once to confirm the typed-component refactor didn't introduce regressions.

### CHANGELOG entry

User-visible: "Improved compatibility with Obsidian's popout windows. The plugin now uses Obsidian's recommended APIs throughout, addressing the remaining warnings from the Community plugin review."

**Branch:** `audit/phase-3-api-conformance`.

**Release target:** 1.6.5 patch.

---

## Phase 4 — Test infrastructure

**Goal:** Establish a characterization test suite over the public counting entry points so Phase 5's refactor has a load-bearing safety net. No production-code changes.

### Scope

**Add vitest as a devDependency.** Update `package.json` with `vitest` and `@vitest/ui` (the latter optional but useful for interactive development), and a `test` script: `"test": "vitest run"` plus `"test:watch": "vitest"`. Add `vitest.config.ts` configured for the `node` environment with the Obsidian module mocked.

**Mock the Obsidian module.** Create `tests/mocks/obsidian.ts` exporting the minimal surface needed by the counting functions: `App`, `MarkdownView`, `Plugin`, `Modal`, `PluginSettingTab`, `Setting`, `TFile`, `Notice`, and the `setIcon` and `parseYaml` re-exports. Most of these can be no-op classes or trivial stubs because the counting functions don't actually use them — they take the `App` instance only to query the active file's frontmatter, which the test cases will provide directly via dependency injection or by stubbing `app.workspace.getActiveFile` and `app.metadataCache.getFileCache`.

**Write characterization tests for the three count entry points.** Organize as `tests/counting/words.test.ts`, `tests/counting/characters.test.ts`, `tests/counting/sentences.test.ts`. Each test case is a tuple of (input text, settings, expected count). Coverage targets:

- Each exclusion type independently: code blocks, inline code, Obsidian comments (markers only and with content), HTML comments (markers only and with content), link non-visible portions, headings (markers only, entire lines, specific sections), words/phrases.
- A handful of combination cases: comments + headings, code + links, words + phrases, all-exclusions-on.
- The four override mechanisms: frontmatter array (`cswc-disable: [item1, item2]`), frontmatter string (`cswc-disable: item`), frontmatter `all`, and inline comment markers (`<!-- cswc-disable -->` ... `<!-- cswc-enable -->`, both HTML and Obsidian styles).
- The character-count modes: `all`, `no-spaces`, `letters-only`.
- The sentence-count edge cases the existing code already handles: abbreviations (`Mr.`, `Dr.`, `etc.`), decimal numbers, file extensions, URLs.
- A few smoke tests for the word-count regex including the smart-quote contraction handling from 1.6.0.

Test count target: 50–100 tests. The threshold is enough coverage that any future refactor's regression would surface in CI, without writing so many tests that maintaining them becomes its own burden.

**Run the suite against current code.** All tests must pass before Phase 4 merges. This is the point of characterization tests — they capture current behavior, including any quirks. If a quirk surfaces during test-writing that looks like a bug, log it as a finding for a later phase rather than fixing it in Phase 4; the test suite freezes behavior as-is.

**Add `npm test` to quality gates.** Update the per-phase workflow in this document and (optionally) add a GitHub Actions workflow that runs `npm test` on push to `main` and on pull requests.

### Acceptance

- `npm test` runs the suite and all tests pass.
- The suite covers all three count entry points, all exclusion types, all override mechanisms, all character-count modes, and the documented sentence-count edge cases.
- The Obsidian module mock is documented in a comment block explaining what surface is mocked and why.
- Planning doc captures any quirks discovered during test-writing that warrant future investigation.

### CHANGELOG entry

Developer-visible only; the test suite doesn't ship to users. Brief entry: "Internal: added vitest test infrastructure."

**Branch:** `audit/phase-4-tests`.

**Release target:** None (no production-code changes).

---

## Phase 5 — Single-file split and exclusion-pipeline deduplication

**Goal:** Decompose the 120 KB `main.ts` into a focused module tree under `src/` and extract the exclusion orchestration shared by the three count functions. Internal structure change with no public API change and no behavior change.

### Scope

**Module layout.** Split `main.ts` into:

```
src/
├── main.ts                          // Plugin entry: CustomSelectedWordCountPlugin class
├── settings/
│   ├── types.ts                     // WordCountPluginSettings interface, DEFAULT_SETTINGS, DEFAULT_EXCLUSION_LIST, DEFAULT_WORD_REGEX
│   └── tab.ts                       // WordCountSettingTab class
├── processing/
│   ├── frontmatter.ts               // stripFrontmatter, getDisabledExclusionsFromFrontmatter
│   ├── overrides.ts                 // processTextWithOverrides
│   ├── code.ts                      // processCodeBlocks, processInlineCode
│   ├── comments.ts                  // processObsidianComments, processHtmlComments
│   ├── links.ts                     // processLinks
│   ├── headings.ts                  // processHeadings, processSelectiveHeadingSections
│   └── words-and-phrases.ts         // processWordsAndPhrases
├── counting/
│   ├── pipeline.ts                  // applyExclusions orchestrator (the extracted shared logic)
│   ├── words.ts                     // countSelectedWords
│   ├── characters.ts                // countSelectedCharacters
│   ├── sentences.ts                 // countSelectedSentences
│   └── index.ts                     // countSelectedText (the aggregator)
├── ui/
│   └── modal.ts                     // WordCountModal class
└── types.ts                         // WordCountHistoryEntry, CountResult
```

Top-level `main.ts` is replaced with a thin re-export: `export { default } from './src/main';`. The esbuild entry point remains `main.ts` so the build output is unchanged. Obsidian sees the same `main.js` either way.

**Exclusion-pipeline extraction.** The heart of this phase. Replace the duplicated orchestration in `countSelectedWords`, `countSelectedCharacters`, and `countSelectedSentences` with a single `applyExclusions` function in `src/counting/pipeline.ts`:

```typescript
export function applyExclusions(
    text: string,
    settings: WordCountPluginSettings,
    plugin: CustomSelectedWordCountPlugin | undefined,
    disabledExclusions: string[],
): string {
    return processTextWithOverrides(text, (segment) => {
        let result = segment;
        if (settings.excludeCode && settings.excludeCodeBlocks && !disabledExclusions.includes('exclude-code-blocks')) {
            result = processCodeBlocks(result, true, plugin);
        }
        if (settings.excludeCode && settings.excludeInlineCode && !disabledExclusions.includes('exclude-inline-code')) {
            result = processInlineCode(result, true, plugin);
        }
        // ... comments, links, headings, words/phrases ...
        return result;
    }, plugin);
}
```

Each of the three count functions then calls `applyExclusions` once and applies its mode-specific counting on the result. The roughly 150 lines of duplicated orchestration collapse to one definition. Phase 1's investigation doc captures the exact orchestration logic including any subtle differences between the three current versions (such as the redundant URL/path stripping in `countSelectedSentences`); Phase 5 either eliminates those differences (preferred, if they were vestigial) or preserves them by passing a mode flag to `applyExclusions`.

**Test-driven verification.** Phase 4's test suite is the load-bearing guarantee that Phase 5 doesn't break anything. Run `npm test` continuously during the split; any failing test means the refactor diverged from current behavior and needs to be corrected before merging.

### Constraints

- No behavior changes. Same exclusion logic, same processing order, same edge-case handling.
- No public API changes. The build output (`main.js`) loads in Obsidian exactly as before. The plugin id, manifest, and on-disk settings shape are unchanged.
- All Phase 4 tests must pass without modification at every commit. The test suite freezes behavior as the safety net.
- Internal helper functions move with the code that uses them; don't duplicate them across modules.

### Verification

- `npm test` continuously during refactor; halt on first regression.
- `npm run build` confirms the bundle still produces.
- `npm run lint` confirms imports are clean and there are no circular dependencies.
- Manual exercise of every feature one more time before merge: count words/characters/sentences with various exclusion combinations, exercise the per-note frontmatter override, exercise the inline comment override, open and use the history modal, open and adjust every settings panel.

### Acceptance

- `main.ts` is replaced by the `src/` directory with the structure above.
- `applyExclusions` is the sole orchestrator; the three count functions no longer duplicate exclusion logic.
- All Phase 4 tests pass without modification.
- `npm run build`, `npm test`, `npm run lint` all pass.
- Planning doc captures the module boundaries and the deduplication finding (lines of duplication removed, any subtle differences preserved or eliminated).

### CHANGELOG entry

Internal refactor; brief user-facing entry, e.g., "Internal: refactored the plugin into a modular file structure. No user-visible changes."

**Branch:** `audit/phase-5-split`.

**Release target:** 1.7.0 minor bump. Minor bumps are reserved for significant internal changes that warrant signalling to anyone following the repo, even when the user-visible surface is unchanged.

---

## Phase 6 — Lower-priority cleanup and forward-compat

**Goal:** Opportunistic improvements that didn't earn their own phase but are worth doing while the audit context is fresh.

Each item is independent; implement any subset. Suggested priority (highest value per effort first):

**Architecture documentation.** With Phase 5 complete, there's something real to describe. Create `docs/architecture/overview.md` with the module tree, the data flow (text → `applyExclusions` → mode-specific counting → modal display), the settings-persistence shape, the override mechanism (frontmatter + inline markers), and the Canvas-polling caveat. Update the references in CLAUDE.md and README that Phase 0 removed; they can now point to a real document.

**CLAUDE.md rewrite.** Phase 0 patched the broken references; Phase 6 does the deeper rewrite incorporating "do not" patterns drawn from the audit. Examples: do not create `<style>` elements at runtime; do not use bare `document` / `setInterval` / `setTimeout`; do not use `activeLeaf`; do not set inline styles for toggleable state. Plus a positive section: prefer `createEl` / `createDiv` / `createSpan`; prefer `activeWindow` / `activeDocument`; prefer `new Setting().setHeading()` for section headers; prefer typed component callbacks. Add a reference to the vitest suite as the load-bearing safety net for future changes.

**Archive completed planning docs.** Move `docs/planning/new-exclusions-feature.md` and `docs/planning/per-note-exclusion-overrides.md` to `docs/planning/archive/`. Both are marked complete and pre-date this audit. Create the `archive/` subdirectory if it doesn't exist.

**Sentence-count abbreviation regex deduping.** The regex at `main.ts:1099`-ish (post-Phase 5: `src/counting/sentences.ts`) contains a long pipe-separated list of abbreviations that has visible duplication (`mil|museum|name|pro|travel|xxx|tel` appears twice). Deduplicate; verify all originally-intended abbreviations are still present.

**Canvas polling architecture review.** The 500 ms `setInterval` loop polling iframe selections is a heavy approach. Investigate whether the same goal can be achieved event-driven — listening for `focus` events on the iframe, or wiring into Canvas's own selection events if Obsidian exposes them. If feasible, switch to event-driven; if not, document the polling as a deliberate design choice with the reasoning. This is opportunistic — the polling works today and isn't an active problem.

**Mobile decision revisit.** Phase 0 flipped the manifest to `isDesktopOnly: true` as a defensive default. Phase 6 is the point at which actual mobile testing could happen if there's interest: install the plugin on iOS or Android Obsidian, exercise the core flows (count selected text, modal display, status bar, settings panels), document what works and what doesn't, decide whether to flip the manifest back. If skipped, the desktop-only stance stands.

### Acceptance

Whatever subset of the above is implemented passes all quality gates and is captured in the planning doc with rationale for items deliberately skipped.

### CHANGELOG entry

Brief, listing each cleanup item.

**Branch:** `audit/phase-6-cleanup`.

**Release target:** Bundled into the next convenient release; doesn't justify its own version bump.

---

## Inter-phase dependencies

Phase 0 is independent and ships first as a fast 1.6.3 patch. Don't wait on later phases to fix the bot blockers.

Phase 1 informs every subsequent phase. Don't start Phase 2 or beyond without Phase 1's findings doc.

Phase 2 is independent of Phase 3 in principle, but landing Phase 2 first means Phase 3's API-conformance work happens against a tidier surface (no dead code to touch and forget, no orphaned variables to refactor accidentally).

Phase 3 should land before Phase 5 so the API-conformance changes happen in one file before module boundaries multiply the edit sites. Doing Phase 3 after Phase 5 would mean making the same kind of change in 12 files instead of one.

Phase 4 is the precondition for Phase 5. The test suite is the safety net; without it, the split is a leap of faith. Don't start Phase 5 until Phase 4 has merged.

Phase 6 has no dependencies on Phases 2 through 5 individually, but is best done last so the cleanup targets reflect the post-refactor codebase (particularly the architecture doc, which depends on the Phase 5 module structure existing).

**Suggested order:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6, with merges to `main` between each. Phases 0, 2, 3, and 5 each carry a version bump; Phases 1, 4, and 6 don't ship independently.

---

## Status

- [x] Phase 0 — Release-blocker pass — shipped 2026-05-12 in 1.6.3 (bundled with Phases 2 + 3)
- [x] Phase 1 — Investigation — complete (no release; findings folded into subsequent phase plans)
- [x] Phase 2 — Hygiene and bug fixes — shipped 2026-05-12 in 1.6.3
- [x] Phase 3 — Obsidian API conformance — shipped 2026-05-12 in 1.6.3
- [x] Phase 4 — Test infrastructure — shipped 2026-05-12 in 1.6.7 (134 vitest tests)
- [x] Phase 5 — Single-file split and exclusion-pipeline dedup — shipped 2026-05-13 in 1.7.0
- [x] Phase 6 — Lower-priority cleanup — shipped 2026-05-13 in 1.7.1 (six items: planning-doc archive, sentence-regex dedup, Canvas polling review + decision, mobile decision, architecture doc, CLAUDE.md rewrite)

Three intermediate patch releases shipped during the audit to fix issues surfaced by the community-site rescan and CI rollout:

- 1.6.4 (2026-05-12) — community-site rescan fixes (CSS brace, timer functions, `no-explicit-any`)
- 1.6.5 (2026-05-12) — CSS polish (duplicate selectors, `!important` cleanup)
- 1.6.6 (2026-05-12) — CI release pipeline with `actions/attest-build-provenance@v2`, modal `@media` rule scoping, `no-unsafe-*` narrowing

The audit is complete. This document stays at `docs/planning/` for now as historical reference; will move to `docs/planning/archive/` along with the per-phase planning docs when convenient.
