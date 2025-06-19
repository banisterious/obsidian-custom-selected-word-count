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
- Contractions: "I'm", "don't", "we'll"
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
- Apostrophes in contractions

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

## 3. Filtering and Exclusion Logic

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

### 4.1. Regular Expression Fundamentals

The plugin allows expert users to define custom word recognition patterns using regular expressions:

**Pattern Components:**
- Character classes: `[A-Za-z]`, `[0-9]`, `[\w]`
- Quantifiers: `+` (one or more), `*` (zero or more)
- Grouping: `()` for logical grouping
- Alternation: `|` for multiple options

**Default Pattern Breakdown:**
```regex
[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*
```
- `[A-Za-z0-9]+`: One or more alphanumeric characters
- `(?:[-_][A-Za-z0-9]+)*`: Zero or more hyphen/underscore followed by alphanumeric sequences

### 4.2. Pattern Testing Concepts

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

### 4.3. Common Pattern Examples

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

*Last updated: June 7, 2025*

*This document provides the conceptual foundation for understanding the Custom Selected Word Count plugin's word processing algorithms and filtering logic.* 