# Word Counting Principles

## Executive Summary

This document explains the conceptual foundations of how the Custom Selected Word Count plugin processes and counts words. Understanding these principles helps you configure the plugin effectively and interpret results accurately.

## Table of Contents

- [1. Word Recognition Concepts](#1-word-recognition-concepts)
- [2. Path Detection Principles](#2-path-detection-principles)  
- [3. Filtering and Exclusion Logic](#3-filtering-and-exclusion-logic)
- [4. Custom Pattern Concepts](#4-custom-pattern-concepts)
- [5. Performance Considerations](#5-performance-considerations)

## 1. Word Recognition Concepts

### 1.1. What Constitutes a Word

The plugin uses a sophisticated approach to identify words that goes beyond simple space-separated tokens. The default algorithm recognizes:

**Standard Words:**
- Alphabetic sequences: "hello", "world", "documentation"
- Case variations: "Word", "WORD", "wOrD"

**Compound Terms:**
- Contractions with straight quotes: "I'm", "don't", "we'll"
- Contractions with smart quotes: "I'm", "don't", "we'll"
- Hyphenated words: "state-of-the-art", "twenty-five"
- Underscore-connected terms: "file_name", "user_id"

**Numeric Content:**
- Whole numbers: "42", "2025"
- Decimal numbers: "3.14", "99.9"
- Mixed alphanumeric: "HTML5", "IPv4"

### 1.2. Character Processing

The plugin strips certain elements before counting:

**Removed Elements:**
- Punctuation marks: ., ! ? ; : 
- Quotation marks: " " ' ' " "
- Brackets and parentheses: ( ) [ ] { }
- Mathematical symbols: + - × ÷ = 
- Currency symbols: $ € £ ¥
- Emojis and special Unicode characters

**Preserved Elements:**
- Hyphens and underscores within words
- Periods in decimal numbers
- Apostrophes (straight and smart quotes) in contractions

### 1.3. Word Boundary Logic

The plugin identifies word boundaries using:

**Natural Boundaries:**
- Whitespace (spaces, tabs, line breaks)
- Punctuation marks
- Special characters

**Preserved Connections:**
- Hyphens within compound words
- Underscores in technical terms
- Apostrophes in contractions

## 2. Path Detection Principles

### 2.1. Path Recognition Strategies

The plugin uses multiple strategies to identify file paths and system references:

**Pattern-Based Detection:**
- Windows drive letters: `C:\`, `D:\`
- UNC network paths: `\\server\share`
- Unix absolute paths: `/usr/local/bin`
- Relative paths: `./folder`, `../parent`

**Context-Aware Detection:**
- File extensions: `.txt`, `.pdf`, `.docx`
- Environment variables: `%USERPROFILE%`, `$HOME`
- URL-style paths: `file:///path/to/file`

**Delimiter Recognition:**
- Forward slashes: `/path/to/file`
- Backslashes: `\path\to\file`
- Mixed separators: `/path\mixed/separators`

### 2.2. Path Exclusion Philosophy

The plugin's path exclusion follows these principles:

**Selective Exclusion:**
- Only removes complete path structures
- Preserves surrounding text context
- Avoids joining adjacent words incorrectly

**Configurable Scope:**
- Individual toggles for different path types
- User control over exclusion levels
- Fallback to inclusive counting when uncertain

**Edge Case Handling:**
- Paths with spaces: `"Program Files"`
- Special characters in paths: `[brackets]`, `(parentheses)`
- Network paths with authentication: `\\domain\user@server`

## 5. Comment Processing System

### 5.1. Comment Types

The plugin recognizes two comment formats:

**Obsidian Comments:**
- Format: `%% comment content %%`
- Multi-line support
- Nested comment handling

**HTML Comments:**
- Format: `<!-- comment content -->`
- Standard HTML/Markdown compatibility
- Multi-line support

### 5.2. Processing Options

**Exclude Markers Only:**
- Removes comment delimiters but keeps content
- `%% text %%` becomes ` text `
- `<!-- text -->` becomes ` text `

**Exclude Entire Comments:**
- Removes both markers and content
- Complete removal from text analysis
- Preserves surrounding text structure

## 6. Link Processing System

### 6.1. Link Types

The plugin handles multiple link formats:

**Internal Links:**
- Basic: `[[Note Name]]` → "Note Name"
- With alias: `[[Note Name|Display Text]]` → "Display Text"
- Only the visible text is counted

**External Links:**
- Markdown: `[link text](https://url.com)` → "link text"
- URLs and paths are excluded from count
- Only user-visible text remains

### 6.2. Processing Logic

- Regex-based pattern matching
- Preserves link text while removing technical parts
- Maintains sentence flow and readability

## 7. Heading Processing System

### 7.1. Heading Recognition

**ATX Headers:**
- Levels 1-6: `#` through `######`
- Space after markers required
- Full line processing

**Setext Headers:**
- Level 1: Text with `===` underline
- Level 2: Text with `---` underline
- Multi-line pattern matching

### 7.2. Exclusion Modes

**Markers Only:**
- Removes `#` symbols
- Preserves heading text
- Maintains document structure

**Entire Lines:**
- Removes complete heading lines
- Includes the text content
- Clean removal without gaps

**Specific Sections:**
- Right-click to exclude heading sections
- Removes heading and all content until next heading
- Respects heading hierarchy
- Section boundaries follow Obsidian's block concept

## 8. Words and Phrases Processing

### 8.1. Word Exclusion

**Matching Rules:**
- Case-insensitive exact matching
- Word boundary detection
- "Test" matches "test" but not "testing"

**Input Format:**
- Comma-separated list
- Trimmed for whitespace
- Validated for proper formatting

### 8.2. Phrase Exclusion

**Adding Phrases:**
- Right-click selected text
- Context menu integration
- Automatic duplicate detection

**Matching Logic:**
- Case-insensitive matching
- Regex-escaped for safety
- Preserves surrounding text

## 9. Code Exclusion Logic

### 9.1. Code Block Detection

**Fenced Code Blocks:**
- Triple backticks: ` ``` `
- Triple tildes: `~~~`
- Language identifiers supported
- Multi-line content handling

### 9.2. Inline Code Detection

**Single Backticks:**
- Format: `` `code` ``
- Escaped backticks handled
- No nesting support
- Preserves text flow

## 10. Per-Note Override System

### 10.1. Frontmatter Overrides

**Property Format:**
```yaml
cswc-disable: [exclude-urls, exclude-comments]
```

**Processing:**
- Uses Obsidian's MetadataCache API
- Runtime evaluation
- Graceful fallback for invalid values

### 10.2. Inline Comment Overrides

**Marker Formats:**
- HTML: `<!-- cswc-disable -->` ... `<!-- cswc-enable -->`
- Obsidian: `%% cswc-disable %%` ... `%% cswc-enable %%`

**Behavior:**
- Disables all exclusions between markers
- Unclosed sections extend to end of text
- Minimal performance impact

## 11. Filtering and Exclusion Logic

### 3.1. Processing Pipeline

The plugin processes text through a structured pipeline:

1. **Text Extraction:** Retrieve selected text from editor
2. **Path Filtering:** Remove identified paths (if enabled)
3. **Character Cleaning:** Strip punctuation and symbols
4. **Word Recognition:** Apply regex pattern matching
5. **Count Calculation:** Sum identified word tokens

### 3.2. Order of Operations

**Critical Sequence:**
1. Path detection must occur before word recognition
2. Character stripping happens after path removal
3. Word boundary detection follows character processing
4. Final count excludes filtered elements

**Preservation Logic:**
- Text context around removed paths is maintained
- Word boundaries are not artificially created
- Original text structure influences final parsing

### 3.3. Exclusion Categories

**File System References:**
- Complete file paths with extensions
- Directory structures
- Drive and volume references
- Network location identifiers

**Markup and Code:**
- HTML/XML tags (optional)
- Markdown syntax (optional)
- Code block delimiters (optional)
- URL and link references (optional)

## 4. Custom Pattern Concepts

### 12.1. Regular Expression Fundamentals

The plugin allows expert users to define custom word recognition patterns using regular expressions:

**Pattern Components:**
- Character classes: `[A-Za-z]`, `[0-9]`, `[\w]`
- Quantifiers: `+` (one or more), `*` (zero or more)
- Grouping: `()` for logical grouping
- Alternation: `|` for multiple options

**Default Pattern Breakdown:**
```regex
[A-Za-z0-9]+(?:[\u2018\u2019'-_][A-Za-z0-9]+)*
```
- `[A-Za-z0-9]+`: One or more alphanumeric characters
- `(?:[\u2018\u2019'-_][A-Za-z0-9]+)*`: Zero or more apostrophe/hyphen/underscore followed by alphanumeric sequences

### 12.2. Pattern Testing Concepts

**Interactive Validation:**
- Live preview of pattern matches
- Real-time count calculation
- Visual highlighting of matched segments
- Error detection and reporting

**Safety Mechanisms:**
- Pattern validation before application
- Fallback to default on errors
- Reset functionality for safe experimentation
- Performance monitoring for complex patterns

### 12.3. Common Pattern Examples

**Numbers Only:**
```regex
\d+(?:\.\d+)?
```
Matches whole numbers and decimals.

**Long Words Only:**
```regex
[A-Za-z]{6,}
```
Matches words with 6 or more letters.

**Technical Terms:**
```regex
[A-Z][A-Za-z0-9]*(?:[A-Z][A-Za-z0-9]*)*
```
Matches CamelCase and PascalCase terms.

## 5. Performance Considerations

### 5.1. Processing Efficiency

**Optimization Strategies:**
- Lazy evaluation of complex patterns
- Caching of frequently used regex patterns
- Debounced processing for live updates
- Minimal DOM manipulation

**Scalability Factors:**
- Text selection size impact
- Pattern complexity overhead
- Update frequency considerations
- Memory usage for history storage

### 5.2. Real-Time Processing

**Live Update Logic:**
- Debounce delays prevent excessive processing
- Selection change detection optimized
- Background processing where possible
- User interface responsiveness maintained

**Performance Monitoring:**
- Processing time measurement
- Pattern complexity assessment
- Resource usage tracking
- Automatic fallback mechanisms

---

*Last updated: July 6, 2025*

*This document provides the conceptual foundation for understanding the Custom Selected Word Count plugin's word processing algorithms and filtering logic.* 