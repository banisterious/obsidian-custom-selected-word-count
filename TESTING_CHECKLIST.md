# Selected Word Count Plugin – Testing Checklist

## Word Counting
- [ ] Counts standard words correctly
- [ ] Counts contractions (e.g., "I'm", "don't") as one word
- [ ] Counts decimal numbers (e.g., "3.5") as one word
- [ ] Counts hyphenated words (e.g., "Sun-Kissed") as one word
- [ ] Counts underscore-separated words (e.g., "foo_bar") as one word
- [ ] Excludes image file paths and names
- [ ] Excludes full file paths (e.g., `C:\path\to\file.ext`)
- [ ] Excludes filenames with common extensions (from exclusion list)
- [ ] Strips all other punctuation/symbols
- [ ] Preserves text content around removed elements
- [ ] Each match counts as one word

## User Interface
- [ ] Modal displays correct word count with label
- [ ] Modal shows last 50 word counts in history
- [ ] Each history entry has a working copy button
- [ ] "Copy to Clipboard" button copies current count (integer only)
- [ ] "Clear History" button clears history
- [ ] "OK" button closes modal
- [ ] Ribbon button appears/disappears based on setting
- [ ] Ribbon button opens modal
- [ ] Navigation bar displays correct label and count
- [ ] Clicking navigation bar label/count opens modal
- [ ] Navigation bar updates live as selection changes (if enabled)
- [ ] Navigation bar updates only on command (if live update disabled)

## Settings
- [ ] Ribbon button toggle works
- [ ] Navigation bar live update toggle works
- [ ] Navigation bar label text is customizable
- [ ] File extension exclusion list is editable and respected
- [ ] Settings import/export works (import, export, restore)

## History
- [ ] History persists across Obsidian restarts
- [ ] History is global (not per-note)
- [ ] Only the last 50 counts are kept

## Clipboard
- [ ] Only the integer is copied (not label)
- [ ] Each history entry's copy button works

## Performance
- [ ] No noticeable lag in large notes
- [ ] Live update is debounced and efficient

## Accessibility
- [ ] Modal and history are fully keyboard-navigable (tab, arrow keys, enter/space)
- [ ] All UI elements are accessible to screen readers
- [ ] Test with at least one screen reader (optional/recommended)

## Internationalization
- [ ] All user-facing strings are translatable (test with a second language if possible)

## Error Handling
- [ ] Displays "0 words" or helpful message if no text is selected
- [ ] Handles unsupported view modes gracefully
- [ ] No sensitive data (selected text) is stored or transmitted 

## Path Detection Testing
### Basic Path Detection
- [ ] Windows paths with drive letters (e.g., "C:\Users\Documents")
- [ ] UNC network paths (e.g., "\\server\share")
- [ ] Unix-style absolute paths (e.g., "/usr/local/bin")
- [ ] File extensions from exclusion list (e.g., "document.pdf")

### Advanced Path Patterns
- [ ] Environment variables in paths:
  - [ ] Windows style (%USERPROFILE%\Documents)
  - [ ] Unix style ($HOME/Documents)
- [ ] Relative paths:
  - [ ] Current directory (./file.txt)
  - [ ] Parent directory (../file.txt)
- [ ] URL-style file paths (file:///C:/path)
- [ ] Mixed forward/backward slashes (C:/Users\Documents)

### Edge Cases
- [ ] Paths with spaces ("C:\Program Files\App Name")
- [ ] Paths with special characters (é, ñ, etc.)
- [ ] Multiple paths in the same text
- [ ] Paths at start/end of text
- [ ] Paths with environment variables and spaces
- [ ] Network paths with IP addresses (\\192.168.1.1\share)

### False Positive Prevention
- [ ] Single forward slash in regular text ("and/or")
- [ ] Single backslash in regular text ("this\that")
- [ ] Words containing periods ("e.g." or "i.e.")
- [ ] Text that looks like a file extension ("Mr. Smith")

### Settings Integration
- [ ] Each path type toggle works independently
- [ ] Custom pattern matching works
- [ ] UI examples are clear and accurate
- [ ] Settings persist after restart

### Mixed Content
- [ ] Regular text mixed with paths
- [ ] Multiple path types in same text
- [ ] Paths with markdown formatting
- [ ] Paths in code blocks
- [ ] Paths in quotes or parentheses 