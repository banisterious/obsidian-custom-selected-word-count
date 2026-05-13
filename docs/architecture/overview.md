# Architecture overview

This document describes the post-audit (Phase 5) module structure, data flow, persistence, and the load-bearing internal contracts of the Custom Selected Word Count plugin. The audience is a future contributor who needs to navigate the codebase without reading every file; the goal is to make "where do I make this change?" answerable in seconds.

For the current shipped version and what's pending, read `manifest.json`, `CHANGELOG.md`'s `[Unreleased]` section, and the audit plan's § Status checklist (`docs/planning/audit-implementation-plan.md`).

---

## Module tree

```
.
├── main.ts                              // Thin entry point. Re-exports the default
│                                        // (Plugin class) for Obsidian and named
│                                        // declarations for the vitest test suite.
│                                        // esbuild bundles this into main.js.
├── src/
│   ├── main.ts                          // The Plugin class (CustomSelectedWordCountPlugin).
│   │                                    // Owns onload/onunload, the status bar,
│   │                                    // selection handlers, history, command
│   │                                    // and context-menu registration.
│   │
│   ├── types.ts                         // Shared domain types: CountResult,
│   │                                    // WordCountHistoryEntry. No runtime
│   │                                    // dependencies.
│   │
│   ├── obsidian-internals.ts            // Typed views of Obsidian's undocumented
│   │                                    // App internals (the settings panel
│   │                                    // controller and appVersion). Used by
│   │                                    // the Plugin class and the settings tab
│   │                                    // to deep-link into the settings panel.
│   │
│   ├── settings/
│   │   ├── types.ts                     // WordCountPluginSettings interface,
│   │   │                                // DEFAULT_SETTINGS, DEFAULT_EXCLUSION_LIST,
│   │   │                                // DEFAULT_WORD_REGEX. The source of truth
│   │   │                                // for what "settings" means in this plugin.
│   │   └── tab.ts                       // WordCountSettingTab class. Renders the
│   │                                    // settings UI. ~770 lines of Setting()
│   │                                    // builder calls plus the regex tester and
│   │                                    // the log-export feature.
│   │
│   ├── utils/
│   │   └── debug.ts                     // debugLog(), errorMessage(), and the
│   │                                    // DebugLoggable structural interface that
│   │                                    // processing and counting modules use to
│   │                                    // type their `plugin?` parameter without
│   │                                    // depending on the Plugin class.
│   │
│   ├── processing/                      // Each module is a pure(-ish) text
│   │   │                                // transformer that takes (text, settings
│   │   │                                // flags, optional plugin for debug
│   │   │                                // logging) and returns transformed text.
│   │   │                                // None of these touch Obsidian's runtime
│   │   │                                // beyond debug logging.
│   │   ├── frontmatter.ts               // stripFrontmatter (no Obsidian),
│   │   │                                // getDisabledExclusionsFromFrontmatter
│   │   │                                // (needs `App` for active-file lookup).
│   │   ├── overrides.ts                 // processTextWithOverrides. Walks text
│   │   │                                // looking for cswc-disable / cswc-enable
│   │   │                                // marker pairs and runs the inner
│   │   │                                // processFunc only on un-disabled
│   │   │                                // regions.
│   │   ├── code.ts                      // processCodeBlocks, processInlineCode.
│   │   ├── comments.ts                  // processObsidianComments (%% %%),
│   │   │                                // processHtmlComments (<!-- -->).
│   │   ├── links.ts                     // processLinks. Replaces [[Note|alias]]
│   │   │                                // with "alias", [[Note]] with "Note",
│   │   │                                // [text](url) with "text".
│   │   ├── headings.ts                  // processHeadings (entire-line / markers-
│   │   │                                // only modes) and
│   │   │                                // processSelectiveHeadingSections (named
│   │   │                                // section removal with nested handling).
│   │   └── words-and-phrases.ts         // processWordsAndPhrases. Regex-escaped
│   │                                    // whole-word and substring removal.
│   │
│   ├── counting/
│   │   ├── pipeline.ts                  // applyExclusions — THE orchestrator.
│   │   │                                // Wraps processTextWithOverrides around
│   │   │                                // the seven processing helpers in the
│   │   │                                // order: code blocks -> inline code ->
│   │   │                                // comments -> links -> headings ->
│   │   │                                // words/phrases. Each step gated by its
│   │   │                                // settings toggle AND the per-call
│   │   │                                // disabledExclusions list.
│   │   ├── characters.ts                // countSelectedCharacters. Runs
│   │   │                                // applyExclusions then applies one of
│   │   │                                // three modes: all / no-spaces /
│   │   │                                // letters-only.
│   │   ├── sentences.ts                 // countSelectedSentences. Runs
│   │   │                                // applyExclusions then strips raw URLs/
│   │   │                                // paths (safety net for content not
│   │   │                                // wrapped in markdown link syntax),
│   │   │                                // splits on a sentence-boundary regex,
│   │   │                                // and filters parts.
│   │   ├── words.ts                     // countSelectedWords. Runs applyExclusions
│   │   │                                // then runs word-specific path detection
│   │   │                                // (greedy buffer extension; see
│   │   │                                // Phase 4 finding #1) and file-extension
│   │   │                                // filtering, then matches with the word
│   │   │                                // regex.
│   │   └── index.ts                     // countSelectedText aggregator. Calls all
│   │                                    // three counts and returns
│   │                                    // { words, characters, sentences }.
│   │
│   └── ui/
│       └── modal.ts                     // WordCountModal (the result + history
│                                        // display) and ConfirmModal (used by the
│                                        // history-clear button). Co-located
│                                        // because ConfirmModal is only used by
│                                        // WordCountModal.
│
├── tests/                               // vitest characterization suite
│   ├── mocks/
│   │   └── obsidian.ts                  // No-op stubs for the obsidian module.
│   ├── fixtures/
│   │   └── settings.ts                  // makeSettings() helper.
│   ├── counting/
│   │   ├── words.test.ts                // 37 tests
│   │   ├── characters.test.ts           // 18 tests
│   │   ├── sentences.test.ts            // 21 tests
│   │   └── text.test.ts                 // 5 tests
│   └── exclusions/
│       ├── overrides.test.ts            // 18 tests
│       └── processors.test.ts           // 35 tests
│
├── styles.css                           // Hand-maintained at repo root, loaded
│                                        // automatically by Obsidian.
├── manifest.json                        // Plugin id, version, isDesktopOnly.
├── versions.json                        // Released-version compatibility map.
├── esbuild.config.mjs                   // Production + dev bundle config.
├── vitest.config.ts                     // Test runner config.
├── tsconfig.json                        // Strict null checks, isolatedModules.
└── eslint.config.mjs                    // Flat config with typescript-eslint +
                                         // eslint-plugin-obsidianmd@0.3.0.
```

