# Audit Phase 4 — Test infrastructure

**Status:** Active
**Branch:** `audit/phase-4-tests`
**Release target:** 1.6.7 (CI pipeline now runs a Test step between Lint and Build; the release verifies CI is green with vitest installed)

This phase lands vitest plus a characterization test suite over the three count entry points. The tests are the load-bearing safety net for Phase 5's single-file split: any regression Phase 5 introduces will surface in CI before merge.

The audit plan's Phase 4 brief calls for "no production-code changes." We deviate on one point: the count functions and processing helpers in `main.ts` are top-level `function` declarations (not exported), and the tests need to import them. We add `export` keywords to the ~15 functions involved. The change is a no-op at runtime and at the bundler level; Phase 5 was going to do the same thing when it pulled these into `src/`. Recorded here so the deviation is explicit.

---

## Scope

### Tooling

- `vitest` as devDependency (covers test runner, transformer via esbuild, assertion library).
- `vitest.config.ts` configured for `node` environment with the `obsidian` module aliased to a test mock.
- `npm test` and `npm run test:watch` scripts in `package.json`.
- A `Test` step in `.github/workflows/release.yml` between `Lint (eslint)` and `Build`. CI then refuses to ship a release if `npm test` fails.

### `obsidian` module mock

`tests/mocks/obsidian.ts` exports the minimal surface the counting code touches:

- `App` — empty class. Tests pass a hand-built `App`-shaped object when calling `getDisabledExclusionsFromFrontmatter`.
- `MarkdownView`, `Modal`, `Plugin`, `PluginSettingTab`, `Setting`, `Notice`, `setIcon`, `Platform` — no-op stubs so `import` resolves; the count entry points don't touch them.

The count functions are deliberately written to operate on plain strings plus a `settings` object plus an optional `disabledExclusions` array. None of them need the Obsidian runtime to be tested.

### Test files

- `tests/counting/words.test.ts` — `countSelectedWords` characterization. Each exclusion mode independently (code blocks, inline code, Obsidian comments, HTML comments, links, headings, words/phrases), a handful of combination cases, smart-quote contractions, decimal numbers, file-extension exclusion, path exclusion.
- `tests/counting/characters.test.ts` — `countSelectedCharacters` in all three modes (`all`, `no-spaces`, `letters-only`) and against the same exclusion matrix.
- `tests/counting/sentences.test.ts` — `countSelectedSentences` including abbreviations (`Mr.`, `Dr.`, `etc.`), decimal numbers, file extensions, URLs, multiple punctuation, ellipsis.
- `tests/counting/text.test.ts` — `countSelectedText` aggregator returning `{ words, characters, sentences }`.
- `tests/exclusions/overrides.test.ts` — the four override mechanisms: frontmatter array, frontmatter string, frontmatter `all`, inline `<!-- cswc-disable -->` and `%% cswc-disable %%` markers.
- `tests/exclusions/processors.test.ts` — direct tests for the individual processing functions: `stripFrontmatter`, `processCodeBlocks`, `processInlineCode`, `processObsidianComments`, `processHtmlComments`, `processLinks`, `processHeadings`, `processSelectiveHeadingSections`, `processWordsAndPhrases`, `processTextWithOverrides`.

### Test count target

50-100 tests, per the audit plan's brief. Enough to lock current behavior; not so many that maintenance becomes its own burden.

---

## What we deliberately do NOT test

- The modal, the settings tab, the status bar, the Canvas polling loop, the editor selection handlers. Those need Obsidian's runtime. UI verification stays manual.
- The history persistence shape. That's plugin-state plumbing; testing it would require instantiating the plugin against a mocked Obsidian, which the brief explicitly avoids.
- The log-export function. Diagnostic-only output; not behavior we need to freeze.

If a test reveals a bug while writing characterization tests, **log it for a later phase**. The point of Phase 4 is to capture current behavior, including any quirks. Phase 5 (or beyond) fixes the bugs; Phase 4 just nails behavior to the wall.

---

## Acceptance

- `npm test` runs the full suite locally with zero failures against the current `main.ts`.
- The CI release workflow runs `npm test` between Lint and Build; tagging `1.6.7-rc1` produces a green draft release.
- The Obsidian module mock surface is documented inline in `tests/mocks/obsidian.ts`.
- Any quirks discovered during test-writing are captured at the bottom of this doc under "Findings."

---

## Findings during test-writing

