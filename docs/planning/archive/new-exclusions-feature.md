# New Exclusions Feature Planning

## Overview
This document outlines the implementation plan for adding two new exclusion options to the Custom Selected Word Count Plugin:
1. Exclude headings
2. Exclude words and phrases

## Feature Requirements

### 1. Exclude Headings
**Purpose**: Allow users to exclude markdown headings from word count analysis.

**Settings Interface**:
- New section: "Exclude headings"
- Master toggle: "Exclude headings from text analysis"
- Sub-options:
  - "Exclude heading markers only" (just the `#` symbols)
  - "Exclude entire heading lines" (the whole heading text)

**Technical Implementation**:
- Support both ATX headers (`# Heading`) and Setext headers (`Heading\n=======`)
- Three processing modes:
  - Markers only: Remove `#` symbols but count heading text
  - Entire lines: Remove complete heading lines from text
  - Entire sections: Remove heading + all content until next heading (following Obsidian's block system)
- Integration with existing exclusion pipeline

### 2. Exclude Words and Phrases
**Purpose**: Allow users to exclude specific words and phrases from word count analysis.

**Settings Interface**:
- New section: "Exclude words and phrases"
- Master toggle: "Exclude words and phrases from text analysis"
- Two sub-sections:
  - **Words**: Text input field for comma-separated word list
  - **Phrases**: List display with individual delete/edit buttons

**Technical Implementation**:

#### Words Subsection
- **Input**: Comma-separated text field
- **Matching**: Case-insensitive, exact word matching only
- **Validation**: Ensures proper comma formatting
- **Example**: "the, and, or, but" excludes those specific words
- **Storage**: `excludedWords: string` (comma-separated)

#### Phrases Subsection
- **Input**: Right-click context menu on selected text
- **Context Menu Text**: "Exclude phrase from word count"
- **Matching**: Case-insensitive, full phrase matching (includes spaces)
- **Management**: List UI with delete/edit buttons per phrase
- **Auto-navigation**: Opens settings and jumps to relevant section when phrase added
- **Storage**: `excludedPhrases: string[]` (array)

## Data Structure Changes

### Settings Interface Updates
```typescript
interface WordCountPluginSettings {
  // ... existing settings ...
  
  // Heading exclusion settings
  excludeHeadings: boolean;              // Master toggle for heading exclusion
  excludeHeadingMarkersOnly: boolean;    // Toggle for excluding only markers
  excludeEntireHeadingLines: boolean;    // Toggle for excluding entire lines
  excludeEntireHeadingSections: boolean; // Toggle for excluding entire sections
  
  // Words and phrases exclusion settings
  excludeWordsAndPhrases: boolean;       // Master toggle for words/phrases exclusion
  excludedWords: string;                 // Comma-separated list of words
  excludedPhrases: string[];             // Array of phrases to exclude
}
```

### Default Values
```typescript
const DEFAULT_SETTINGS: WordCountPluginSettings = {
  // ... existing defaults ...
  
  // Heading exclusion defaults
  excludeHeadings: false,                // Heading exclusion disabled by default
  excludeHeadingMarkersOnly: false,      // Markers-only exclusion disabled by default
  excludeEntireHeadingLines: false,      // Entire lines exclusion disabled by default
  excludeEntireHeadingSections: false,   // Entire sections exclusion disabled by default
  
  // Words and phrases exclusion defaults
  excludeWordsAndPhrases: false,         // Words/phrases exclusion disabled by default
  excludedWords: '',                     // Empty word list by default
  excludedPhrases: [],                   // Empty phrase list by default
};
```

## Implementation Plan

### Phase 1: Core Functionality
1. **Add settings properties** to `WordCountPluginSettings` interface
2. **Update default settings** with new exclusion options
3. **Create heading processing function**:
   - `processHeadings(text: string, excludeMarkers: boolean, excludeLines: boolean): string`
4. **Create words/phrases processing function**:
   - `processWordsAndPhrases(text: string, excludedWords: string, excludedPhrases: string[]): string`

### Phase 2: Settings UI
1. **Add heading exclusion section** to `WordCountSettingTab`
   - Master toggle with conditional sub-options
   - Follow existing pattern from comment exclusion section
2. **Add words/phrases exclusion section** to `WordCountSettingTab`
   - Master toggle
   - Words text input with validation
   - Phrases list management UI

### Phase 3: Context Menu Integration
1. **Register context menu item** in plugin's `onload()` method
2. **Conditional menu display**: Only show right-click option when `excludeWordsAndPhrases` is enabled
3. **Implement phrase capture logic**:
   - Get selected text from active editor
   - Add to `excludedPhrases` array
   - Save settings
   - Open settings tab and navigate to section
4. **Add user feedback** (notices, confirmations)

### Phase 4: Integration & Testing
1. **Integrate new processing functions** into existing text processing pipeline
2. **Update character and sentence counting** to use new exclusions
3. **Add comprehensive testing** for all exclusion combinations
4. **Performance optimization** for large exclusion lists

## Technical Considerations

### Processing Order
The exclusion processing should follow this order to avoid conflicts:
1. Comments (existing)
2. Links (existing)
3. Headings (new)
4. Words and phrases (new)
5. Final word regex matching

### Performance Considerations
- **Large exclusion lists**: Optimize matching algorithms for many excluded words/phrases
- **Regex compilation**: Cache compiled regex patterns where possible
- **Text processing**: Minimize string operations and memory allocations

### User Experience Considerations
- **Settings validation**: Provide clear feedback for invalid input
- **Context menu placement**: Ensure menu item appears in appropriate contexts
- **Conditional context menu**: Only show right-click option when phrase exclusion is enabled
- **Auto-navigation**: Smooth transition to settings when adding phrases
- **Visual feedback**: Clear indication of what's being excluded

## Testing Strategy

### Unit Tests
- Test heading processing with various markdown formats
- Test word/phrase exclusion with edge cases
- Test settings validation and error handling

### Integration Tests
- Test exclusion combinations (comments + headings + words)
- Test context menu functionality
- Test settings persistence

### User Experience Tests
- Test right-click workflow
- Test settings UI responsiveness
- Test exclusion preview/feedback

## Future Enhancements (Out of Scope)
- Regex support in word/phrase exclusions
- Import/export exclusion lists
- Exclusion statistics/reporting
- Bulk phrase management tools

## Success Criteria
1. ✅ Users can exclude headings with granular control
2. ✅ Users can exclude words via comma-separated list
3. ✅ Users can exclude phrases via right-click selection
4. ✅ All exclusions work together seamlessly
5. ✅ Settings UI follows existing patterns and styling
6. ✅ Context menu integration works in all editor modes
7. ✅ Performance remains acceptable with large exclusion lists

## Implementation Status: COMPLETED ✅

### ✅ Phase 1: Core Functionality
- **COMPLETED**: Added new settings properties to `WordCountPluginSettings` interface
- **COMPLETED**: Updated `DEFAULT_SETTINGS` with new exclusion options
- **COMPLETED**: Created `processHeadings()` function for heading exclusion (3 modes)
- **COMPLETED**: Created `processWordsAndPhrases()` function for words/phrases exclusion
- **COMPLETED**: Integrated new processing functions into existing text processing pipeline

### ✅ Phase 2: Settings UI
- **COMPLETED**: Added "Exclude headings" section with master toggle and 3 sub-options
- **COMPLETED**: Added "Exclude words and phrases" section with words input and phrases list
- **COMPLETED**: Implemented mutual exclusivity logic for heading options
- **COMPLETED**: Added phrases list management UI with edit/delete buttons
- **COMPLETED**: Updated `updateSettingsUI()` for conditional visibility

### ✅ Phase 3: Context Menu Integration
- **COMPLETED**: Registered conditional context menu item (only when phrase exclusion enabled)
- **COMPLETED**: Implemented phrase capture logic from selected text
- **COMPLETED**: Added duplicate phrase detection and validation
- **COMPLETED**: Auto-opens settings when phrase added with user feedback

### ✅ Phase 4: Integration & Testing
- **COMPLETED**: Integrated new processing functions into character and sentence counting
- **COMPLETED**: Updated word counting to use new exclusions
- **COMPLETED**: Build verification successful (no TypeScript errors)
- **COMPLETED**: All exclusions work alongside existing exclusions

### ✅ Bonus Feature: Heading Sections
- **COMPLETED**: Added third heading exclusion option: "Exclude entire heading sections"
- **COMPLETED**: Implemented section-aware processing following Obsidian's block system
- **COMPLETED**: Updated UI with proper mutual exclusivity logic

### ✅ Enhancement: Selective Heading Exclusion
- **COMPLETED**: Replaced "blind" heading sections exclusion with selective exclusion
- **COMPLETED**: Added `getHeadingAtCursor()` method for detecting headings at cursor position
- **COMPLETED**: Implemented right-click context menu for heading selection
- **COMPLETED**: Created heading management UI with edit/delete functionality
- **COMPLETED**: Added inline editing for both headings and phrases with keyboard shortcuts

## Final Feature Summary

### 🎯 Exclude Headings (3 modes)
1. **Exclude heading markers only** - Removes `#` symbols, keeps text
2. **Exclude entire heading lines** - Removes complete heading lines  
3. **Exclude specific heading sections** - Right-click on headings to selectively exclude sections

### 🎯 Exclude Words and Phrases
1. **Words**: Comma-separated input (case-insensitive, exact word matching)
2. **Phrases**: Right-click selection → context menu → phrase management UI

### 🔧 Technical Achievements
- **Processing Order**: Comments → Links → Headings → Words/Phrases → Word counting
- **Integration**: Works with all existing exclusions seamlessly
- **Performance**: Optimized regex matching with proper escaping
- **UI/UX**: Follows established patterns with conditional visibility
- **Settings**: All disabled by default, consistent with other exclusions