The dependency direction is strictly top-down: top-level `main.ts` → `src/main.ts` → its imports (settings/tab, ui/modal, counting, processing, utils, types). Within `src/`, modules import from siblings or deeper directories, never up. The two type-only back-edges (`src/ui/modal.ts` and `src/settings/tab.ts` each `import type CustomSelectedWordCountPlugin from '../main'`) are erased at compile time and don't create runtime cycles.

---

## Data flow: counting a selection

When the user runs the "Count selected words" command (or clicks the status bar), this is the path the selected text takes:

```
Plugin.handleWordCount()                           [src/main.ts]
  │
  │   Sources of the selection text, in priority order:
  │   1. MarkdownView.editor.getSelection()  (source mode / live preview)
  │      └── stripFrontmatter()             [src/processing/frontmatter.ts]
  │   2. Reading-view Range.toString()      (preview mode)
  │   3. Canvas iframe contentWindow.getSelection() (Canvas via polling cache)
  │   4. this.lastSelectedText             (fallback for post-status-bar-click)
  │
  ▼
getDisabledExclusionsFromFrontmatter(app)         [src/processing/frontmatter.ts]
  │   Reads the active file's `cswc-disable` frontmatter property.
  │   Returns [] / [single id] / [array of ids] / [the 11-item "all" expansion].
  │
  ▼
countSelectedText(text, exclusions, true, settings, this, disabled)
                                                  [src/counting/index.ts]
  │   Aggregates three independent counts.
  │
  ├─> countSelectedCharacters                     [src/counting/characters.ts]
  │     applyExclusions() -> mode switch (all / no-spaces / letters-only)
  │
  ├─> countSelectedSentences                      [src/counting/sentences.ts]
  │     applyExclusions() -> raw URL/path strip ->
  │     /[.!?]+(?:\s*["'])?(?:\s+|$)/g split -> guard-filter
  │
  └─> countSelectedWords                          [src/counting/words.ts]
        applyExclusions() ->
        file:/// strip ->
        whitespace split + greedy path-buffer extension ->
        extension filter ->
        emoji + quote strip ->
        custom-or-default word regex match
  │
  ▼
{ words, characters, sentences } returned
  │
  │   Plugin.handleWordCount continues:
  │
  ▼
this.statusBarItem?.setText(...)                  [src/main.ts]
this.history.unshift({ count, characterCount, sentenceCount, date })
this.history.length > 50 && this.history.pop()
this.saveSettings()
  │
  ▼
new WordCountModal(app, countResult, history, showDateTime, this).open()
                                                  [src/ui/modal.ts]
```

