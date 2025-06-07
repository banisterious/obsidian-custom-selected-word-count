# Getting Started Guide

## Executive Summary

This guide helps you install, configure, and use the Custom Selected Word Count plugin for Obsidian. You'll learn how to count words in selected text with advanced features like path exclusion, history tracking, and customizable UI integration.

## Table of Contents

- [1. Installation](#1-installation)
- [2. Quick Start](#2-quick-start)
- [3. Basic Features](#3-basic-features)
- [4. Configuration](#4-configuration)
- [5. Advanced Usage](#5-advanced-usage)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Installation

### 1.1. Community Plugins Marketplace

1. Open Obsidian Settings
2. Navigate to **Community Plugins** and disable Safe Mode
3. Click **Browse** and search for "Custom Selected Word Count"
4. Click **Install**
5. Enable the plugin in your list of installed plugins

### 1.2. Manual Installation

1. Download the latest release from the [GitHub repository](https://github.com/banisterious/obsidian-custom-selected-word-count)
2. Extract the files to your `.obsidian/plugins/custom-selected-word-count` folder
3. Enable the plugin in Obsidian settings

## 2. Quick Start

### 2.1. Basic Word Counting

1. **Select text** in any view mode (Source, Live Preview, or Reading)
2. **Access the word count** using one of these methods:
   - Press your assigned hotkey (if configured)
   - Click the ribbon button (if enabled)
   - Use the command palette: "Count words in selected text"
   - Click the status bar count (if enabled)

![Basic usage showing text selection and count options](../assets/images/basic-usage-selection.png)
*Select text and choose how to view the word count*

### 2.2. Understanding the Results

The word count modal displays:
- Current selected word count
- History of your last 50 counts
- Copy-to-clipboard functionality
- Clear history option

![Word count modal showing the count result](../assets/images/basic-usage-modal.png)
*The word count modal displays the count and provides clipboard and history options*

## 3. Basic Features

### 3.1. Accurate Word Counting

The plugin counts words intelligently, including:
- Standard words and contractions ("I'm", "don't")
- Hyphenated words ("Sun-Kissed")
- Numbers and decimals ("3.5")
- Underscore-separated terms ("foo_bar")

### 3.2. UI Integration Options

#### 3.2.1. Ribbon Button

Enable the ribbon button in settings for quick access to word counting.

![Ribbon button location and function](../assets/images/ui-ribbon-button.png)
*The ribbon button in the left sidebar opens the word count modal window*

#### 3.2.2. Status Bar Integration

The status bar shows your current selection's word count and updates live as you change your selection.

![Status bar word count location and interaction](../assets/images/ui-status-bar.png)
*The status bar displays the current selection's word count and opens the modal when clicked*

#### 3.2.3. Command Palette Access

Access word counting through Obsidian's command palette for keyboard-driven workflows.

![Command palette access option](../assets/images/ui-command-palette.png)
*Access the word count feature through Obsidian's command palette*

### 3.3. History Tracking

The plugin keeps track of your word counts with:
- History of last 50 counts
- Individual copy buttons for each count
- Optional timestamps
- Persistent storage across Obsidian restarts

![Word count history modal with copy options](../assets/images/history-modal.png)
*The history modal shows your current and previous word counts with copy options*

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

### 4.2. Path Exclusion Settings

Configure which types of paths and files to exclude from word counts:

- **Exclude Paths from Word Count:** Master toggle for path exclusion
- **Exclude Windows Paths:** Filter out Windows-style paths (C:\)
- **Exclude UNC Paths:** Filter out network paths (\\server)
- **Exclude Unix Paths:** Filter out Unix-style paths (/usr/local)
- **Exclude Environment Paths:** Filter out environment variables

### 4.3. History Settings

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

### 5.2. Use Cases

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

*Last updated: June 7, 2025*

*For technical documentation and development information, see the [developer documentation](../../developer/) section.* 