# Custom Selected Word Count – User Documentation

## Introduction

**Custom Selected Word Count** is an Obsidian plugin that provides advanced word counting features for selected text. It goes beyond basic word counting with customizable path exclusion, UI integration options, history tracking, and advanced regex capabilities.

---

## Installation

### From Community Plugins Marketplace

1. Open Obsidian Settings.
2. Go to **Community Plugins** and disable Safe Mode.
3. Click **Browse** and search for "Custom Selected Word Count."
4. Click **Install**.
5. Enable the plugin in your list of installed plugins.

### Manual Installation

1. Download the latest release from the [GitHub repository](https://github.com/banisterious/obsidian-custom-selected-word-count).
2. Extract the files to your `.obsidian/plugins/custom-selected-word-count` folder.
3. Enable the plugin in Obsidian.

---

## Getting Started

1. **Select text** in any view mode (Source, Live Preview, or Reading).
2. **View the word count** using either:
    - The ribbon button (if enabled)
    - The status bar count (if enabled)

![Basic usage showing text selection and count options](images/basic-usage-selection.png)
*Select text and choose how to view the word count*

![Word count modal showing the count result](images/basic-usage-modal.png)
*The word count modal displays the count and provides clipboard and history options*

---

## Features

### Accurate Word Counting

- Counts words in selected text across all view modes.
- Handles contractions, hyphenated words, numbers, and more.

### Path Exclusion

- Exclude file paths, URLs, and filenames with certain extensions from word counts.
- Customizable exclusion settings.

### UI Integration Options

- Ribbon button for quick access.
- Status bar integration with live updates.
- Command palette support.

![Ribbon button location and function](images/ui-ribbon-button.png)
*The ribbon button in the left sidebar opens the word count modal window*

![Status bar word count location and interaction](images/ui-status-bar.png)
*The status bar displays the current selection's word count and opens the modal when clicked*

![Command palette access option](images/ui-command-palette.png)
*Access the word count feature through Obsidian's command palette*

### History Tracking

- Keeps a history of your last 50 word counts.
- Copy previous counts to clipboard.
- Clear history with one click.

![Word count history modal with copy options](images/history-modal.png)
*The history modal shows your current and previous word counts with copy options*

### Advanced Regex Capabilities

- Define your own regex pattern for custom word detection.
- Interactive "Test Your Regex" area to experiment and see matches.
- Helper texts and reset options for safe experimentation.

![Advanced regex testing](images/regex-test-area.png)
*Test your custom regex patterns with live feedback*

---

## Settings

Access plugin settings via **Settings → Community Plugins → Custom Selected Word Count**.

![Overview of plugin settings showing main configuration sections](images/settings-overview.png)
*Plugin settings overview showing all available configuration sections*

### UI Elements

![UI Elements settings section showing access and display options](images/settings-ui-elements.png)
*Configure how you want to access and view the word count feature*

- **Show Ribbon Button:** Toggle ribbon button visibility.
- **Show Count in Status Bar:** Toggle status bar integration.
    - **Enable Live Updates:** Automatically update count on selection change.
    - **Hide Core Word Count:** Hide Obsidian's built-in word count.
    - **Status Bar Label:** Customize the label before the count.

### Path Exclusion

- Exclude file paths, URLs, and filenames with certain extensions from word counts.
- Customizable exclusion settings.

- **Exclude Paths from Word Count:** Enable/disable path exclusion.
    - **Exclude Windows Paths**
    - **Exclude UNC Paths**
    - **Exclude Unix Paths**
    - **Exclude Environment Paths**

### Advanced: Custom Word Detection Regex

![Advanced regex settings showing pattern customization and testing interface](images/regex-test-area.png)
*Test and refine custom word detection patterns with live feedback*

- **Enable Advanced Regex:** Allow custom regex for word detection.
- **Custom Regex Pattern:** Enter your own pattern.
- **Reset to Default Regex:** Revert to default pattern if needed.
- **Test Your Regex:** Try your pattern on sample text to see exactly which words are matched.
- **Reset Test:** Clear the test input box to try different text.

⚠️ Note: This is an advanced feature. Incorrect regex patterns may cause inaccurate counts or performance issues.

### Other Settings

- **Show Date/Time in History:** Include timestamps in history.
- **Enable Debug Logging:** For troubleshooting.

---

## Advanced Usage

### Custom Regex Patterns

- Use the advanced regex feature to tailor word detection to your needs.
- Example: Count only numbers, or only words longer than 5 letters.

### Example Use Cases

- Academic writing: Exclude references and file paths.
- Coding notes: Exclude code snippets and file names.
- Research: Track word count history for different sections.

---

## Troubleshooting & FAQ

**Q: The plugin isn't counting words as expected.**  
A: Check your exclusion and regex settings. Try resetting to defaults.

**Q: The status bar count isn't updating.**  
A: Ensure "Enable Live Updates" is turned on in settings.

**Q: How do I report a bug or request a feature?**  
A: Please open an issue on the [GitHub repository](https://github.com/banisterious/obsidian-custom-selected-word-count/issues).

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history.

---

## Support & Contact

For help, feature requests, or bug reports, visit the [GitHub issues page](https://github.com/banisterious/obsidian-custom-selected-word-count/issues).