Three behavioral quirks surfaced while writing characterization tests. All are locked-in by the test suite as current behavior; the tests use the prefix `LOCKED quirk:` so they're easy to find when a later phase decides to fix any of them.

### 1. Path-exclusion is greedy

`countSelectedWords` builds a buffer when a segment matches a path-start regex (Windows drive, Unix, UNC, env var). It re-checks `looksLikePath(buffer)` after appending each subsequent segment and only stops extending the buffer when the check fails. But the path regexes are `^pattern` — they only require the buffer to *start* with the pattern. Appending `" word"` to a path doesn't break the prefix match, so the buffer keeps growing and swallows every word to end of input.

Example: `"Open C:\Users\foo and resume"` with `excludePaths: true, excludeWindowsPaths: true` returns 1 (only "Open" survives), not 3 ("Open", "and", "resume" as a naive reader would expect).

**Fix candidate (later phase):** terminate path-consumption at the first segment that isn't itself a path continuation (e.g., contains no `/`, `\`, or path-character pattern), or anchor the regex with `$` so the buffer must match end-to-end as a path.

Locked by tests in `tests/counting/words.test.ts > countSelectedWords — path exclusion`.

### 2. Sentence-detection abbreviation guard never fires

`countSelectedSentences` splits text on `/[.!?]+(?:\s*["'])?(?:\s+|$)/g`, then for each part checks against `/\b(?:Mr|Mrs|Dr|...|etc|...)\./i` to skip parts ending with a known abbreviation. The guard requires a literal period (`\.`) in the part, but the split regex has already consumed that period. The guard never matches on real input, so `"Mr."`, `"Dr."`, `"etc."` all produce false sentence splits today.

Example: `"Mr. Smith and Dr. Jones met today."` returns 3, not 1.

**Fix candidate (later phase):** test against the part *plus* the matched delimiter (would require switching from `.split` to a `.matchAll`-based approach), or rewrite the guard to detect parts that end with `\b(?:Mr|...)$` (matching the abbreviation without the period, since the split already removed it).

Locked by tests in `tests/counting/sentences.test.ts > countSelectedSentences — false-positive guards`.

### 3. File-extension guard discards the enclosing sentence

The same loop has a file-extension guard: `if (/\w+\.\w+$/.test(part.trim()) && part.trim().length < 20) continue;`. The intent is to skip the period inside `file.txt` so it doesn't double-count. But because the test fires on a part that *ends* with `\w+\.\w+`, the entire sentence containing the filename gets thrown out, not just the period.

Example: `"Read the file.txt. It contains data."` returns 1 (only "It contains data." survives), not 2. The "Read the file.txt." sentence is silently dropped.

**Fix candidate (later phase):** restrict the guard to parts that *are* a filename (e.g., exactly `\w+\.\w+`), not parts that merely end with one. Or pre-replace filenames with a placeholder before splitting, like URLs and Windows paths already are.

Locked by tests in `tests/counting/sentences.test.ts > countSelectedSentences — false-positive guards`.

### 4. Redundant URL/path stripping in `countSelectedSentences`

The audit plan's Phase 1 brief asks: "verify whether [the second URL-and-path stripping pass after the override-processing wrapper] is intentional or a vestige." Confirmed: it's redundant in the common path. `countSelectedSentences` calls `processLinks` inside `processTextWithOverrides` (which already strips URLs that have markdown link syntax), then after the wrapper runs an independent regex pass `/https?:\/\/[^\s]+/g` and `/[a-zA-Z]:[\\/][^\s]+/g`. The second pass catches bare URLs and paths that aren't wrapped in `[text](url)` markdown syntax, so it's not strictly redundant — it's a safety net for raw URLs and paths in prose. Worth keeping until Phase 5's `applyExclusions` extraction decides on a uniform approach.

Not locked by a dedicated test, but tested implicitly through the "does not split on URLs" and "does not split on Windows file paths" cases.

---

## Deviations from audit plan

- **`export` keywords added to ~15 functions in `main.ts`.** Required for test imports; no runtime impact. Phase 5's module split was going to do this anyway.
- **Release target raised from "none" to 1.6.7.** The audit plan said no release for Phase 4 since it's developer-only. We're shipping because the CI workflow itself changes (the new `Test` step), and a tagged release proves the CI is green with the new step in place. The user-visible CHANGELOG line is "Internal: added vitest test infrastructure"; no user-facing behavior changes.
