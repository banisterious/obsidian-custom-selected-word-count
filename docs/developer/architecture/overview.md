# Architectural Overview

## Executive Summary

The Custom Selected Word Count plugin is an Obsidian plugin that provides comprehensive text analysis functionality for selected text. The plugin works across all view modes (Reading, Live Preview, and Edit) and offers customizable features including word counting, character counting, sentence counting, path exclusion, multiple UI integration options, and detailed history tracking.

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Core Architecture](#2-core-architecture)
- [3. Functional Requirements](#3-functional-requirements)
  - [3.1. Text Analysis Logic](#31-text-analysis-logic)
  - [3.2. User Interface Components](#32-user-interface-components)
  - [3.3. Data Management](#33-data-management)
- [4. Technical Requirements](#4-technical-requirements)
- [5. Performance Considerations](#5-performance-considerations)
- [6. Accessibility Standards](#6-accessibility-standards)

## 1. System Overview

### 1.1. Plugin Purpose

The Custom Selected Word Count plugin extends Obsidian's built-in text analysis capabilities by providing:

- **Advanced word recognition** that handles contractions, decimal numbers, hyphenated words, and underscore-separated terms
- **Flexible character counting** with configurable modes (all characters, no spaces, letters only)
- **Sophisticated sentence counting** with advanced detection for abbreviations, decimal numbers, and code blocks
- **Intelligent path exclusion** that filters out file paths and filenames from text analysis
- **Comment exclusion** that filters out Obsidian comments (%% %%) and HTML comments (<!-- -->) with granular content control
- **Link processing** that excludes non-visible portions of markdown links, counting only the visible text users see
- **Heading exclusion** with three flexible modes: markers only, entire lines, or complete sections following Obsidian's block system
- **Words and phrases exclusion** with comma-separated word lists and right-click phrase management for precise content filtering
- **Per-note exclusion overrides** using YAML frontmatter and inline comment markers to selectively disable exclusions
- **Multiple access methods** including modal dialog, status bar integration, and ribbon button
- **Persistent history tracking** of the last 50 analyses with clipboard integration for all metrics
- **Customizable regex patterns** for expert-level word detection customization

### 1.2. Target Users

- **Academic writers** who need precise text analysis excluding references and file paths
- **Technical writers** who work with code snippets and need character counts for formatting constraints
- **Content creators** who require detailed tracking of multiple text metrics across different sections
- **Researchers** who need flexible text analysis rules for various content types
- **Authors** who need sentence counts for readability analysis and writing structure optimization

### 1.3. Integration Points

The plugin integrates with Obsidian through:

- Obsidian's plugin API for core functionality
- Local storage API for settings and history persistence
- Command palette system for keyboard shortcuts
- Status bar API for live count display
- Ribbon interface for quick access

## 2. Core Architecture

### 2.1. Component Structure

```
OCSWC Plugin
├── Text Analysis Engine
│   ├── Text Selection Handler
│   ├── Word Recognition Algorithm
│   ├── Character Counting System
│   ├── Sentence Detection Algorithm
│   ├── Path Detection System
│   ├── Comment Processing System
│   ├── Link Processing System
│   ├── Heading Processing System
│   └── Words/Phrases Processing System
├── User Interface Layer
│   ├── Modal Dialog Component (Card-based Design)
│   ├── Status Bar Integration
│   └── Ribbon Button Component
├── Data Management
│   ├── Settings Manager
│   ├── History Tracker (Multi-metric)
│   └── Clipboard Integration
└── Configuration System
    ├── Path Exclusion Rules
    ├── Comment Exclusion Rules
    ├── Link Processing Rules
    ├── Heading Exclusion Rules
    ├── Words/Phrases Exclusion Rules
    ├── Per-Note Override System
    ├── Character Count Configuration
    ├── Sentence Count Settings
    ├── UI Customization Options
    └── Advanced Regex Patterns
```

### 2.2. Data Flow

1. **Text Selection** → User selects text in any Obsidian view mode
2. **Processing** → Text Analysis Engine processes the selected text
3. **Comment Filtering** → Comment Processing System applies comment exclusion rules
4. **Link Processing** → Link Processing System applies link exclusion rules
5. **Heading Processing** → Heading Processing System applies heading exclusion rules
6. **Words/Phrases Filtering** → Words/Phrases Processing System applies custom exclusion rules
7. **Path Filtering** → Path Detection System applies path exclusion rules
8. **Analysis** → Multiple algorithms analyze the text:
   - Word Recognition Algorithm identifies countable words
   - Character Counting System processes characters based on mode
   - Sentence Detection Algorithm identifies sentence boundaries
9. **Display** → Results shown through selected UI components with card-based layout
10. **Storage** → Multi-metric analysis added to history and settings updated

## 3. Functional Requirements

### 3.1. Text Analysis Logic

#### 3.1.1. Word Recognition Algorithm

The plugin uses a sophisticated regex pattern for word recognition:

**Default Pattern:** `[A-Za-z0-9]+(?:[\u2018\u2019'-_][A-Za-z0-9]+)*`

**Recognized Elements:**
- Standard alphabetic words
- Contractions with straight apostrophes (e.g., "I'm", "don't")
- Contractions with smart quotes (e.g., "I'm", "don't")
- Decimal numbers (e.g., "3.5")
- Hyphenated words (e.g., "Sun-Kissed")
- Underscore-separated words (e.g., "foo_bar")

**Excluded Elements:**
- All punctuation and symbols
- Straight and curly quotation marks (single and double)
- Emojis and non-alphanumeric symbols
- Image file paths and names
- Full file paths with common extensions

#### 3.1.2. Path Detection System

The plugin includes advanced path detection capabilities:

**Detection Types:**
- **Windows Paths:** Drive letters (C:\, D:\)
- **UNC Paths:** Network paths (\\server\share)
- **Unix Paths:** Absolute paths (/usr/local)
- **Environment Variables:** Windows (%USERPROFILE%) and Unix ($HOME) style
- **Relative Paths:** Starting with ./ or ../
- **URL-style Paths:** file:/// protocol

**Configuration Options:**
- Individual toggles for each path type
- Custom pattern support for user-defined formats
- Examples provided in settings UI for clarity

#### 3.1.3. Comment Processing System

The plugin includes sophisticated comment exclusion capabilities:

**Comment Types Supported:**
- **Obsidian Comments:** Native markdown comments (%% comment %%)
- **HTML Comments:** Standard HTML comments (<!-- comment -->)

**Processing Options:**
- **Exclude Comment Markers Only:** Remove comment delimiters but count content inside
- **Exclude Entire Comments:** Remove both comment markers and all content within
- **Granular Control:** Separate settings for each comment type and content exclusion

**Implementation Details:**
- **Regex Patterns:** Uses `%%[\s\S]*?%%` for Obsidian comments and `<!--[\s\S]*?-->` for HTML comments
- **Processing Order:** Comments are processed before all other text analysis operations
- **Multi-line Support:** Handles both inline and block comments seamlessly
- **Non-greedy Matching:** Ensures proper handling of nested or adjacent comments

**Configuration Options:**
- Master toggle for comment exclusion feature
- Individual toggles for Obsidian and HTML comment types
- Separate content exclusion controls for each comment type
- All settings default to OFF for backward compatibility

#### 3.1.4. Frontmatter Exclusion System

The plugin automatically excludes YAML frontmatter from word counts across all view modes for consistent behavior:

**Automatic Detection:**
- **YAML Format:** Standard frontmatter delimited by `---` or `...`
- **Position-Aware:** Only removes frontmatter at the very beginning of selected text
- **Delimiter Support:** Handles both `---` and `...` closing delimiters

**Cross-Mode Consistency:**
- **Reading View:** Frontmatter automatically excluded (uses rendered content only)
- **Source Mode:** Frontmatter stripped from raw editor selections
- **Live Preview Mode:** Frontmatter stripped from raw editor selections
- **Canvas Mode:** Frontmatter excluded from iframe selections

**Implementation Details:**
- **Function:** `stripFrontmatter()` processes editor-based selections
- **Processing Order:** Applied before all other text analysis operations
- **Preservation Logic:** Maintains original text structure after frontmatter removal
- **Performance:** Minimal overhead with efficient line-by-line parsing

**Configuration Options:**
- **No User Settings:** Frontmatter exclusion is always enabled for consistency
- **Automatic Operation:** No configuration required - works seamlessly across all modes
- **Debug Logging:** Logs frontmatter detection and removal for troubleshooting

#### 3.1.5. Link Processing System

The plugin includes intelligent link processing capabilities to improve word count accuracy:

**Link Types Supported:**
- **Internal Links with Aliases:** `[[Note Name|Alias]]` → counts only "Alias"
- **Internal Links without Aliases:** `[[Note Name]]` → counts "Note Name"  
- **External Links:** `[link text](url)` → counts only "link text"

**Processing Logic:**
- **Visible Text Focus:** Only counts the text that users actually see when reading
- **Non-visible Exclusion:** Removes URLs, file paths, and technical markup from counting
- **Seamless Integration:** Processes links after comments but before other text analysis

**Implementation Details:**
- **Regex Patterns:** Uses specific patterns for each link type with proper capture groups
- **Processing Order:** Links are processed after comment filtering but before path detection
- **Multi-analysis Support:** Applied consistently across word, character, and sentence counting
- **Debug Logging:** Comprehensive logging for troubleshooting link processing

**Configuration Options:**
- **Master Toggle:** Single setting to enable/disable link processing
- **Default State:** Feature disabled by default for backward compatibility
- **User-Friendly Description:** Clear explanation of what gets counted vs. excluded

#### 3.1.5. Heading Processing System

The plugin includes comprehensive heading exclusion capabilities with three distinct modes:

**Heading Types Supported:**
- **ATX Headers:** Standard markdown headers (`# ## ### #### ##### ######`)
- **Setext Headers:** Underlined headers (`Heading\n======` and `Heading\n------`)

**Processing Modes:**
- **Exclude Heading Markers Only:** Removes # symbols but counts heading text
- **Exclude Entire Heading Lines:** Removes complete heading lines including text
- **Exclude Specific Heading Sections:** Selectively excludes heading sections via right-click context menu

**Section Processing Logic:**
- **Selective Exclusion:** Users right-click on specific headings to exclude their sections
- **Hierarchy Awareness:** Respects heading levels for proper section boundaries
- **Block-Based Processing:** Follows Obsidian's concept of heading sections as blocks
- **Intelligent Boundaries:** Properly handles nested subsections within parent sections
- **Line-by-Line Analysis:** Processes selected text while maintaining markdown structure
- **Context Menu Integration:** Conditional heading exclusion option appears when cursor is on heading line

**Implementation Details:**
- **Regex Patterns:** Uses `^#{1,6}\s+.*$` for ATX headers and `^.+\n[=-]+\s*$` for Setext headers
- **Processing Order:** Headers are processed after links but before words/phrases filtering
- **Multi-analysis Support:** Applied consistently across word, character, and sentence counting
- **Debug Logging:** Comprehensive logging for troubleshooting heading processing

**Configuration Options:**
- **Master Toggle:** Single setting to enable/disable heading processing
- **Mutual Exclusivity:** Heading markers and lines are mutually exclusive; sections work independently
- **Heading Management UI:** List display with edit/delete buttons showing heading levels (H1, H2, etc.)
- **Inline Editing:** Direct text editing with keyboard shortcuts (Enter to save, Escape to cancel)
- **Default State:** All heading exclusion features disabled by default
- **User-Friendly Descriptions:** Clear explanations of each mode's behavior

#### 3.1.6. Words and Phrases Processing System

The plugin includes flexible custom word and phrase exclusion capabilities:

**Word Exclusion Features:**
- **Comma-Separated Input:** Simple text field for word list management
- **Case-Insensitive Matching:** "Test" excludes "test" but not "testing"
- **Exact Word Matching:** Uses word boundaries to prevent partial matches
- **Validation:** Ensures proper comma formatting with user feedback

**Phrase Exclusion Features:**
- **Right-Click Integration:** Context menu appears on text selection
- **Conditional Menu Display:** Only shows when phrase exclusion feature is enabled
- **Duplicate Detection:** Prevents adding the same phrase multiple times
- **Case-Insensitive Comparison:** Handles phrase duplicates regardless of case

**Phrase Management UI:**
- **List Display:** Shows all excluded phrases in organized list format
- **Individual Controls:** Edit and delete buttons for each phrase
- **Inline Editing:** Direct text editing with keyboard shortcuts (Enter to save, Escape to cancel)
- **Empty State Guidance:** Helpful instructions for new users

**Implementation Details:**
- **Regex Escaping:** Safely handles special characters in phrases using proper escaping
- **Processing Order:** Words/phrases are processed after headings but before path detection
- **Multi-analysis Support:** Applied consistently across word, character, and sentence counting
- **Context Menu Integration:** Uses Obsidian's editor-menu event system
- **Settings Integration:** Auto-opens plugin settings after adding phrases

**Configuration Options:**
- **Master Toggle:** Single setting to enable/disable words/phrases exclusion
- **Words Field:** Text input with validation and placeholder guidance
- **Phrases Management:** Dynamic list with real-time updates
- **Default State:** Feature disabled by default for backward compatibility
- **Auto-Navigation:** Seamless transition to settings when adding phrases

#### 3.1.7. Advanced Regex Capabilities

For expert users, the plugin provides:

- **Custom Regex Patterns:** Replace the default word recognition algorithm
- **Interactive Testing:** Live preview of pattern matches with sample text
- **Safety Features:** Reset to default options and clear test functionality
- **Pattern Validation:** Real-time feedback on regex syntax and performance

#### 3.1.8. Character Counting System

The plugin provides flexible character counting with multiple modes:

**Counting Modes:**
- **All Characters:** Counts every character including spaces, punctuation, and symbols
- **No Spaces:** Counts all characters except whitespace characters
- **Letters Only:** Counts only alphabetic characters (A-Z, a-z)

**Implementation Features:**
- Mode selection through settings interface
- Unicode-aware character processing
- Efficient counting algorithms for large text selections
- Real-time mode switching without requiring text reselection

**Configuration Options:**
- Toggle character count visibility in modal
- Persistent mode selection across sessions
- Character count display in history tracking
- Copy to clipboard functionality for character counts

#### 3.1.9. Sentence Detection Algorithm

The plugin includes sophisticated sentence boundary detection:

**Detection Capabilities:**
- Standard sentence endings (periods, exclamation marks, question marks)
- Multiple punctuation sequences (e.g., "?!", "...")
- Quotation marks following punctuation
- Advanced abbreviation handling

**Exclusion Logic:**
- Common abbreviations (Mr., Dr., Prof., etc.)
- Decimal numbers (e.g., "3.14", "2.5")
- File extensions (e.g., ".txt", ".md")
- Code blocks and inline code snippets
- Markdown headers and special formatting

**Processing Steps:**
1. Remove code blocks and inline code
2. Filter out URLs and file paths
3. Apply sentence boundary detection regex
4. Validate against abbreviation patterns
5. Exclude false positives (decimals, file extensions)
6. Count valid sentence boundaries

**Accuracy Features:**
- Context-aware abbreviation detection
- Handling of complex punctuation patterns
- Markdown-aware processing
- Minimum content validation for sentence qualification

#### 3.1.10. Per-Note Exclusion Override System

The plugin provides powerful per-note override capabilities allowing users to selectively disable exclusion rules:

**YAML Frontmatter Overrides:**
- **Property Name:** `cswc-disable` in note frontmatter
- **Array Format:** `cswc-disable: [exclude-urls, exclude-comments]`
- **Single Value:** `cswc-disable: exclude-windows-paths`
- **Disable All:** `cswc-disable: all` to disable all exclusions

**Supported Override Values:**
- `exclude-windows-paths` - Disable Windows path exclusion
- `exclude-unix-paths` - Disable Unix path exclusion
- `exclude-unc-paths` - Disable UNC path exclusion
- `exclude-environment-paths` - Disable environment variable path exclusion
- `exclude-urls` - Disable URL/link exclusion
- `exclude-code-blocks` - Disable code block exclusion
- `exclude-inline-code` - Disable inline code exclusion
- `exclude-comments` - Disable comment exclusion
- `exclude-headings` - Disable heading exclusion
- `exclude-specific-headings` - Disable specific heading section exclusion
- `exclude-words-phrases` - Disable custom words/phrases exclusion
- `all` - Disable all exclusions at once

**Inline Comment Overrides:**
- **HTML Style:** `<!-- cswc-disable -->` ... `<!-- cswc-enable -->`
- **Obsidian Style:** `%% cswc-disable %%` ... `%% cswc-enable %%`
- **Section Control:** Text between markers has all exclusions disabled
- **Nested Behavior:** Unclosed sections extend to end of selection

**Implementation Details:**
- **Frontmatter Parsing:** Uses Obsidian's MetadataCache API
- **Runtime Processing:** Checks active file's frontmatter during each count
- **Inline Processing:** `processTextWithOverrides()` function wraps exclusion logic
- **Performance:** Minimal overhead with efficient caching
- **Graceful Fallback:** Invalid values are ignored

**User Interface Integration:**
- **Settings Display:** Property values shown inline with each exclusion toggle
- **Help Section:** Collapsible guide with examples in settings
- **Visual Indicators:** Clear labeling of override property values
- **Copy Support:** Easy copying of property values from settings

### 3.2. User Interface Components

#### 3.2.1. Modal Dialog

**Modern Card-Based Design:**
- Professional monochrome styling with Obsidian theme integration
- Responsive grid layout for multiple metrics
- Card-based presentation for each text analysis metric
- Clean typography with proper visual hierarchy

**Count Cards:**
- **Word Count Card:** Advanced word detection with copy functionality
- **Character Count Card:** Configurable mode display with subtitle explanation
- **Sentence Count Card:** Sophisticated boundary detection with copy functionality
- Individual copy buttons for each metric
- Visual indicators for counting methodology

**Enhanced History Section:**
- Multi-metric history tracking (words, characters, sentences)
- Individual copy buttons for each metric in history entries
- Timestamp display options
- Efficient scrollable list with visual enhancements
- Clear history functionality with confirmation

**Improved User Experience:**
- Header with analysis icon and clear title
- Contextual subtitles explaining counting methods
- Unified action buttons with consistent styling
- Enhanced visual feedback for user actions

**Accessibility Features:**
- Full keyboard navigation (tab, arrow keys, enter/space)
- Screen reader compatibility with descriptive labels
- Focus management and ARIA labels
- High contrast design elements
- Consistent button styling and interaction patterns

**Icon System:**
- **Native Obsidian Integration:** Uses Obsidian's built-in `setIcon()` function for all icons
- **Theme-Aware Colors:** Icons automatically adapt to light and dark themes using Obsidian CSS variables:
  - `--text-normal` for primary icons (header, count card labels)
  - `--text-muted` for secondary icons (history title, clear button)
  - `--text-faint` for subtle icons (history copy buttons)
- **Consistent Sizing:** Standardized icon dimensions across components (14px-16px)
- **Perfect Alignment:** Precise vertical positioning with `transform: translateY()` for pixel-perfect text baseline alignment
- **Icon Library:** All icons sourced from Obsidian's included Lucide icon set:
  - Header: `chart-no-axes-column`
  - Count cards: `type`, `hash`, `list-ordered`  
  - Actions: `copy`, `check` (with visual feedback), `clock`, `trash-2`
- **Visual Feedback:** Copy buttons show temporary check mark with accent color highlighting
- **No Fallbacks Required:** Eliminates emoji fallbacks since Obsidian provides comprehensive icon support

#### 3.2.2. Status Bar Integration

**Display Options:**
- Customizable label text (default: "Selected: ")
- Live updates as selection changes
- Click to open modal dialog

**Update Modes:**
- **Live Updates:** Real-time count updates (with debouncing)
- **Manual Updates:** Updates only when command is triggered

**View Type Support:**
The status bar integration supports multiple Obsidian view types through a tiered detection system:

1. **MarkdownView Support (Primary)**
   - Source mode: Uses `editor.getSelection()` from the active editor
   - Preview mode: Falls back to `window.getSelection()` for rendered content
   - Live Preview mode: Uses `editor.getSelection()` for hybrid editing

2. **Canvas View Support (Full)**
   - Detects Canvas views correctly (`viewType: 'canvas'`)
   - Canvas content is rendered in iframes with `same-origin` sandbox permissions
   - Uses `iframe.contentWindow.getSelection()` to access text selection within Canvas iframes
   - Supports text selection from Canvas cards, sticky notes, and embedded content
   - Falls back to standard `window.getSelection()` for non-iframe Canvas elements

3. **Universal Fallback (Tertiary)**
   - Works with any view type that supports standard DOM text selection
   - Relies on browser's native `window.getSelection()` API
   - Ensures plugin functionality across unknown or future view types

**Implementation Details:**
- View type logging helps identify which selection method is being used
- Graceful degradation ensures no errors when switching between view types
- Consistent text processing applies the same exclusion rules regardless of source view

**Performance Features:**
- 300ms debounce delay to prevent performance impact
- Efficient text selection handling
- Memory management and cleanup

#### 3.2.3. Ribbon Button

**Visual Design:**
- Uses "text-select" icon from Lucide icon library
- Standard Obsidian ribbon button styling
- Clear tooltip: "Count words in selected text"

**Behavior:**
- Click triggers word count modal
- Visibility controlled by plugin settings
- Requires Obsidian restart for visibility changes

### 3.3. Data Management

#### 3.3.1. Settings Storage

**Settings Categories:**
- UI element visibility toggles
- Character count configuration and mode selection
- Sentence count visibility settings
- Path exclusion preferences
- Comment exclusion configuration and type-specific settings
- Link processing configuration
- Heading exclusion configuration with mode selection
- Words and phrases exclusion with word lists and phrase management
- Custom labels and text
- Advanced regex patterns
- History display options

**Storage Method:**
- Obsidian's local storage API
- JSON format for structured data
- Import/export functionality for backup

#### 3.3.2. History Management

**History Features:**
- Stores last 50 text analyses with multiple metrics
- Comprehensive tracking: words, characters, and sentences
- Persistent across Obsidian restarts
- Optional timestamp display
- Global scope across all notes

**Data Structure:**
- Array of analysis objects with comprehensive metadata
- Multi-metric storage: `{ count, characterCount, sentenceCount, date }`
- Efficient storage and retrieval for all metrics
- Automatic cleanup of old entries
- Backward compatibility with existing history data

#### 3.3.3. Privacy and Security

**Data Protection:**
- Selected text is never stored or transmitted
- All processing happens locally
- No network communications
- Settings stored in Obsidian's secure local storage

## 4. Technical Requirements

### 4.1. Compatibility

- **Obsidian Version:** Latest stable version support
- **Platform Support:** Cross-platform (Windows, macOS, Linux)
- **View Mode Compatibility:** Source, Live Preview, and Reading modes

### 4.2. Versioning

- **Semantic Versioning:** Following semver specification (e.g., 1.0.0)
- **Version Display:** Plugin version shown in settings
- **Update Management:** Compatible with Obsidian's plugin update system

### 4.3. Error Handling

**Graceful Degradation:**
- No text selected: Display "0 words" or helpful message
- Unsupported view modes: Clear user feedback
- Regex errors: Fallback to default pattern with notification
- Storage errors: Graceful handling with user notification

## 5. Performance Considerations

### 5.1. Optimization Strategies

**Text Processing:**
- Efficient regex operations
- Minimal DOM manipulation
- Optimized selection detection

**UI Updates:**
- Debounced status bar updates (300ms)
- Lazy loading of history entries
- Efficient modal rendering

**Memory Management:**
- Proper event listener cleanup
- Resource-conscious update cycles
- Clear status bar when plugin disabled

### 5.2. Performance Monitoring

- No noticeable impact on Obsidian responsiveness
- Efficient handling of large text selections
- Optimized path detection algorithms

## 6. Accessibility Standards

### 6.1. Keyboard Navigation

**Modal Dialog:**
- Tab navigation between elements
- Arrow key navigation in history list
- Enter/Space key activation for buttons
- Escape key to close modal

**Status Bar:**
- Keyboard access to click functionality
- Clear focus indicators
- Screen reader friendly labels

### 6.2. Screen Reader Support

**Content Structure:**
- Proper heading hierarchy
- Descriptive button labels
- ARIA labels for complex interactions
- Alt text for visual elements

**Navigation Aids:**
- Clear focus management
- Logical tab order
- Descriptive tooltips
- Status announcements for count updates

### 6.3. Visual Accessibility

**Interface Design:**
- High contrast elements
- Clear visual hierarchy
- Appropriate font sizes
- Consistent styling with Obsidian

**User Feedback:**
- Clear status indicators
- Visual confirmation of actions
- Error message display
- Loading state indicators

---

*Last updated: July 21, 2025*

*This document serves as the primary architectural reference for the Custom Selected Word Count plugin development and maintenance.* 
