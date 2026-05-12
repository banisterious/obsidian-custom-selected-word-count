# Changelog

## [Unreleased]

## [1.6.5] - 2026-05-12
### Internal
- **Merged duplicate CSS selectors**
  - Three pairs of duplicated rules in `styles.css` collapsed into single declarations: `.word-count-modal .modal-header` (lines 104 + 174), `.word-count-modal .modal-title` (lines 109 + 191), and `.word-count-settings-group` inside `.word-count-settings` (lines 667 + 852). Visually identical result; the cascade was already picking the same final values, and consolidating the rules makes the intent clearer.
- **Dropped two redundant `!important` declarations**
  - `.word-count-hidden { display: none; }` (was `!important`). The class is toggled via `toggleClass` on settings sub-section containers; nothing sets a competing inline `display`, so the class-based rule wins on cascade alone.
  - `body.word-count-hide-core .status-bar-item.plugin-word-count { display: none; }` (was `!important`). The body-class + two-class selector has plenty of specificity to win against Obsidian's core word-count item, which carries no competing rule.

## [1.6.4] - 2026-05-12
### Fixed
- **CSS syntax error flagged by the community-site rescan**
  - `styles.css` had a stray `}` inside the nested `.word-count-settings { ... }` block that prematurely closed the `.word-count-container-indented` rule. Everything below it (lines 687-882 of the pre-fix file) ended up accidentally at top level, including `&:has(...)` selectors that need a parent. The closing `}` for `.word-count-settings` then had no matching open, which the catalog CSS lint reported as an Error. Removing the stray brace lets the block nest naturally and balances the brace count.