### Inside `applyExclusions`

The shared orchestrator wraps `processTextWithOverrides` around the seven exclusion processors:

```
applyExclusions(text, settings, plugin, disabled)  [src/counting/pipeline.ts]
  │
  ▼
processTextWithOverrides(text, segment => { ... }, plugin)
                                                  [src/processing/overrides.ts]
  │   Splits text on cswc-disable / cswc-enable markers. Calls the inner
  │   callback only on un-disabled regions; passes disabled regions through
  │   verbatim.
  │
  ▼ (for each un-disabled segment)
  │
  ├─> processCodeBlocks       (if excludeCode && excludeCodeBlocks && !disabled)
  ├─> processInlineCode       (if excludeCode && excludeInlineCode && !disabled)
  ├─> processObsidianComments (if excludeComments && excludeObsidian && !disabled)
  ├─> processHtmlComments     (if excludeComments && excludeHtml && !disabled)
  ├─> processLinks            (if excludeNonVisibleLinkPortions && !disabled)
  ├─> processHeadings         (if excludeHeadings && !disabled)
  └─> processWordsAndPhrases  (if excludeWordsAndPhrases && !disabled)
  │
  ▼
return result
```

Pre-Phase-5, each of the three count functions hand-rolled an identical copy of this pipeline. Phase 5's split consolidated it into `applyExclusions`; the count functions retain only their mode-specific post-pipeline work.

---

## Settings: shape and persistence

### Interface

`WordCountPluginSettings` (declared in `src/settings/types.ts`) is the on-disk and in-memory shape of all configurable behavior. Roughly 25 fields organized by feature area:

- **Status bar:** `showStatusBar`, `enableLiveCount`, `statusBarLabel`, `hideCoreWordCount`, `statusBarDisplayMode`.
- **Character count:** `showCharacterCount`, `characterCountMode` (`'all' | 'no-spaces' | 'letters-only'`).
- **Sentence count:** `showSentenceCount`.
- **History:** `history` (array of persisted entries), `showDateTimeInHistory`.
- **Exclusions:**
  - Code: `excludeCode` + `excludeCodeBlocks` + `excludeInlineCode`.
  - Comments: `excludeComments` + `excludeObsidianComments` + `excludeObsidianCommentContent` + `excludeHtmlComments` + `excludeHtmlCommentContent`.
  - Links: `excludeNonVisibleLinkPortions`.
  - Headings: `excludeHeadings` + `excludeHeadingMarkersOnly` + `excludeEntireHeadingLines` + `excludeHeadingSections[]`.
  - Words/phrases: `excludeWordsAndPhrases` + `excludedWords` (comma-separated string) + `excludedPhrases` (string array).
  - Paths: `excludePaths` + `excludeWindowsPaths` + `excludeUnixPaths` + `excludeUNCPaths` + `excludeEnvironmentPaths`.
  - File extensions: `exclusionList` (comma-separated string).
- **Advanced regex:** `enableAdvancedRegex`, `customWordRegex`.
- **Debug:** `enableDebugLogging`.

Each setting is named after what it does for the user; the matching frontmatter override identifiers (e.g., `exclude-windows-paths`) are stable strings parsed at runtime.

### Persistence

`Plugin.loadSettings()` merges `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())`. Missing fields fall through to the defaults; existing fields override. Date-string history entries are parsed into `Date` objects on the runtime `this.history` array.

`Plugin.saveSettings()` does the reverse: it syncs the runtime `this.history` (with `Date` objects) into `this.settings.history` (with ISO strings) before writing. This sync was added in 1.6.3 to fix a bug where character/sentence counts in history never reached disk.

### History entries

Two shapes:

- `WordCountHistoryEntry` (runtime, in `src/types.ts`): `{ count, characterCount?, sentenceCount?, date: Date }`.
- The persisted shape inside `WordCountPluginSettings.history`: `{ count, characterCount?, sentenceCount?, date: string (ISO) }`.

Bidirectional translation happens in `loadSettings()` and `saveSettings()`.

---

## Override mechanism

