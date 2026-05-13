# Audit Phase 5 — Single-file split and exclusion-pipeline deduplication

**Status:** Complete
**Branch:** `audit/phase-5-split`
**Release target:** 1.7.0 (minor bump per audit plan; significant internal restructure with no user-visible change)

Decompose the 120 KB `main.ts` into a focused module tree under `src/` and extract the exclusion orchestration shared by the three count functions. Phase 4's 134-test characterization suite is the load-bearing safety net: any regression Phase 5 introduces will surface in CI before merge.

The audit plan's Phase 5 brief is the spec; this doc captures execution choices and any deviations encountered during the refactor.

---

## Target module layout

```
src/
├── main.ts                          // Plugin entry: CustomSelectedWordCountPlugin class
├── types.ts                         // WordCountHistoryEntry, CountResult (shared)
├── settings/
│   ├── types.ts                     // WordCountPluginSettings, DEFAULT_SETTINGS, DEFAULT_EXCLUSION_LIST, DEFAULT_WORD_REGEX
│   └── tab.ts                       // WordCountSettingTab class
├── utils/
│   └── debug.ts                     // debugLog, errorMessage, DebugLoggable interface
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
│   └── index.ts                     // countSelectedText aggregator
└── ui/
    └── modal.ts                     // WordCountModal + ConfirmModal
```

Top-level `main.ts` becomes a thin re-export:

```ts
export { default } from './src/main';
```

The esbuild entry stays `main.ts` so Obsidian's build output (`main.js`) is unchanged.

---

## Extraction order

Bottom-up by dependency depth so each commit leaves the codebase in a buildable state.