### Changed
- **Timer functions now use `window.*` instead of `activeWindow.*`**
  - The community-site rescan flagged `activeWindow.setTimeout` / `setInterval` / `clearTimeout` / `clearInterval` (introduced in 1.6.3 per `eslint-plugin-obsidianmd@0.2.9`'s `prefer-active-window-timers` rule) and asked for explicit `window.*` instead. Eight sites updated: debounce timer, canvas polling, Reading-view Select-All, two copy-button feedback flashes, and the onunload debounce-clear. `window.*` is more predictable for timer ids because `activeWindow` is a focus-following getter; a timer obtained from `activeWindow.setTimeout()` could end up tied to a different window than its corresponding `clearTimeout()` if focus shifted in between.

### Internal
- **Cleared `no-explicit-any` warnings**
  - Nine `any` declarations remained after the 1.6.3 settings-callback typing pass. The two logging helpers (`debugLog`, `log`) now take `...args: unknown[]` (forwarded to `console.log` which accepts `unknown[]`). `getHeadingAtCursor(editor, cursor)` now uses `Editor` and `EditorPosition` from `obsidian`. The five `(this.app as any)` casts reaching internal Obsidian App members (`setting.open()`, `setting.openTabById()`, `appVersion`) now go through a locally-declared `AppInternals` interface and `AppWithInternals = App & AppInternals` intersection type, keeping the cast but removing the `any`.

## [1.6.3] - 2026-05-12
### Fixed
- **Plugin failing the Obsidian Community automated review**
  - Replaced the dynamically-injected `<style>` element used to hide Obsidian's core word count with a body-class toggle and a static rule in `styles.css`
  - The plugin no longer creates runtime style elements, which is the pattern flagged by the community-site audit
- **"Hide core word count" actually hides the core word count now**
  - The setting has not worked as named for a long time. Three issues compounded: our own status-bar item was attaching the `plugin-word-count` class (colliding with Obsidian's core word-count item, since Obsidian auto-adds `plugin-custom-selected-word-count` from the manifest id already); the CSS selector excluded `.plugin-word-count` instead of targeting it, so the setting silently hid backlinks, properties, editor-status, etc., and left the core word count visible; and a companion CSS rule was commented out as "temporarily disabled" while the code still added the `hide-core-count` class
  - Net effect post-fix: enabling "Hide core word count" hides Obsidian's built-in word count and nothing else
- **Customized exclusion list no longer reset on every load**
  - `loadSettings` unconditionally reassigned `this.settings.exclusionList` to the default and saved, destroying user customization on every plugin load. Removed the unconditional reset; `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` already handles default population for missing fields
  - Note: customization made before this version was silently overwritten on disk and cannot be recovered; this fix prevents future loss only
- **Character and sentence counts now persist in history entries**
  - The persisted-settings shape for history was typed `{ count, date }` while the runtime shape carried optional `characterCount` and `sentenceCount`. The runtime `this.history` array and the persisted `this.settings.history` array were never synced, so new entries (and their character/sentence counts) never reached disk; saveSettings always wrote whatever was last loaded back. Fix syncs the two at the top of saveSettings (Date -> ISO string), and includes the extra counts in both the persisted shape and the load mapping. Existing history entries from prior versions were never actually persisted across sessions, so there is nothing to migrate; new entries now persist all three counts
- **Live status bar updates from selections in popped-out leaves**
  - Live-update listeners were attached to whatever document was focused when `setupStatusBar()` ran — almost always the main window — so selecting text in a popout never triggered an update on the (main window's) status bar item. The plugin now registers selection / keyboard listeners per window: once on the main document at load, and again on every popout's document via the workspace `window-open` event. Selection reads use `activeWindow.getSelection()` so the count reflects the focused window's selection. Known limitation: the plugin's status-bar item itself still lives in the main window only — Obsidian's `addStatusBarItem` adds to the main status bar — so selections inside a popout update the main window's `Selected: N` item, but the popout's own status bar does not carry the plugin's item
- **Buy Me a Coffee link in the README**
  - Restored the BMC button's `href` and inner image `src` after Markdown link syntax had been pasted into the HTML attributes, leaving the link non-functional in rendered Markdown

### Changed
- **Mobile catalog visibility**
  - Flipped `manifest.isDesktopOnly` from `false` to `true` so the manifest matches the README's existing "Mobile Compatibility" note that mobile support is untested. Existing mobile installs continue to run; new mobile installations from the in-app community catalog are not offered until mobile testing lands in a future release
- **Settings, button, and command text use Obsidian's sentence-case convention**
  - The "Count Selected Words" command, the modal "Selection Analysis" title, several setting names, "Export Logs" / "Reset to Default" / "Reset Test" buttons, and every Setting description now follow Obsidian's UI sentence-case guideline. Functionally identical; cosmetic text update only
- **Popout-window compatibility throughout**
  - Replaced every bare `document.*` / `setTimeout` / `setInterval` / `clearTimeout` / `clearInterval` reference with Obsidian's `activeDocument` and `activeWindow.*` equivalents. Event listeners, the debounce timer, Canvas iframe polling, the Reading-view select-all timeout, and the copy-button flash animations all now resolve to the currently-focused window rather than the main Obsidian window, so they work correctly when the plugin is exercised from a popped-out leaf
- **Replaced browser-native `confirm()` with an in-plugin modal**
  - The "Clear all history entries?" confirmation in the count modal now opens a small `ConfirmModal` extending `obsidian.Modal` (Cancel / Clear buttons) instead of the browser's native `confirm()` dialog. Same UX intent; implementation now uses a documented Obsidian API

### Documentation
- **Three-file release rule**
  - Added `docs/developer/release.md` documenting the exact three files (`main.js`, `manifest.json`, `styles.css`) attached to every GitHub release, and the local verification steps before tagging
- **Removed dead documentation references**
  - Cleared references to a not-yet-written `docs/developer/architecture/overview.md` from `README.md` and several files under `docs/`. The architecture overview lands in Phase 6 of the audit plan, at which point the references can be reintroduced

### Internal
- **Flat-config lint migration**
  - Replaced `.eslintrc` with `eslint.config.mjs`. Upgraded `eslint` to `^9`, `typescript-eslint` to `^8`, and TypeScript to `~4.9` to satisfy peer requirements. Added `eslint-plugin-obsidianmd@^0.2.9` so the project lints against the same Obsidian-specific rules used by the community-site automated review. All `obsidianmd/*` findings are now clear
- **Obsidian DOM helpers throughout**
  - Replaced every `document.createElement(...)` call with Obsidian's `createEl(...)` / parent `createDiv(...)` / `createSpan(...)` helpers. Affects the inline heading and phrase editors in the settings tab, the regex test-area's wordcount / matches / warning containers, and the log-export download link
- **Settings tab callbacks are properly typed**
  - The ~30 `addToggle((toggle: any) => ...)` and friends in the settings tab are now `(toggle: ToggleComponent)`, `(text: TextComponent)`, `(dropdown: DropdownComponent)`, `(button: ButtonComponent)` from `obsidian`. The advanced-regex Reset button keeps a direct reference to its `TextComponent` instead of looking it up via `regexSetting.components.find(c => c.constructor.name.includes('Text'))` and casting to `any`
- **Inline DOM styles moved to CSS classes**
  - Copy-button confirmation flash now toggles a `word-count-copy-confirmed` class with the accent-color rule in `styles.css` instead of writing `element.style.background` / `element.style.color`. The regex test-area warning visibility toggles the existing `word-count-hidden` utility class instead of `element.style.display`
- **Platform API for OS detection**
  - The log-export "system" object now reads `Platform.isMacOS` / `isWin` / `isLinux` / `isMobileApp` / `isDesktopApp` instead of substring-matching `navigator.userAgent`. The exported diagnostic payload is more accurate as a side benefit
- **Deprecated API call replaced**
  - The four `workspace.activeLeaf` reads in the Canvas / non-MarkdownView fallback paths now use `getMostRecentLeaf()`
- **Settings heading uses Obsidian's helper**
  - The lone `createEl('h4')` in the override-info `<details>` panel now uses `new Setting(...).setHeading()`
- **Promise hygiene**
  - Async callbacks passed to `addEventListener`, the `ConfirmModal`'s onConfirm, and similar fire-and-forget paths are now wrapped in sync arrows that explicitly `void` the returned promise. The `Plugin.onload` signature accepts `() => Promise<void> | void`; the targeted `@typescript-eslint/no-misused-promises` disable comment documents that
- **Dead code removed**
  - Removed an unused exclusion-info helper, an empty-body `setupRibbonButton` whose `ribbonButton` field was never assigned, an empty-body `updateClasses` no-op, the `saveHistory` delegate (call sites now use `saveSettings` directly), three unused imports from `obsidian` (`Editor`, `TFile`, `parseYaml`), and ten unused local declarations across the codebase. Two `(this as any).renderHeadingsList = renderHeadingsList` / `renderPhrasesList = renderPhrasesList` escape hatches were dead and have been removed
- **Trivial lint sweeps**
  - Eight unnecessary regex escapes inside character classes, a missing braces wrap on a `case` block with a lexical declaration, and a caught error binding `catch (e)` -> `catch` where the binding was unused
- **Stale comments and version literal**
  - Removed the leading `// BUILD: 2025-05-07` and `// Remember to rename these classes and interfaces!` comments from the top of `main.ts`
  - Replaced the hardcoded `version: '1.1.0'` literal in the log-export payload with `this.plugin.manifest.version` so exported diagnostic bundles report the actually-running plugin version
- **`builtin-modules` -> `node:module`**
  - `esbuild.config.mjs` reads from `node:module`'s `builtinModules` export instead of the third-party `builtin-modules` package. The dependency is removed from `package.json`
- **Removed orphan release artifact**
  - Deleted `custom-selected-word-count-v1.6.2.zip` from the working tree. The file matched the existing `.gitignore` `*.zip` rule but its presence at the repo root was misleading about what ships in releases

## [1.6.2] - 2025-08-08
### Fixed
- **Modal Opening After Select All in Reading Mode**
  - Fixed issue where clicking status bar after Select All showed "No text selected" 
  - Added storage of selected text when handling CTRL-A/Cmd-A in Reading Mode
  - Modal now correctly opens with word count details after Select All
  - Ensures consistent behavior across all selection methods

## [1.6.1] - 2025-07-21
### Fixed
- **Select All Support in Reading View (Cross-Platform)**
  - Fixed timing issue where Select All word count would briefly flash and then disappear
  - Added support for both Windows/Linux (Ctrl+A) and macOS (Cmd+A) key combinations
  - Moved flag setting to immediate detection to prevent selection change handler interference
  - Updated event detection to recognize both `ctrlKey` and `metaKey` modifiers
  - Added comprehensive debug logging for Select All flag state tracking
  - Ensures consistent Select All word counting across all operating systems

## [1.6.0] - 2025-07-21
### Fixed
- **Smart Quote Contraction Support**
  - Fixed issue where contractions with smart quotes (e.g., "don't", "I'm") were incorrectly counted as multiple words
  - Updated word recognition regex to include Unicode smart quotes (U+2018, U+2019) alongside straight apostrophes
  - Modified text processing to preserve apostrophes during quote stripping phase
  - Updated all documentation to reflect enhanced contraction handling

### Enhanced
- **Canvas Status Bar Integration**
  - Completed full Canvas view support for status bar word counting
  - Implemented polling mechanism to detect text selection within Canvas iframes
  - Added clickable status bar functionality to open modal from Canvas views
  - Enhanced view detection with tiered fallback system (MarkdownView → Canvas → Universal)
- **Modal Design System Overhaul**
  - Completed card-based modal redesign with professional styling
  - Implemented native Obsidian icon system using `setIcon()` function
  - Added theme-aware icon coloring that adapts automatically to light/dark modes
  - Enhanced copy button functionality with visual feedback animations
  - Implemented dynamic font sizing for large count numbers with thousands separators
  - Perfected icon alignment with pixel-precise positioning adjustments
  - Removed "Done" button to reduce clutter and improve UX flow
- **Cross-Mode Consistency**
  - Implemented automatic YAML frontmatter exclusion across all view modes
  - Added `stripFrontmatter()` function for consistent processing in Source and Live Preview modes
  - Ensured uniform behavior between Reading view (naturally excludes frontmatter) and editor modes
  - Enhanced status bar and modal counting consistency regardless of view mode selection

### Technical
- **Icon System Modernization**
  - Migrated from emoji fallbacks to Obsidian's native Lucide icon integration
  - Implemented consistent icon sizing standards (14px-16px) across all components
  - Added proper CSS variables for theme compatibility (`--text-normal`, `--text-muted`, `--text-faint`)
- **Custom Regex Settings Improvement**
  - Fixed settings initialization to prevent pre-population of custom regex field
  - Corrected reset functionality to clear field instead of populating with default pattern
  - Enhanced field validation to only use custom regex when actually specified by user

## [1.5.0] - 2025-07-06
### Added
- **Per-Note Exclusion Override System**
  - Added YAML frontmatter property `cswc-disable` to override global exclusion settings per note
  - Supports array format: `cswc-disable: [exclude-urls, exclude-comments]`
  - Supports single value format: `cswc-disable: exclude-windows-paths`
  - Special value `all` disables all exclusions: `cswc-disable: all`
  - All exclusion types can be overridden:
    - Path exclusions: `exclude-windows-paths`, `exclude-unix-paths`, `exclude-unc-paths`, `exclude-environment-paths`
    - Content exclusions: `exclude-urls`, `exclude-code-blocks`, `exclude-inline-code`, `exclude-comments`
    - Structure exclusions: `exclude-headings`, `exclude-specific-headings`, `exclude-words-phrases`
- **Inline Comment-Based Overrides**
  - Added inline markers to disable exclusions for specific text sections
  - HTML style: `<!-- cswc-disable -->` ... `<!-- cswc-enable -->`
  - Obsidian style: `%% cswc-disable %%` ... `%% cswc-enable %%`
  - Text between markers has all exclusions disabled
  - Unclosed sections extend to end of selected text
- **Code Exclusion Settings**
  - Added previously missing code exclusion toggles to Settings UI
  - Master toggle "Exclude code" with sub-options:
    - "Exclude code blocks" for triple-backtick blocks
    - "Exclude inline code" for single-backtick code
  - Property values: `exclude-code-blocks` and `exclude-inline-code`

### Enhanced
- **Settings UI Improvements**
  - Added property value indicators next to each exclusion toggle (e.g., "• Property: exclude-urls")
  - Added collapsible "Using per-note exclusion overrides" help section with examples
  - Reorganized settings with better grouping and visual hierarchy
  - Improved section headings and descriptions for clarity
- **CSS Class Namespacing**
  - Added `word-count-` prefix to all Lucide icon classes to prevent conflicts
  - Ensures proper scoping for plugin-specific styles

### Technical
- **Override Processing Implementation**
  - Added `getDisabledExclusionsFromFrontmatter()` function for frontmatter parsing
  - Added `processTextWithOverrides()` function for inline comment handling
  - Updated all counting functions to respect override settings
  - Minimal performance impact with efficient caching

### Documentation
- **Comprehensive Documentation Update**
  - Updated architecture overview with per-note override system
  - Overhauled all user guides to include new features
  - Added detailed examples and use cases
  - Updated settings reference with all new options

## [1.4.0] - 2025-07-04
### Added
- **Heading Exclusion System**
  - Added comprehensive heading exclusion functionality with three modes:
    - Exclude heading markers only (removes # symbols, keeps text)
    - Exclude entire heading lines (removes complete headings)
    - Exclude entire heading sections (removes heading + content until next heading)
  - Section exclusion follows Obsidian's block system for proper markdown structure handling
  - **ENHANCED**: Replaced "blind" heading sections exclusion with selective exclusion system
    - Right-click on specific heading lines to exclude their sections
    - Heading management UI with edit/delete buttons showing heading levels (H1, H2, etc.)
    - Inline editing with keyboard shortcuts (Enter to save, Escape to cancel)
  - Mutual exclusivity logic ensures only one heading mode is active at a time
  - Master toggle setting "Exclude headings from text analysis" (**disabled by default**)
  - Integrated into all counting modes (words, characters, sentences)
  - Support for both ATX (`# Heading`) and Setext (`Heading\n===`) heading formats
- **Words and Phrases Exclusion System**
  - Added flexible word exclusion via comma-separated list input
    - Case-insensitive exact word matching (e.g., "Test" excludes "test" but not "testing")
    - Validation for proper comma formatting
    - Examples: "the, and, or, but" excludes common stop words
  - Added phrase exclusion with right-click context menu integration
    - Select text → Right-click → "Exclude phrase from word count"
    - Context menu only appears when phrase exclusion feature is enabled
    - Automatic duplicate detection prevents adding same phrase twice
    - Auto-opens plugin settings after adding phrase for immediate management
  - Added phrase management UI with individual controls
    - List display showing all excluded phrases
    - Edit button for each phrase with inline editing and keyboard shortcuts
    - Delete button for individual phrase removal
    - Empty state guidance for new users
  - Master toggle setting "Exclude words and phrases from text analysis" (**disabled by default**)
  - Integrated into all counting modes (words, characters, sentences)
  - Advanced regex escaping for safe phrase matching

### Technical
- **Enhanced Text Processing Pipeline**
  - Updated processing order: Comments → Links → Headings → Words/Phrases → Word counting
  - All new exclusions work seamlessly with existing exclusions
  - Optimized regex compilation and matching for performance
  - Enhanced debug logging for troubleshooting new features
- **Settings Architecture Improvements**
  - Added conditional UI visibility for better user experience
  - Implemented mutual exclusivity logic for heading options
  - Enhanced settings validation and error handling
  - Consistent styling patterns following existing design system
- **Context Menu Integration**
  - Proper Obsidian editor-menu event registration
  - Conditional menu item display based on feature settings
  - Comprehensive error handling for phrase addition workflow

## [1.3.0] - 2025-06-30
### Added
- **Link Processing System**
  - Added intelligent processing for markdown links to improve word count accuracy
  - Support for internal links with aliases: `[[Note Name|Alias]]` → counts only "Alias"
  - Support for internal links without aliases: `[[Note Name]]` → counts "Note Name"
  - Support for external links: `[link text](url)` → counts only "link text"
  - Excludes non-visible portions like URLs, file paths, and technical markup
  - Master toggle setting "Exclude non-visible portions of links" (**disabled by default**)
  - Integrated into all counting modes (words, characters, sentences)
  - Processing occurs after comment filtering but before path detection
- **Comment Exclusion System**
  - Added support for excluding Obsidian comments (%% comment %%) from text analysis
  - Added support for excluding HTML comments (<!-- comment -->) from text analysis
  - Granular control options for each comment type:
    - Option to exclude comment markers only (keeping content for counting)
    - Option to exclude entire comments including content
  - Individual toggles for Obsidian and HTML comment types
  - Master toggle for comment exclusion feature
  - All comment exclusion settings default to OFF for backward compatibility
  - Comment processing integrated into all counting modes (words, characters, sentences)

## [1.2.0] - 2025-06-29
### Added
- **Character Counting System**
  - Added character counting functionality with three configurable modes:
    - All characters (including spaces and punctuation)
    - All characters excluding spaces
    - Letters only (alphabetic characters)
  - Character count visibility toggle in settings
  - Character count display in modal and history
  - Individual copy functionality for character counts
- **Sentence Counting System**
  - Added sophisticated sentence boundary detection
  - Advanced handling of abbreviations (Mr., Dr., Prof., etc.)
  - Smart exclusion of decimal numbers and file extensions
  - Markdown-aware processing for code blocks and headers
  - Sentence count visibility toggle in settings
  - Sentence count display in modal and history
- **Enhanced Modal Design**
  - Complete redesign with modern card-based layout
  - Professional monochrome styling integrated with Obsidian themes
  - Responsive grid system for multiple metrics
  - Individual count cards for words, characters, and sentences
  - Enhanced visual hierarchy with proper typography
  - Unicode icon replacements for better compatibility
- **Multi-Metric History**
  - Expanded history tracking to include words, characters, and sentences
  - Individual copy buttons for each metric in history entries
  - Backward compatibility with existing history data
  - Enhanced history display with improved visual design

### Changed
- **Architecture Improvements**
  - Renamed `countSelectedWords` to `countSelectedText` for better semantic clarity
  - Added `CountResult` interface for structured multi-metric results
  - Enhanced `WordCountHistoryEntry` to include character and sentence counts
  - Updated modal class to handle multiple metrics efficiently
- **User Interface Enhancements**
  - Improved modal accessibility with better keyboard navigation
  - Enhanced visual feedback for user actions
  - Consistent button styling and interaction patterns
  - Better responsive design for various screen sizes
- **Settings Organization**
  - Added dedicated sections for character and sentence counting
  - Improved settings structure with logical grouping
  - Enhanced setting descriptions and help text

### Technical
- **Performance Optimizations**
  - Efficient multi-metric processing in single pass
  - Optimized character counting algorithms
  - Improved sentence detection with minimal regex operations
- **Code Quality**
  - Added comprehensive TypeScript interfaces
  - Enhanced error handling for new features
  - Improved code documentation and comments
  - Better separation of concerns in text analysis functions

## [1.0.1] - 2025-05-05
### Changed
- **Code Quality Improvements**
  - Renamed generic class names to more descriptive ones for better debugging
  - Moved all inline styles to dedicated CSS file for better maintainability
  - Improved CSS organization with proper class naming and documentation
  - Added responsive design improvements for mobile devices
  - Enhanced theme compatibility using CSS variables
- **Developer Experience**
  - Implemented proper debug logging system with toggle in settings
  - Removed direct console.log calls to reduce console noise
  - Added comprehensive CSS comments for easier styling customization

## [1.0.0] - 2025-05-07
### Initial Release
- Initial release of **Custom Selected Word Count** for Obsidian.
- Provides advanced word counting features for selected text.
- Features include:
  - Path exclusion for flexible word counting.
  - Multiple UI integration options.
  - History tracking of word counts.
  - Advanced Regex capabilities for custom word matching.
- Added Advanced Regex UI with a test area for experimenting with patterns.
- Live word count display for immediate feedback.
- Improved and expanded documentation.

### Code Quality
- **Code Structure**
  - Renamed generic class names to more descriptive ones for better debugging
  - Implemented proper debug logging system with toggle in settings
  - Removed direct console.log calls to reduce console noise
- **Styling Improvements**
  - Moved all inline styles to dedicated CSS file for better maintainability
  - Improved CSS organization with proper class naming and documentation
  - Added responsive design improvements for mobile devices
  - Enhanced theme compatibility using CSS variables
  - Added comprehensive CSS comments for easier styling customization

### Submission
- Corrected plugin entry placement in `community-plugins.json`
- Created proper release with required files (`main.js` and `manifest.json`)

---

*The changelog is maintained with each release. For the latest updates, please check the [releases page](https://github.com/banisterious/obsidian-custom-selected-word-count/releases).*