Two ways for a user to disable exclusions for specific text, both producing the same `disabledExclusions: string[]` parameter that flows through `applyExclusions`:

### Frontmatter

`cswc-disable` is a frontmatter property accepting three shapes:

```yaml
---
cswc-disable: exclude-headings
---
```

```yaml
---
cswc-disable: [exclude-headings, exclude-code-blocks]
---
```

```yaml
---
cswc-disable: all
---
```

`getDisabledExclusionsFromFrontmatter()` (in `src/processing/frontmatter.ts`) reads the property, normalizes single strings into arrays, filters non-string entries from arrays, and expands the literal `"all"` into the full 11-identifier list.

The identifier strings (e.g., `exclude-windows-paths`, `exclude-urls`, `exclude-code-blocks`) are stable user-facing API. Renaming any of them would silently break existing user notes; changes require a migration plan.

### Inline markers

Within a note body, the user can disable exclusions for a region:

```markdown
This text is fully processed.

<!-- cswc-disable -->
This region is kept verbatim — no exclusion runs here.
<!-- cswc-enable -->

Back to full processing.
```

Both HTML-style (`<!-- cswc-disable -->`) and Obsidian-style (`%% cswc-disable %%`) markers are supported.

`processTextWithOverrides` walks the text and routes disabled regions around the inner `processFunc`. Implementation is regex-based, single-pass.

---

## Status bar and Canvas polling

### Status bar

A single `HTMLElement` returned by `this.addStatusBarItem()`, optionally created in `onload()` based on `settings.showStatusBar`. The plugin's selection-handler chain (`handleSelectionChange`, `handleKeyDown`, plus the Canvas polling timer) updates the status bar text in response to user activity, gated by `settings.enableLiveCount`.

Click handler routes to `handleWordCount()` — the same path the command takes.

### Canvas polling

Obsidian Canvas embeds individual cards in iframes. Selections inside those iframes don't fire `selectionchange` events on the parent document the plugin listens to, so the plugin can't observe them via normal event flow. The plugin polls `iframe.contentWindow.getSelection().toString()` every 500 ms when `enableLiveCount` is on (`startCanvasPolling` / `stopCanvasPolling` in `src/main.ts`).

The polling is gated:

- Only runs when `enableLiveCount` is true (user-controlled; off by default).
- The poll callback itself early-returns when the active view isn't a Canvas.
- The 500 ms cadence is light (2 callbacks/sec); each callback does a workspace lookup + string compare + early return when not in Canvas.

An event-driven alternative would require attaching `selectionchange` listeners to each iframe's `contentDocument` and managing those across iframe lifecycle (creation, destruction). Considered and rejected in Phase 6 for complexity reasons; the polling works and is well-isolated. See `docs/planning/audit-phase-6-cleanup.md` § Findings for the full reasoning.

### Mobile support

Manifest carries `isDesktopOnly: true`. The status bar is "Not available on mobile" per Obsidian's docs, and the plugin's UX is built around it. Phase 6 confirmed this as the right call until either Obsidian adds mobile status-bar support or there's specific user interest in a mobile-only feature subset. Details in the Phase 6 planning doc.

---

## Build, test, lint

### Build

`npm run build` runs `tsc --noEmit -skipLibCheck` (type check across the entire `**/*.ts` tree, including tests) followed by `node esbuild.config.mjs production`. esbuild bundles top-level `main.ts` and everything it transitively imports into a single minified `main.js` at the repo root.

### Test

`npm test` runs the vitest suite once (`node ./node_modules/vitest/vitest.mjs run`). The suite runs against the source `main.ts` and the `src/` tree through vitest's esbuild transformer; the `obsidian` module is aliased to `tests/mocks/obsidian.ts` so imports resolve without the real Obsidian runtime.

The suite is **characterization tests**, not assertion tests against intended behavior. Three `LOCKED quirk:` tests in `tests/counting/sentences.test.ts` and `tests/counting/words.test.ts` capture pre-existing quirks (path exclusion is greedy; abbreviation guard never fires; file-extension guard discards entire sentences) so a future refactor can't silently change them. See `docs/planning/audit-phase-4-tests.md` § Findings.

The CI release workflow runs `npm test` between Lint and Build; a failing test blocks the draft release.

### Lint

`npm run lint` runs ESLint 9 with `typescript-eslint@^8` and `eslint-plugin-obsidianmd@^0.3.0`. The obsidianmd plugin matches the version the Obsidian Community website's automated rescan runs server-side, so local lint stays aligned with the catalog scanner.

