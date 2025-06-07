# Architectural Overview

## Executive Summary

The Custom Selected Word Count (OCSWC) plugin is an Obsidian plugin that provides advanced word counting functionality for selected text. The plugin works across all view modes (Reading, Live Preview, and Edit) and offers customizable features including path exclusion, multiple UI integration options, and detailed history tracking.

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Core Architecture](#2-core-architecture)
- [3. Functional Requirements](#3-functional-requirements)
  - [3.1. Word Counting Logic](#31-word-counting-logic)
  - [3.2. User Interface Components](#32-user-interface-components)
  - [3.3. Data Management](#33-data-management)
- [4. Technical Requirements](#4-technical-requirements)
- [5. Performance Considerations](#5-performance-considerations)
- [6. Accessibility Standards](#6-accessibility-standards)

## 1. System Overview

### 1.1. Plugin Purpose

The Custom Selected Word Count plugin extends Obsidian's built-in word counting capabilities by providing:

- **Advanced word recognition** that handles contractions, decimal numbers, hyphenated words, and underscore-separated terms
- **Intelligent path exclusion** that filters out file paths and filenames from word counts
- **Multiple access methods** including modal dialog, status bar integration, and ribbon button
- **Persistent history tracking** of the last 50 word counts with clipboard integration
- **Customizable regex patterns** for expert-level word detection customization

### 1.2. Target Users

- **Academic writers** who need precise word counts excluding references and file paths
- **Technical writers** who work with code snippets and file names in their documentation
- **Content creators** who require detailed tracking of word count history across different sections
- **Researchers** who need flexible word counting rules for various text types

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
├── Word Count Engine
│   ├── Text Selection Handler
│   ├── Word Recognition Algorithm
│   └── Path Detection System
├── User Interface Layer
│   ├── Modal Dialog Component
│   ├── Status Bar Integration
│   └── Ribbon Button Component
├── Data Management
│   ├── Settings Manager
│   ├── History Tracker
│   └── Clipboard Integration
└── Configuration System
    ├── Path Exclusion Rules
    ├── UI Customization Options
    └── Advanced Regex Patterns
```

### 2.2. Data Flow

1. **Text Selection** → User selects text in any Obsidian view mode
2. **Processing** → Word Count Engine processes the selected text
3. **Filtering** → Path Detection System applies exclusion rules
4. **Recognition** → Word Recognition Algorithm identifies countable words
5. **Display** → Results shown through selected UI components
6. **Storage** → Count added to history and settings updated

## 3. Functional Requirements

### 3.1. Word Counting Logic

#### 3.1.1. Word Recognition Algorithm

The plugin uses a sophisticated regex pattern for word recognition:

**Default Pattern:** `[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*`

**Recognized Elements:**
- Standard alphabetic words
- Contractions (e.g., "I'm", "don't")
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

#### 3.1.3. Advanced Regex Capabilities

For expert users, the plugin provides:

- **Custom Regex Patterns:** Replace the default word recognition algorithm
- **Interactive Testing:** Live preview of pattern matches with sample text
- **Safety Features:** Reset to default options and clear test functionality
- **Pattern Validation:** Real-time feedback on regex syntax and performance

### 3.2. User Interface Components

#### 3.2.1. Modal Dialog

**Primary Display:**
- Current word count with format: "Selected word count: [integer]"
- Copy to clipboard functionality
- OK button to close

**History Section:**
- Last 50 word counts with timestamps (optional)
- Individual copy buttons for each historical count
- Clear history functionality
- Keyboard navigation support

**Accessibility Features:**
- Full keyboard navigation (tab, arrow keys, enter/space)
- Screen reader compatibility
- Focus management and ARIA labels

#### 3.2.2. Status Bar Integration

**Display Options:**
- Customizable label text (default: "Selected: ")
- Live updates as selection changes
- Click to open modal dialog

**Update Modes:**
- **Live Updates:** Real-time count updates (with debouncing)
- **Manual Updates:** Updates only when command is triggered

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
- Path exclusion preferences
- Custom labels and text
- Advanced regex patterns
- History display options

**Storage Method:**
- Obsidian's local storage API
- JSON format for structured data
- Import/export functionality for backup

#### 3.3.2. History Management

**History Features:**
- Stores last 50 word counts
- Persistent across Obsidian restarts
- Optional timestamp display
- Global scope across all notes

**Data Structure:**
- Array of count objects with metadata
- Efficient storage and retrieval
- Automatic cleanup of old entries

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

*Last updated: June 7, 2025*

*This document serves as the primary architectural reference for the Custom Selected Word Count plugin development and maintenance.* 