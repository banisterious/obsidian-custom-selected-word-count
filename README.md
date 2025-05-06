# Custom Selected Word Count for Obsidian

A plugin for [Obsidian](https://obsidian.md) that provides advanced word counting features for selected text across all view modes. Goes beyond basic word counting with customizable path exclusion, UI integration options, and detailed history tracking.

## Features

- Accurate word counting of selected text in all view modes (Source, Live Preview, and Reading)
- Path and file extension exclusion to avoid counting URLs and file paths
- Command palette integration
- Optional status bar integration showing live word count
- Optional ribbon button for quick access
- Word count history with timestamps
- Customizable status bar label
- **Advanced: Custom Word Detection Regex**
  - Define your own regex pattern for word detection (for expert users)
  - Interactive "Test Your Regex" area: enter sample text, see which fragments match, and view the resulting word count
  - "Reset to Default Regex" and "Reset Test" buttons for easy experimentation
  - Helper texts guide you through using and testing your custom pattern

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Custom Selected Word Count"
4. Install the plugin
5. Enable the plugin in your list of installed plugins

## Usage

1. Select text in any view mode
2. Either:
   - Use the command palette and search for "Count Selected Words"
   - Click the ribbon button (if enabled)
   - Click the status bar count (if enabled)
3. View the word count in the popup modal

## Settings

### UI Elements
- **Show Ribbon Button**: Add a button to the ribbon menu for quick access (requires restart)
- **Show Count in Status Bar**: Display the word count in the status bar
  - **Enable Live Updates**: Update the count automatically when text is selected
  - **Hide Core Word Count**: Hide Obsidian's built-in word count (CSS-based)
  - **Status Bar Label**: Customize the label shown before the count

### Path Exclusion
- **Exclude Paths from Word Count**: Toggle path exclusion (**disabled by default**)
  - **Exclude Windows Paths**: Skip Windows-style paths (C:\) (**disabled by default**)
  - **Exclude UNC Paths**: Skip network paths (\\server) (**disabled by default**)
  - **Exclude Unix Paths**: Skip Unix-style paths (/usr/local) (**disabled by default**)
  - **Exclude Environment Paths**: Skip paths with environment variables (**disabled by default**)

### Advanced: Custom Word Detection Regex (Expert Only)
- **Enable Advanced Regex**: Allow defining a custom regex for word detection
- **Custom Regex Pattern**: Enter your own regex pattern (default provided)
- **Reset to Default Regex**: Instantly revert to the default pattern (with helper text)
- **Test Your Regex**: Enter sample text to see which fragments your regex matches and the resulting word count
- **Reset Test**: Clear the test input box
- Helper texts explain each feature and guide you through safe usage

### Other Settings
- **Show Date/Time in History**: Include timestamps in word count history
- **Enable Debug Logging**: Enable detailed console logging for troubleshooting

## Exclusion Logic Details (New in Settings)

The settings page now includes a detailed "Exclusion Logic Details" section. For each exclusion type (Windows Paths, UNC Paths, Unix Paths, Environment Variable Paths, File Extension Exclusion, file:/// Protocol), you will see:

- The regex pattern used
- A plain-English explanation
- Example matches and non-matches
- A "Copy Regex" button for advanced users
- All details are in a collapsible section for clarity

This makes it easy to understand what is being excluded and why.

**UI improvement:** The sub-settings for "Exclude Paths" are now indented to match the style of the "Show Count in Status Bar" children, for a more consistent and visually appealing settings page.

## Support

If you encounter any issues or have feature requests, please file them in the [GitHub issues](https://github.com/yourusername/obsidian-selected-word-counter/issues).

## License

[MIT License](LICENSE.md) 