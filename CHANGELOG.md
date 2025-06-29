# Changelog

## [1.2.0] - 2025-06-29
### Added
- **Character Counting System**
  - Added character counting functionality with three configurable modes:
    - All characters (including spaces and punctuation)
    - All characters excluding spaces
    - Letters only (alphabetic characters)
  - Character count visibility toggle in settings
  - Character count display in modal and history
  - Individual copy functionality for character counts
- **Sentence Counting System**
  - Added sophisticated sentence boundary detection
  - Advanced handling of abbreviations (Mr., Dr., Prof., etc.)
  - Smart exclusion of decimal numbers and file extensions
  - Markdown-aware processing for code blocks and headers
  - Sentence count visibility toggle in settings
  - Sentence count display in modal and history
- **Enhanced Modal Design**
  - Complete redesign with modern card-based layout
  - Professional monochrome styling integrated with Obsidian themes
  - Responsive grid system for multiple metrics
  - Individual count cards for words, characters, and sentences
  - Enhanced visual hierarchy with proper typography
  - Unicode icon replacements for better compatibility
- **Multi-Metric History**
  - Expanded history tracking to include words, characters, and sentences
  - Individual copy buttons for each metric in history entries
  - Backward compatibility with existing history data
  - Enhanced history display with improved visual design

### Changed
- **Architecture Improvements**
  - Renamed `countSelectedWords` to `countSelectedText` for better semantic clarity
  - Added `CountResult` interface for structured multi-metric results
  - Enhanced `WordCountHistoryEntry` to include character and sentence counts
  - Updated modal class to handle multiple metrics efficiently
- **User Interface Enhancements**
  - Improved modal accessibility with better keyboard navigation
  - Enhanced visual feedback for user actions
  - Consistent button styling and interaction patterns
  - Better responsive design for various screen sizes
- **Settings Organization**
  - Added dedicated sections for character and sentence counting
  - Improved settings structure with logical grouping
  - Enhanced setting descriptions and help text

### Technical
- **Performance Optimizations**
  - Efficient multi-metric processing in single pass
  - Optimized character counting algorithms
  - Improved sentence detection with minimal regex operations
- **Code Quality**
  - Added comprehensive TypeScript interfaces
  - Enhanced error handling for new features
  - Improved code documentation and comments
  - Better separation of concerns in text analysis functions

## [1.0.1] - 2025-05-05
### Changed
- **Code Quality Improvements**
  - Renamed generic class names to more descriptive ones for better debugging
  - Moved all inline styles to dedicated CSS file for better maintainability
  - Improved CSS organization with proper class naming and documentation
  - Added responsive design improvements for mobile devices
  - Enhanced theme compatibility using CSS variables
- **Developer Experience**
  - Implemented proper debug logging system with toggle in settings
  - Removed direct console.log calls to reduce console noise
  - Added comprehensive CSS comments for easier styling customization

## [1.0.0] - 2025-05-07
### Initial Release
- Initial release of **Custom Selected Word Count** for Obsidian.
- Provides advanced word counting features for selected text.
- Features include:
  - Path exclusion for flexible word counting.
  - Multiple UI integration options.
  - History tracking of word counts.
  - Advanced Regex capabilities for custom word matching.
- Added Advanced Regex UI with a test area for experimenting with patterns.
- Live word count display for immediate feedback.
- Improved and expanded documentation.

### Code Quality
- **Code Structure**
  - Renamed generic class names to more descriptive ones for better debugging
  - Implemented proper debug logging system with toggle in settings
  - Removed direct console.log calls to reduce console noise
- **Styling Improvements**
  - Moved all inline styles to dedicated CSS file for better maintainability
  - Improved CSS organization with proper class naming and documentation
  - Added responsive design improvements for mobile devices
  - Enhanced theme compatibility using CSS variables
  - Added comprehensive CSS comments for easier styling customization

### Submission
- Corrected plugin entry placement in `community-plugins.json`
- Created proper release with required files (`main.js` and `manifest.json`)

---

*The changelog is maintained with each release. For the latest updates, please check the [releases page](https://github.com/banisterious/obsidian-custom-selected-word-count/releases).*