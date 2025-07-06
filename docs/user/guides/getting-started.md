# Getting Started Guide

## Executive Summary

This guide helps you install, configure, and use the Custom Selected Word Count plugin for Obsidian. You'll learn how to analyze selected text with word counting, character counting, and sentence counting, plus advanced features like path exclusion, history tracking, and customizable UI integration.

## Table of Contents

- [1. Installation](#1-installation)
- [2. Quick Start](#2-quick-start)
- [3. Basic Features](#3-basic-features)
- [4. Configuration](#4-configuration)
  - [4.1. UI Elements Configuration](#41-ui-elements-configuration)
  - [4.2. Character Counting Configuration](#42-character-counting-configuration)
  - [4.3. Sentence Counting Configuration](#43-sentence-counting-configuration)
  - [4.4. Exclusion Settings](#44-exclusion-settings)
  - [4.5. History Settings](#45-history-settings)
- [5. Advanced Usage](#5-advanced-usage)
  - [5.1. Custom Regex Patterns](#51-custom-regex-patterns)
  - [5.2. Per-Note Exclusion Overrides](#52-per-note-exclusion-overrides)
  - [5.3. Use Cases](#53-use-cases)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Installation

### 1.1. Community Plugins Marketplace (Recommended)

1. Open Obsidian Settings
2. Navigate to **Community Plugins** and disable Safe Mode
3. Click **Browse** and search for "Custom Selected Word Count"
4. Click **Install**
5. Enable the plugin in your list of installed plugins

### 1.2. BRAT Plugin (Alternative)

1. Install the [BRAT community plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Use BRAT to install from the GitHub repository
3. Enable the plugin in Community Plugins settings

### 1.3. Manual Installation

1. Download the latest release from the [GitHub repository](https://github.com/banisterious/obsidian-custom-selected-word-count)
2. Extract the files to your `.obsidian/plugins/custom-selected-word-count` folder
3. Enable the plugin in Obsidian settings

## 2. Quick Start

### 2.1. Basic Text Analysis

1. **Select text** in any view mode (Source, Live Preview, or Reading)
2. **Access the text analysis** using one of these methods:
   - Press your assigned hotkey (if configured)
   - Click the ribbon button (if enabled)
   - Use the command palette: "Count words in selected text"
   - Click the status bar count (if enabled)

![Basic usage showing text selection and count options](../assets/images/basic-usage-selection.png)
*Select text and choose how to view the analysis*

### 2.2. Understanding the Results

The analysis modal displays:
- **Word count** with advanced detection
- **Character count** (if enabled) with configurable modes
- **Sentence count** (if enabled) with smart detection
- Individual copy buttons for each metric
- History of your last 50 analyses
- Clear history option

![Word count modal showing the count result](../assets/images/basic-usage-modal.png)
*The analysis modal displays multiple metrics and provides clipboard and history options*

## 3. Basic Features

### 3.1. Comprehensive Text Analysis

#### 3.1.1. Word Counting
The plugin counts words intelligently, including:
- Standard words and contractions ("I'm", "don't")
- Hyphenated words ("Sun-Kissed")
- Numbers and decimals ("3.5")
- Underscore-separated terms ("foo_bar")
- Applies path exclusion and custom regex settings

#### 3.1.2. Character Counting
Three configurable counting modes:
- **All characters:** Including spaces, punctuation, and symbols
- **No spaces:** Excluding whitespace characters
- **Letters only:** Only alphabetic characters (A-Z, a-z)
- Analyzes raw selected text without path exclusions

#### 3.1.3. Sentence Counting
Smart sentence detection with:
- Standard sentence endings (periods, exclamation marks, question marks)
- Advanced abbreviation handling (Mr., Dr., Prof., etc.)
- Exclusion of decimal numbers and file extensions
- Markdown-aware processing for code blocks
- Analyzes raw selected text without path exclusions

### 3.2. Modern UI Design

The plugin features a card-based modal with:
- Professional monochrome styling
- Individual count cards for each metric
- Clean typography and visual hierarchy
- Responsive design for different screen sizes
- Enhanced history display with multi-metric tracking

### 3.3. UI Integration Options

#### 3.3.1. Ribbon Button

Enable the ribbon button in settings for quick access to text analysis.

![Ribbon button location and function](../assets/images/ui-ribbon-button.png)
*The ribbon button in the left sidebar opens the analysis modal window*

#### 3.3.2. Status Bar Integration

The status bar shows your current selection's word count and updates live as you change your selection.

![Status bar word count location and interaction](../assets/images/ui-status-bar.png)
*The status bar displays the current selection's word count and opens the modal when clicked*

#### 3.3.3. Command Palette Access

Access text analysis through Obsidian's command palette for keyboard-driven workflows.

![Command palette access option](../assets/images/ui-command-palette.png)
*Access the analysis feature through Obsidian's command palette*

### 3.4. Multi-Metric History Tracking

The plugin keeps track of your text analyses with:
- History of last 50 analyses (words, characters, sentences)
- Individual copy buttons for each metric in each entry
- Optional timestamps
- Persistent storage across Obsidian restarts
- Backward compatibility with existing word count history

![Word count history modal with copy options](../assets/images/history-modal.png)
*The history modal shows your current and previous analyses with copy options for each metric*

## 4. Configuration

Access plugin settings via **Settings → Community Plugins → Custom Selected Word Count**.

![Overview of plugin settings showing main configuration sections](../assets/images/settings-overview.png)
*Plugin settings overview showing all available configuration sections*

### 4.1. UI Elements Configuration

![UI Elements settings section showing access and display options](../assets/images/settings-ui-elements.png)
*Configure how you want to access and view the word count feature*

**Available Options:**
- **Show Ribbon Button:** Toggle ribbon button visibility
- **Show Count in Status Bar:** Enable status bar integration
- **Enable Live Updates:** Automatically update count on selection change
- **Hide Core Word Count:** Hide Obsidian's built-in word count
- **Status Bar Label:** Customize the label text (default: "Selected: ")

### 4.2. Character Counting Configuration

**Character Count Options:**
- **Show Character Count:** Toggle character count visibility in the modal
- **Character Counting Mode:** Choose how characters are counted:
  - All characters (including spaces)
  - All characters (excluding spaces)  
  - Letters only

### 4.3. Sentence Counting Configuration

**Sentence Count Options:**
- **Show Sentence Count:** Toggle sentence count visibility in the modal

### 4.4. Exclusion Settings

#### 4.4.1. Path Exclusion

Configure which types of paths and files to exclude from word counts:

> **Note:** Path exclusions apply only to word counting. Character and sentence counting analyze the raw selected text.

- **Exclude Paths from Word Count:** Master toggle for path exclusion
- **Exclude Windows Paths:** Filter out Windows-style paths (C:\)
- **Exclude UNC Paths:** Filter out network paths (\\server)
- **Exclude Unix Paths:** Filter out Unix-style paths (/usr/local)
- **Exclude Environment Paths:** Filter out environment variables

#### 4.4.2. Link Processing

- **Exclude non-visible portions of links:** When enabled, only counts the visible text in links:
  - For `[[Note Name|Alias]]` links, only counts "Alias"
  - For `[link text](url)` links, only counts "link text"
  - Property: `exclude-urls`

#### 4.4.3. Code Exclusion

- **Exclude code:** Master toggle for code exclusion
  - **Exclude code blocks:** Removes triple-backtick code blocks from counts
  - **Exclude inline code:** Removes single-backtick inline code from counts
  - Properties: `exclude-code-blocks`, `exclude-inline-code`

#### 4.4.4. Comment Exclusion

- **Exclude comments:** Master toggle for comment exclusion
  - **Exclude Obsidian comments:** Removes `%% comment %%` style comments
  - **Exclude Obsidian comment content:** Choose to exclude content or just markers
  - **Exclude HTML comments:** Removes `<!-- comment -->` style comments
  - **Exclude HTML comment content:** Choose to exclude content or just markers
  - Property: `exclude-comments`

#### 4.4.5. Heading Exclusion

- **Exclude headings:** Master toggle with three modes:
  - **Exclude heading markers only:** Removes # symbols but counts heading text
  - **Exclude entire heading lines:** Removes complete heading lines
  - **Exclude specific heading sections:** Right-click headings to exclude their sections
  - Properties: `exclude-headings`, `exclude-specific-headings`

#### 4.4.6. Words and Phrases Exclusion

- **Exclude words and phrases:** Master toggle for custom filtering
  - **Excluded words:** Comma-separated list (e.g., "the, and, or")
  - **Excluded phrases:** Right-click selected text to add phrases
  - Phrase management UI with edit/delete options
  - Property: `exclude-words-phrases`

### 4.5. History Settings

- **Show Date/Time in History:** Include timestamps in the history list
- **Enable Debug Logging:** For troubleshooting purposes

## 5. Advanced Usage

### 5.1. Custom Regex Patterns

For expert users, the plugin offers custom word detection patterns:

![Advanced regex settings showing pattern customization and testing interface](../assets/images/regex-test-area.png)
*Test and refine custom word detection patterns with live feedback*

**Configuration Options:**
- **Enable Advanced Regex:** Allow custom regex for word detection
- **Custom Regex Pattern:** Enter your own pattern
- **Reset to Default Regex:** Revert to default pattern
- **Test Your Regex:** Try your pattern on sample text
- **Reset Test:** Clear the test input box

> **Warning:** This is an advanced feature. Incorrect regex patterns may cause inaccurate counts or performance issues.

### 5.2. Per-Note Exclusion Overrides

Override global exclusion settings for individual notes:

#### 5.2.1. YAML Frontmatter Override

Add a `cswc-disable` property to your note's frontmatter:

```yaml
---
cswc-disable: [exclude-urls, exclude-comments]
---
```

Disable all exclusions:
```yaml
---
cswc-disable: all
---
```

**Supported values:**
- Path exclusions: `exclude-windows-paths`, `exclude-unix-paths`, `exclude-unc-paths`, `exclude-environment-paths`
- Content exclusions: `exclude-urls`, `exclude-code-blocks`, `exclude-inline-code`, `exclude-comments`
- Structure exclusions: `exclude-headings`, `exclude-specific-headings`, `exclude-words-phrases`

#### 5.2.2. Inline Comment Override

Use special comments to disable exclusions for specific sections:

```markdown
This text follows global exclusion rules.

<!-- cswc-disable -->
This section ignores all exclusions.
<!-- cswc-enable -->

Back to normal exclusion rules.
```

Also works with Obsidian comments: `%% cswc-disable %%` and `%% cswc-enable %%`

### 5.3. Use Cases

#### 5.2.1. Academic Writing
- Exclude references and file paths from counts
- Track word count progress across writing sessions
- Copy specific counts for submission requirements

#### 5.2.2. Technical Documentation
- Exclude code snippets and file names
- Count only narrative text content
- Use custom regex for specific terminology

#### 5.2.3. Content Creation
- Track word count history for different sections
- Exclude markup and formatting from counts
- Monitor writing progress over time

## 6. Troubleshooting

### 6.1. Common Issues

**Q: The plugin isn't counting words as expected**
A: Check your exclusion and regex settings. Try resetting to defaults in the plugin settings.

**Q: The status bar count isn't updating**
A: Ensure "Enable Live Updates" is turned on in the UI Elements settings.

**Q: The ribbon button doesn't appear**
A: Enable "Show Ribbon Button" in settings and restart Obsidian.

**Q: Word count seems inaccurate**
A: Verify your path exclusion settings and custom regex patterns if enabled.

### 6.2. Performance Issues

**Q: Obsidian becomes slow when selecting text**
A: Disable live updates in the status bar settings to reduce processing overhead.

**Q: Custom regex causes errors**
A: Use the "Reset to Default Regex" button and test your patterns in the test area before applying.

### 6.3. Getting Help

For additional support:
- Review the [architectural overview](../../developer/architecture/overview.md) for technical details
- Check the [GitHub issues page](https://github.com/banisterious/obsidian-custom-selected-word-count/issues) for known issues
- Report bugs or request features through GitHub issues

---

*Last updated: June 29, 2025*

*For technical documentation and development information, see the [developer documentation](../../developer/) section.* 