1. **Pass 1 — Types and utils.** Pure declarations with no internal dependencies.
   - `src/settings/types.ts` (Settings interface and defaults)
   - `src/types.ts` (CountResult, WordCountHistoryEntry)
   - `src/utils/debug.ts` (debugLog, errorMessage, plus a `DebugLoggable` minimal-shape interface so processing/counting modules don't need to import the Plugin class)

2. **Pass 2 — Processing helpers.** Depend on Pass 1.
   - `src/processing/frontmatter.ts`
   - `src/processing/overrides.ts`
   - `src/processing/code.ts`
   - `src/processing/comments.ts`
   - `src/processing/links.ts`
   - `src/processing/headings.ts`
   - `src/processing/words-and-phrases.ts`

3. **Pass 3 — Counting.** Depends on Pass 1 + 2. The big behavioral consolidation lands here.
   - `src/counting/pipeline.ts` (NEW: `applyExclusions` orchestrator)
   - `src/counting/words.ts`
   - `src/counting/characters.ts`
   - `src/counting/sentences.ts`
   - `src/counting/index.ts` (aggregator)

4. **Pass 4 — UI.** Modal and confirmation dialog.
   - `src/ui/modal.ts` (WordCountModal + ConfirmModal)

5. **Pass 5 — Settings tab.** The largest single class. Depends on everything above for type imports.
   - `src/settings/tab.ts`

6. **Pass 6 — Plugin entry.** Move the `CustomSelectedWordCountPlugin` class.
   - `src/main.ts`
   - Top-level `main.ts` becomes the thin re-export.
   - Test imports retarget from `'../main'` to wherever still resolves cleanly. The re-export at top level should keep `'../main'` working for the existing tests; we'll only update test imports if the re-export approach introduces an issue.

After each pass: `npm test` + `npm run lint` + `npm run build`. A regression at any pass means the refactor diverged from current behavior; halt, diagnose, fix, then move on. The 134 characterization tests are the canonical pass/fail signal.

---

## The `applyExclusions` extraction

The heart of this phase. Today the three count functions duplicate the same override-wrapped exclusion pipeline:

```ts
let processedText = processTextWithOverrides(selectedText, (text) => {
    let result = text;
    if (settings?.excludeCode && settings?.excludeCodeBlocks && !isExclusionDisabled('exclude-code-blocks')) {
        result = processCodeBlocks(result, true, plugin);
    }
    if (settings?.excludeCode && settings?.excludeInlineCode && !isExclusionDisabled('exclude-inline-code')) {
        result = processInlineCode(result, true, plugin);
    }
    if (settings?.excludeComments && !isExclusionDisabled('exclude-comments')) {
        if (settings.excludeObsidianComments) {
            result = processObsidianComments(result, true, settings.excludeObsidianCommentContent, plugin);
        }
        if (settings.excludeHtmlComments) {
            result = processHtmlComments(result, true, settings.excludeHtmlCommentContent, plugin);
        }
    }
    if (settings?.excludeNonVisibleLinkPortions && !isExclusionDisabled('exclude-urls')) {
        result = processLinks(result, true, plugin);
    }
    if (settings?.excludeHeadings && !isExclusionDisabled('exclude-headings')) {
        result = processHeadings(result, true, settings.excludeHeadingMarkersOnly, settings.excludeEntireHeadingLines, settings.excludeHeadingSections, plugin);
    }
    if (settings?.excludeWordsAndPhrases && !isExclusionDisabled('exclude-words-phrases')) {
        result = processWordsAndPhrases(result, true, settings.excludedWords, settings.excludedPhrases, plugin);
    }
    return result;
}, plugin);
```

Extracted to one function:

```ts
// src/counting/pipeline.ts
export function applyExclusions(
    text: string,
    settings: WordCountPluginSettings | undefined,
    plugin: DebugLoggable | undefined,
    disabledExclusions: string[],
): string {
    const isDisabled = (id: string) => disabledExclusions.includes(id);
    return processTextWithOverrides(text, (segment) => {
        let result = segment;
        if (settings?.excludeCode && settings?.excludeCodeBlocks && !isDisabled('exclude-code-blocks')) {
            result = processCodeBlocks(result, true, plugin);
        }
        if (settings?.excludeCode && settings?.excludeInlineCode && !isDisabled('exclude-inline-code')) {
            result = processInlineCode(result, true, plugin);
        }
        if (settings?.excludeComments && !isDisabled('exclude-comments')) {
            if (settings.excludeObsidianComments) {
                result = processObsidianComments(result, true, settings.excludeObsidianCommentContent, plugin);
            }
            if (settings.excludeHtmlComments) {
                result = processHtmlComments(result, true, settings.excludeHtmlCommentContent, plugin);
            }
        }
        if (settings?.excludeNonVisibleLinkPortions && !isDisabled('exclude-urls')) {
            result = processLinks(result, true, plugin);
        }
        if (settings?.excludeHeadings && !isDisabled('exclude-headings')) {
            result = processHeadings(result, true, settings.excludeHeadingMarkersOnly, settings.excludeEntireHeadingLines, settings.excludeHeadingSections, plugin);
        }
        if (settings?.excludeWordsAndPhrases && !isDisabled('exclude-words-phrases')) {
            result = processWordsAndPhrases(result, true, settings.excludedWords, settings.excludedPhrases, plugin);
        }
        return result;
    }, plugin);
}
```

Each count function becomes:

```ts
export function countSelectedCharacters(text, mode, settings, plugin, disabled = []): number {
    if (!text) return 0;
    const processed = applyExclusions(text, settings, plugin, disabled);
    switch (mode) { ... }
}
```

And similarly for `countSelectedWords` (after which the word-specific path/extension logic runs) and `countSelectedSentences` (after which the redundant URL/path stripping safety-net runs — see Phase 4 finding #4; preserved as-is until a future phase decides).

---

## Constraints

- **No behavior changes.** Same exclusion logic, same processing order, same edge-case handling. The 134 Phase 4 tests including the three `LOCKED quirk:` tests must pass without modification.
- **No public API changes.** The build output (`main.js`) loads in Obsidian exactly as before. The plugin id, manifest, on-disk settings shape, frontmatter property name, and inline override marker syntax are unchanged.
- **Tests pass at every commit.** Run `npm test` before each commit; halt on first regression.
- **No circular imports.** The processing and counting modules must not import the Plugin class. They take a `DebugLoggable` parameter (a structural interface `{ settings: { enableDebugLogging: boolean } }`) which the Plugin class satisfies naturally.

---

## Acceptance

- `main.ts` is replaced by the `src/` directory with the layout above; top-level `main.ts` is a one-line re-export.
- `applyExclusions` is the sole orchestrator; the three count functions no longer duplicate exclusion logic.
- All 134 Phase 4 tests pass without modification.
- `npm run build`, `npm test`, `npm run lint` all pass.
- The esbuild bundle output is functionally identical (verified by manually exercising the plugin in an Obsidian vault once before merge — modal, settings tab, count operations, history).

---

## Findings during the refactor

### Pass results

| Pass | Modules added | main.ts size after | Notes |
|------|---------------|---------------------|-------|
| 0 (planning) | — | 3260 | docs commit only |
| 1 — types + utils | `src/types.ts`, `src/settings/types.ts`, `src/utils/debug.ts` | 3125 | `DebugLoggable` structural interface lets processing modules type their plugin parameter without importing the Plugin class |
| 2 — processing helpers | seven files under `src/processing/` | 1685 | 458-line shrinkage; all process functions now decoupled from the Plugin class |
| 3 — applyExclusions + count fns | `src/counting/` (5 files including `pipeline.ts`) | 854 | The behavioral consolidation: `applyExclusions` replaces ~150 lines of triplicated orchestration. Picked up the audit-plan §Phase 1 DEFAULT_WORD_REGEX dedup along the way (both branches in countSelectedWords now build from the constant). |
| 4 — modal | `src/ui/modal.ts` | 854 | WordCountModal and ConfirmModal moved together since the latter is used only by the former. Used `import type CustomSelectedWordCountPlugin` to keep the runtime dep DAG-clean. |
| 5 — settings tab | `src/settings/tab.ts`, `src/obsidian-internals.ts` | 854 | The tab is the largest single class. AppInternals/AppWithInternals moved to a small shared module since both the tab (log export) and the Plugin class (settings deep-link) need it. |
| 6 — Plugin class | `src/main.ts` | 20 | The Plugin class becomes a sibling module under `src/`. Top-level main.ts is a thin re-export keeping the test-suite import surface stable and Obsidian's esbuild entry point unchanged. |

### applyExclusions consolidation

The three count functions previously each carried a roughly-150-line copy of the same exclusion pipeline:

```
processTextWithOverrides(text, segment => {
    if (excludeCode && excludeCodeBlocks && !disabled('exclude-code-blocks')) ...
    if (excludeCode && excludeInlineCode && !disabled('exclude-inline-code')) ...
    if (excludeComments && !disabled('exclude-comments')) { ... }
    if (excludeNonVisibleLinkPortions && !disabled('exclude-urls')) ...
    if (excludeHeadings && !disabled('exclude-headings')) ...
    if (excludeWordsAndPhrases && !disabled('exclude-words-phrases')) ...
}, plugin)
```

Now one definition in `src/counting/pipeline.ts`. The three count functions reduce to:

```ts
const processed = applyExclusions(selectedText, settings, plugin, disabledExclusions);
// ...mode-specific post-processing (character mode switch / sentence detection / word path handling)...
```

Roughly 300 lines of duplication removed. Each count function retains its own mode-specific post-processing because the work after `applyExclusions` is intrinsically different per count type.

### Subtle differences that turned out to NOT be intentional

The audit plan's §Phase 1 brief flagged that `countSelectedSentences` does a "second URL-and-path stripping pass after the override-processing wrapper" and asked whether that was intentional or a vestige. Phase 4's testing concluded it was a safety net for raw URLs not wrapped in markdown link syntax. Phase 5 preserves the second pass as a sentence-specific post-`applyExclusions` step (see `src/counting/sentences.ts`), because removing it would change behavior (test would catch it) and the audit plan's no-behavior-change constraint forbids that.

### Subtle differences that ARE intentional and preserved

- The order of exclusion processing (code -> comments -> links -> headings -> words/phrases) was identical in all three pre-extraction copies, so `applyExclusions` could use that exact order without controversy.
- The greedy path-extension behavior in countSelectedWords (Phase 4 finding #1) is in the post-`applyExclusions` portion that stays in `src/counting/words.ts`, unchanged.
- The non-firing abbreviation guard and the over-aggressive file-extension guard in countSelectedSentences (Phase 4 findings #2 and #3) are similarly preserved in the post-`applyExclusions` portion in `src/counting/sentences.ts`.

### Dependency direction

Final import graph (top → bottom, no cycles, value imports only):

```
top-level main.ts          (entry / re-exports)
  └── src/main.ts          (Plugin class)
        ├── src/settings/tab.ts
        │     ├── src/settings/types.ts
        │     ├── src/utils/debug.ts
        │     └── src/obsidian-internals.ts
        ├── src/ui/modal.ts
        │     └── src/types.ts
        ├── src/counting/index.ts
        │     ├── src/counting/characters.ts ─┐
        │     ├── src/counting/sentences.ts  │ └─> src/counting/pipeline.ts
        │     └── src/counting/words.ts    ─┘       ├── src/processing/overrides.ts
        │                                            ├── src/processing/code.ts
        │                                            ├── src/processing/comments.ts
        │                                            ├── src/processing/links.ts
        │                                            ├── src/processing/headings.ts
        │                                            └── src/processing/words-and-phrases.ts
        ├── src/processing/frontmatter.ts
        ├── src/utils/debug.ts
        ├── src/settings/types.ts
        ├── src/types.ts
        └── src/obsidian-internals.ts
```

`src/ui/modal.ts` and `src/settings/tab.ts` both `import type CustomSelectedWordCountPlugin from '../main'`. Those are type-only imports (erased at compile time), so the back-edges don't create runtime cycles.

### Lint config interaction

The TypeScript-eslint `no-unused-vars` rule fired repeatedly on each extraction pass as imports became unused. Each pass ended with a trim of the now-unused imports from main.ts. The lint pass is now the canary that catches these.
