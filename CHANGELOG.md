# Changelog

## [Unreleased]

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