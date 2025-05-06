# Custom Selected Word Count – Obsidian Plugin Specification

## 1. Overview
Custom Selected Word Count is an Obsidian plugin that provides advanced word counting functionality for selected text, regardless of view mode (Reading, Live Preview, or Edit). Going beyond basic counting, it offers customizable path exclusion, multiple UI integration options, and detailed history tracking. The word count is displayed in a modal dialog (with history and copy features) and optionally in the status bar. The plugin is accessible via hotkey, ribbon button, and command palette.

## 2. Versioning
- The plugin must use semantic versioning (e.g., 1.0.0) and display its version in the plugin settings.

## 3. Functional Requirements

### 3.1. Word Counting Logic
- **Inclusions:**  
  - Standard words (alphabetic sequences)
  - Contractions (e.g., "I'm", "don't")
  - Decimal numbers (e.g., "3.5")
  - Hyphenated words (e.g., "Sun-Kissed")
  - Underscore-separated words (e.g., "foo_bar")
- **Exclusions:**  
  - Image file paths and names
  - Full file paths (e.g., `C:\path\to\file.ext`)
  - Filenames with common extensions (see Settings for editable list)
  - All other characters, punctuation, and symbols (should be stripped)
- **Path Detection:**
  - File paths and filenames are included in the word count by default, but can be optionally excluded via the plugin's settings
  - When exclusion is enabled, the plugin identifies paths through:
    * File extensions (e.g., .txt, .pdf)
    * Windows drive letters (e.g., C:\)
    * Network paths (e.g., \\server)
    * Unix-style paths (starting with /)
  - **Advanced Path Detection:**
    * Windows paths: Drive letters (A-Z:\ or A-Z:/)
    * UNC paths: Exactly two backslashes followed by server/share (\\server\share)
    * Unix paths: Single forward slash at start (/usr/local)
    * Environment variables: Windows (%USERPROFILE%) and Unix ($HOME) style
    * Relative paths: Starting with ./ or ../
    * URL-style file paths: file:/// protocol
  - **Path Detection Settings:**
    * Separate toggles for each path type (Windows, UNC, Unix, etc.)
    * Custom pattern support for user-defined path formats
    * Examples shown in settings UI for clarity
  - **Edge Cases:**
    * Paths with spaces and special characters are properly handled
    * Paths embedded within regular text are correctly identified
    * False positives (e.g., single slashes in text) are minimized
- **Preservation:**  
  - Actual text content around removed elements should be preserved (i.e., removing a file path should not join two words together).
- **Counting:**  
  - Each match (as defined above) counts as one word.

### 3.1.1. Word Recognition Algorithm
- The plugin uses a sophisticated regex pattern to recognize words:
  - **Pattern:** `[A-Za-z0-9]+(?>[-_][A-Za-z0-9]+)*`
  - **Matches:**
    * Standard words
    * Contractions (e.g., "I'm", "don't")
    * Decimal numbers (e.g., "3.5")
    * Hyphenated words (e.g., "Sun-Kissed")
    * Underscore-separated words (e.g., "foo_bar")
  - All other characters (punctuation, symbols) are stripped.
  - **All straight and curly quotation marks (single and double) are stripped.**
  - **All emojis and other non-alphanumeric symbols are stripped.**
  - Each match counts as one word.

### 3.2. User Interface

#### 3.2.1. Modal Dialog
- Displays the current word count with the label:  
  `Selected word count: [integer]`
- Includes buttons:
  - **Copy to Clipboard:** Copies the current word count to the clipboard.
  - **Clear History:** Clears the history of word counts.
  - **OK:** Closes the modal.
- **History:**  
  - Shows the last 50 selected word counts performed, each with its own copy button.
  - Word count history persists across Obsidian restarts.
  - **Optionally, the date and time of each count can be displayed in the history, controlled by a plugin setting (off by default).**
- **Accessibility:**
  - Modal and history list must be fully keyboard-navigable (tab, arrow keys, enter/space to activate buttons).
- **When opened (by any method), the modal should always display the current or most recent word count in the main space.**

#### 3.2.2. Status Bar Integration (Optional)
- Optional feature that can be enabled in settings (disabled by default)
- Displays the selected word count adjacent to Obsidian's built-in word statistics
- Format: `[Customizable Label][integer]` (default: `Selected: [integer]`)
- Behavior:
  - Only shows when text is selected
  - Updates either:
    * Live as selection changes (with performance optimization)
    * Only when the count command is triggered
  - Clicking opens the word count modal
- Accessibility:
  - Clear visual indication of clickable status (cursor: pointer)
  - Screen reader support with descriptive labels
  - Keyboard navigation support
  - Tooltip indicating click functionality ("Click to show word count details and history")