The 0.3.0 recommended config has one entry without a `files:` restriction whose type-aware rules crash on non-TS inputs; `eslint.config.mjs` wraps that entry to scope it to `**/*.ts` and `**/*.tsx`. See the file's inline comments.

---

## Release pipeline

`.github/workflows/release.yml` runs on tag push (`*.*.*` for releases, `*.*.*-*` for pre-releases). The job:

1. Checks out the tagged commit.
2. Installs dependencies (`npm ci`).
3. Lint (`npm run lint`).
4. Test (`npm test`).
5. Build (`npm run build`).
6. Generates artifact attestations via `actions/attest-build-provenance@v2` for `main.js`, `manifest.json`, `styles.css`.
7. Creates a **draft** GitHub release (not published) with those three files as assets.

The author then opens the draft on the GitHub web UI, pastes the audited release-description markdown into the body, and clicks Publish. Auto-generated release notes are not used; they'd leak writing-style issues (em-dashes, Unicode arrows) past CLAUDE.md § 3.

Pre-release tags (e.g., `1.7.1-rc1`) cut a draft flagged `--prerelease`; the trial-run convention is documented in `docs/developer/release.md`.

---

## Where to make changes — a how-to-modify guide

**Change a count function's behavior** (e.g., new exclusion category, change the word regex default): edit the relevant `src/counting/*.ts` and/or `src/processing/*.ts`. Add a test in `tests/counting/` or `tests/exclusions/`. Run `npm test` to verify.

**Change settings UI**: edit `src/settings/tab.ts`. The structure is: `containerEl.createDiv({ cls: 'word-count-settings-group' })` for each feature area, then `new Setting(container).setName(...).setDesc(...).addToggle(...)` (or `addText`, `addDropdown`, `addButton`) per control. Live-update visibility logic lives at the end of `display()` in the `this.updateSettingsUI = () => { ... }` block.

**Add a new exclusion override identifier**: declare it in `getDisabledExclusionsFromFrontmatter`'s "all" expansion array, gate the relevant processor in `applyExclusions` on `!isDisabled('your-identifier')`, and add a setting + description text to the settings tab that mentions `• property: your-identifier` so users know the override key.

**Add a new persisted setting**: add the field to `WordCountPluginSettings` in `src/settings/types.ts` with a default in `DEFAULT_SETTINGS`. `loadSettings` will pick it up via `Object.assign({}, DEFAULT_SETTINGS, loaded)`. Wire it through the settings tab UI in `src/settings/tab.ts`.

**Change the modal**: edit `src/ui/modal.ts`. The modal accesses plugin state via the `plugin` parameter; for new features that need plugin data, prefer narrowing what the modal needs rather than passing the whole plugin.

**Add a command or context-menu item**: edit `src/main.ts`'s `onload()`. Commands go through `this.addCommand({ ... })`; context-menu items through `this.app.workspace.on('editor-menu', (menu, editor, view) => menu.addItem(...))`.

**Change a CSS rule**: edit `styles.css`. Use the `word-count-` class prefix (per CLAUDE.md § 2). Toggle visual state via class toggles, not inline styles.

**Change the release process**: edit `.github/workflows/release.yml`. The release-prep procedure and trial-run convention live in `docs/developer/release.md`.

---

## Glossary

- **Exclusion processor**: one of the seven functions in `src/processing/*.ts` that removes a specific category of text (code blocks, comments, links, etc.) when its setting toggle is on. All processors share the shape `(text, isEnabled, ...optional flags, plugin?) -> text`.
- **applyExclusions**: the single orchestrator in `src/counting/pipeline.ts` that wraps `processTextWithOverrides` around all seven processors, gated by the user's settings and the per-call disable list.
- **Override (frontmatter)**: a `cswc-disable` frontmatter property that disables specified exclusion identifiers for the current note.
- **Override (inline marker)**: a `<!-- cswc-disable -->` ... `<!-- cswc-enable -->` (or `%% %%`) pair within the note body that disables ALL exclusion processing for the enclosed region.
- **disabledExclusions**: the `string[]` parameter that flows through `applyExclusions` and the count functions. Populated by `getDisabledExclusionsFromFrontmatter` for the active file.
- **Canvas polling**: the 500 ms `setInterval` loop that observes selections inside Canvas iframes, since their `selectionchange` events don't bubble to the parent document.
- **Characterization test**: a test that captures current behavior of code as the assertion baseline, including pre-existing quirks. The vitest suite is a characterization suite, not an intent-asserting suite.
