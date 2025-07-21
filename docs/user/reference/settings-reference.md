# Settings Reference

## Executive Summary

This reference provides comprehensive documentation for all configuration options available in the Custom Selected Word Count plugin. Use this guide to understand each setting's purpose, behavior, and impact on plugin functionality.

## Table of Contents

- [1. Accessing Settings](#1-accessing-settings)
- [2. UI Elements Settings](#2-ui-elements-settings)
- [3. Path Exclusion Settings](#3-path-exclusion-settings)
- [4. Character Count Settings](#4-character-count-settings)
- [5. Sentence Count Settings](#5-sentence-count-settings)
- [6. Exclusion Settings](#6-exclusion-settings)
- [7. Per-Note Override Settings](#7-per-note-override-settings)
- [8. Advanced Regex Settings](#8-advanced-regex-settings)
- [9. History Settings](#9-history-settings)
- [10. Debug and Maintenance](#10-debug-and-maintenance)
- [11. Import and Export](#11-import-and-export)

## 1. Accessing Settings

### 1.1. Navigation Path

Access plugin settings through:
1. Open Obsidian Settings (Ctrl/Cmd + ,)
2. Navigate to **Community Plugins**
3. Find **Custom Selected Word Count**
4. Click the gear icon or plugin name

### 1.2. Settings Organization

Settings are organized into logical groups:
- **UI Elements:** Interface and accessibility options
- **Path Exclusion:** File path filtering configuration
- **Advanced Regex:** Expert-level word detection customization
- **History:** Count tracking and display options
- **Debug:** Troubleshooting and maintenance tools

## 2. UI Elements Settings

### 2.1. Show Ribbon Button

**Purpose:** Controls visibility of the ribbon button in Obsidian's left sidebar.

**Options:**
- `Enabled`: Ribbon button appears in left sidebar
- `Disabled` (default): No ribbon button displayed

**Behavior:**
- Changes require Obsidian restart to take effect
- Button uses "text-select" icon from Lucide library
- Tooltip displays: "Count words in selected text"
- Click action opens word count modal

**Use Cases:**
- Enable for quick visual access to word counting
- Disable to maintain clean sidebar interface
- Useful for mouse-driven workflows

### 2.2. Show Count in Status Bar

**Purpose:** Enables live word count display in Obsidian's status bar.

**Options:**
- `Enabled`: Shows selected text word count in status bar
- `Disabled` (default): No status bar integration

**Behavior:**
- Updates automatically when text selection changes
- Positioned adjacent to Obsidian's built-in word count
- Click action opens word count modal with history
- Only visible when text is currently selected

**Dependencies:**
- Requires "Enable Live Updates" for real-time functionality
- Works with customizable status bar label

### 2.3. Status Bar Label

**Purpose:** Customizes the text that appears before the word count in the status bar.

**Default Value:** `"Selected: "`

**Options:**
- Any custom text string
- Supports special characters and Unicode
- Empty string removes label entirely

**Examples:**
- `"Sel: "` - Abbreviated version
- `"Words: "` - Descriptive label
- `"📊 "` - Icon-based label
- `""` - Number only display

**Behavior:**
- Changes take effect immediately
- Visible only when status bar integration is enabled
- Preserves trailing space for clean appearance

### 2.4. Enable Live Updates

**Purpose:** Controls when the status bar count updates.

**Options:**
- `Enabled` (default): Updates as selection changes
- `Disabled`: Updates only when count command is triggered

**Performance Impact:**
- Live updates use 300ms debounce delay
- Disabled mode reduces processing overhead
- Recommended for slower systems or large documents

**Use Cases:**
- Enable for real-time feedback during text selection
- Disable to minimize system resource usage
- Useful for performance-sensitive environments

### 2.5. Hide Core Word Count

**Purpose:** Hides Obsidian's built-in word count from the status bar.

**Options:**
- `Enabled`: Hides Obsidian's default word count
- `Disabled` (default): Shows both counts

**Behavior:**
- Affects only visual display, not functionality
- Plugin word count remains independently functional
- Changes take effect immediately

**Use Cases:**
- Reduce status bar clutter
- Focus attention on selected text counts
- Minimize information overload

## 3. Path Exclusion Settings

### 3.1. Exclude Paths from Word Count

**Purpose:** Master toggle for all path exclusion functionality.

**Options:**
- `Enabled`: Activates path detection and exclusion
- `Disabled` (default): Counts all text including paths

**Behavior:**
- Controls all path exclusion settings below
- When disabled, all path types are included in counts
- Must be enabled for individual path type settings to function

**Impact:**
- Affects accuracy of word counts in technical documents
- Important for documents containing file references
- Can significantly change count results

### 3.2. Exclude Windows Paths

**Purpose:** Excludes Windows-style file paths from word counts.

**Detected Patterns:**
- Drive letters: `C:\`, `D:\`, `Z:\`
- UNC paths: `\\server\share\file`
- Mixed separators: `C:/path/to/file`

**Examples:**
- `C:\Users\John\Documents\file.txt`
- `D:\Projects\my-project\README.md`
- `\\network-server\shared\folder`

**Options:**
- `Enabled`: Excludes Windows paths from counts
- `Disabled` (default): Includes Windows paths in counts

**Edge Cases:**
- Handles paths with spaces: `"Program Files"`
- Recognizes quoted paths: `"C:\My Documents\file"`
- Identifies network authentication: `\\domain\user@server`

### 3.3. Exclude UNC Paths

**Purpose:** Specifically targets Universal Naming Convention network paths.

**Detected Patterns:**
- Network shares: `\\server\share`
- Administrative shares: `\\computer\C$`
- Domain paths: `\\domain.com\folder`

**Options:**
- `Enabled`: Excludes UNC paths from counts
- `Disabled` (default): Includes UNC paths in counts

**Behavior:**
- Independent of Windows path setting
- Requires exactly two leading backslashes
- Case-insensitive server and share names

### 3.4. Exclude Unix Paths

**Purpose:** Excludes Unix and Linux-style file paths from word counts.

**Detected Patterns:**
- Absolute paths: `/usr/local/bin`
- Home directory: `/home/user/documents`
- System paths: `/etc/config/file.conf`

**Options:**
- `Enabled`: Excludes Unix paths from counts
- `Disabled` (default): Includes Unix paths in counts

**Behavior:**
- Must start with forward slash
- Supports deep directory structures
- Handles special characters in path names

### 3.5. Exclude Environment Paths

**Purpose:** Excludes environment variable references from word counts.

**Detected Patterns:**
- Windows style: `%USERPROFILE%\Documents`
- Unix style: `$HOME/projects/file`
- Mixed usage: `%PATH%/bin:$HOME/bin`

**Options:**
- `Enabled`: Excludes environment variables from counts
- `Disabled` (default): Includes environment variables in counts

**Behavior:**
- Recognizes both Windows (%) and Unix ($) syntax
- Supports nested environment variables
- Case-sensitive variable names

## 4. Advanced Regex Settings

### 4.1. Enable Advanced Regex

**Purpose:** Allows custom regular expression patterns for word detection.

**Options:**
- `Enabled`: Unlocks custom regex functionality
- `Disabled` (default): Uses default word detection pattern

**Warning:** This is an expert feature. Incorrect patterns can cause inaccurate counts or performance issues.

**Requirements:**
- Understanding of regular expression syntax
- Testing recommended before production use
- Performance monitoring for complex patterns

### 8.2. Custom Regex Pattern

**Purpose:** Defines the regular expression used for word recognition.

**Default Pattern:** `[A-Za-z0-9]+(?:[\u2018\u2019'-_][A-Za-z0-9]+)*`

**Pattern Components:**
- Character classes: `[A-Za-z0-9]`
- Quantifiers: `+` (one or more)
- Non-capturing groups: `(?:...)`
- Character alternatives: `[-_]`

**Validation:**
- Real-time syntax checking
- Performance impact assessment
- Error reporting for invalid patterns

**Common Customizations:**
- Numbers only: `\d+(?:\.\d+)?`
- Long words only: `[A-Za-z]{6,}`
- CamelCase terms: `[A-Z][a-z]*(?:[A-Z][a-z]*)*`

### 8.3. Reset to Default Regex

**Purpose:** Instantly reverts custom regex to the plugin's default pattern.

**Behavior:**
- One-click restoration of default pattern
- Clears any custom pattern errors
- Maintains test area content for comparison

**Use Cases:**
- Recovery from invalid patterns
- Baseline comparison testing
- Quick restoration during experimentation

### 8.4. Test Your Regex

**Purpose:** Interactive testing area for custom regex patterns.

**Features:**
- Live pattern matching preview
- Real-time word count calculation
- Visual highlighting of matched segments
- Error detection and reporting

**Usage:**
1. Enter or paste sample text
2. Observe which segments match your pattern
3. Review the resulting word count
4. Refine pattern based on results

**Benefits:**
- Safe experimentation environment
- Immediate feedback on pattern behavior
- Prevents deployment of problematic patterns

### 8.5. Reset Test

**Purpose:** Clears the regex test input area.

**Behavior:**
- Removes all text from test area
- Maintains current regex pattern
- Resets match highlighting

**Use Cases:**
- Testing different text samples
- Clean slate for new experiments
- Quick clearing of sensitive test content

## 5. History Settings

### 5.1. Show Date/Time in History

**Purpose:** Controls timestamp display in the word count history list.

**Options:**
- `Enabled`: Shows date and time for each count
- `Disabled` (default): Shows only word counts

**Timestamp Format:**
- Follows system locale settings
- Includes date and time information
- Updates automatically for timezone changes

**Use Cases:**
- Track word count progress over time
- Document writing session timestamps
- Analyze writing patterns and productivity

### 9.2. History Storage Limit

**Purpose:** Controls how many word counts are stored in history.

**Default Value:** `50`

**Behavior:**
- Automatically removes oldest entries when limit is exceeded
- Persists across Obsidian restarts
- Stored in plugin's local data

**Performance Impact:**
- Higher limits use more storage space
- Minimal impact on processing speed
- Consider system resources for very high limits

## 6. Debug and Maintenance

### 6.1. Enable Debug Logging

**Purpose:** Activates detailed logging for troubleshooting purposes.

**Options:**
- `Enabled`: Writes debug information to console
- `Disabled` (default): Normal logging only

**Log Information:**
- Text processing steps
- Pattern matching results
- Performance timing data
- Error details and stack traces

**Use Cases:**
- Troubleshooting word count discrepancies
- Performance analysis and optimization
- Bug reporting and issue diagnosis

**Warning:** Debug logging may impact performance and should be disabled during normal use.

### 10.2. Clear History

**Purpose:** Removes all stored word count history.

**Behavior:**
- Permanently deletes all historical counts
- Cannot be undone
- Affects history display immediately

**Confirmation:**
- Requires user confirmation before deletion
- Clear warning about permanent action
- Option to cancel operation

**Use Cases:**
- Privacy protection for sensitive documents
- Reset tracking for new projects
- Storage space management

## 7. Import and Export

### 7.1. Export Settings

**Purpose:** Creates a backup file containing all plugin settings.

**Export Format:**
- JSON file format
- Human-readable structure
- Includes all configuration options

**Exported Data:**
- UI element preferences
- Path exclusion settings
- Custom regex patterns
- History preferences
- Debug settings

**Use Cases:**
- Backup before major changes
- Share configurations between devices
- Document current settings for reference

### 7.2. Import Settings

**Purpose:** Restores plugin settings from a previously exported file.

**Import Process:**
1. Select exported JSON file
2. Validate file format and content
3. Apply settings to current installation
4. Restart plugin to ensure changes take effect

**Validation:**
- Checks file format compatibility
- Verifies setting value validity
- Reports any import errors or warnings

**Safety Features:**
- Creates automatic backup before import
- Option to cancel import process
- Detailed import summary and confirmation

---

*Last updated: June 7, 2025*

*This reference covers all available settings as of the current plugin version. Settings may be added or modified in future releases.* 