#### 3.2.3. Ribbon Button (Optional)
- Optional feature that can be enabled in settings (disabled by default)
- Uses the "text-select" icon from the Lucide icon library
- Clicking the button triggers the word count modal
- Accessibility:
  - Clear tooltip ("Count words in selected text")
  - Screen reader support with descriptive labels
  - Standard Obsidian ribbon button behavior
- Changes to visibility require an Obsidian restart

#### 3.2.4. Commands & Hotkeys
- Provide a command to trigger the word count modal (assignable to a hotkey).
- The command should also be available in the command palette.

### 3.3. Clipboard Integration
- The "Copy to Clipboard" button in the modal copies the current word count.
- Each history entry's copy button copies that specific count.

### 3.4. Error Handling
- If no text is selected, display "0 words" or a helpful message.
- Handle unsupported view modes or errors gracefully, with user feedback.

### 3.5. Settings Import/Export
- The plugin provides a feature to import and export all settings (including exclusion lists, label text, and other preferences) for backup or sharing purposes.

### 3.6. Internationalization (i18n)
- All user-facing strings should be structured for easy translation, supporting future internationalization.

### 3.7. History Scope
- Word count history is global across all notes and selections.

### 3.8. Clipboard Copy Format
- The "Copy to Clipboard" button copies only the integer value of the word count.

### 3.9. Data Storage
- Plugin settings and history are stored using Obsidian's local storage API.
- Selected text is never stored or transmitted.

### 3.10. Accessibility Testing
- All UI elements should be accessible via keyboard and screen readers.
- Use of screen reader/keyboard navigation testing tools is recommended but not required.

### 3.11. Performance Optimization
- Status bar updates are debounced (300ms delay) to prevent performance impact during text selection
- Live updates only process when text is actually selected
- Efficient text selection handling across all view modes
- Memory management:
  - Proper cleanup of event listeners
  - Clear status bar when plugin is disabled
  - Resource-conscious update cycle

## 4. Non-Functional Requirements

- **Performance:** Should not noticeably impact Obsidian's responsiveness.
- **Compatibility:** Should work with the latest stable version of Obsidian.
- **Accessibility:** Modal and navigation bar updates should be accessible to screen readers and fully keyboard-navigable.

## 5. Settings

All settings should be grouped in a dedicated plugin settings tab:

### 5.1 UI Elements
- **Show Ribbon Button:**
  - Toggle to enable/disable the ribbon button
  - Disabled by default
  - Changes require Obsidian restart
  - Clear user notification about restart requirement
- **Enable Status Bar Integration:**
  - Toggle to enable/disable the status bar feature
  - Disabled by default to maintain clean interface
  - Changes take effect immediately
- **Status Bar Label:**
  - Customizable label text (default: "Selected: ")
  - Appears before the word count
  - Updates in real-time when changed

### 5.2 Path Detection Settings
- **Ribbon Button Toggle:** Enable/disable the ribbon button.
- **Navigation Bar Live Update Toggle:**
  - When enabled (default), the navigation bar updates live as the selection changes.
  - When disabled, the navigation bar updates only when the command is triggered.
- **Navigation Bar Label Text:**
  - Customizable label for the navigation bar (default: `Sel. Word Count:`).
- **File Extension Exclusion List:**
  - Comma-separated list of file extensions to exclude from word counting (e.g., .jpg, .png, .md). (Note: full file paths and file names are excluded.)
- **Emoji Stripping Toggle:**
  - Option in plugin settings to strip or include emojis in the word count (**default: strip emojis**).
- **(Optional/Future) Word Definition Customization:**
  - Option to customize what counts as a "word" (e.g., include/exclude numbers, special characters).
- **(Optional/Future) Enable/Disable Navigation Bar Display.**
- **Show Date/Time in History:**
  - Toggle to display the date and time of each word count in the history (default: off).

## 6. Out of Scope

- Counting words in the entire note (unless selected).
- Persistent storage of word counts beyond the last 50 (unless specified).
- Modification of Obsidian's built-in word count display
- Integration within Obsidian's core word count component

## 7. Implementation Notes & Suggestions

- **Settings Storage:** Use Obsidian's plugin settings API to persist user preferences and word count history.
- **File Path/Name Filtering:** Use the exclusion list to filter out file paths and names before word counting. Consider using regex for robust matching.
- **History Persistence:** Store the last 50 word counts in plugin settings for persistence across restarts.
- **Accessibility:** Ensure all UI elements (modal, buttons, history list) are accessible via keyboard and screen readers.
- **Testing:** Test in all three view modes (Reading, Live Preview, Edit) and with various selection types (including edge cases).
- **Performance:** Optimize event listeners for live updates to avoid performance degradation in large notes.

### 4.1. Performance (update)
- If live updates are enabled, event handlers for selection changes should be debounced to avoid excessive computation in large notes.

---

If any further clarification or expansion is needed, please specify! 