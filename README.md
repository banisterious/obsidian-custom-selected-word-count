# Custom Selected Word Count for Obsidian

A plugin for [Obsidian](https://obsidian.md) that provides comprehensive text analysis for selected text across all view modes. Features advanced word counting, character counting, and sentence counting with customizable path exclusion, modern UI design, and detailed history tracking.

![Downloads](https://img.shields.io/badge/dynamic/json?label=Downloads&query=%24%5B%22custom-selected-word-count%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

## Plugin in Action

See the Custom Selected Word Count plugin in active use, demonstrating how it provides real-time feedback in your editor.

<p align="center">
  <img src="docs/images/demo.gif" alt="Animated demonstration of selecting text in Obsidian with an arrow pointing to the live word count update in the status bar" width="900">
</p>
<p align="center">
  <em>Selecting text automatically displays the word count in the status bar, with live updates as you adjust your selection.</em>
</p>

## Settings Overview

This animated overview showcases the various configuration options available within the Custom Selected Word Count plugin.

<p align="center">
  <img src="docs/images/settings.gif" alt="Animated overview of the Custom Selected Word Count plugin's configuration settings across five different screenshots" width="900">
</p>
<p align="center">
  <em>Explore the comprehensive settings, from basic display options to advanced exclusion rules.</em>
</p>

---

## Key Features

* **Comprehensive Text Analysis:** Advanced word, character (with configurable modes), and sentence counting with sophisticated detection.
* **Modern User Interface:** Card-based modal design, individual copy buttons, multi-metric history tracking, command palette, and optional status bar/ribbon integration.
* **Granular Exclusion Rules:** Fine-tune counting by excluding code, paths, comments, headings, specific words/phrases, and support for per-note overrides.
* **Customization & Extensibility:** Define custom word detection via regex for expert users and enjoy flexible, persistent settings.
* **Accurate Link Processing:** Ensures only visible text in Markdown links is counted.

---

## Installation

1.  Open Obsidian Settings
2.  Go to Community Plugins and disable Safe Mode
3.  Click Browse and search for "Custom Selected Word Count"
4.  Install the plugin
5.  Enable the plugin in your list of installed plugins

## Usage

1.  Select text in any view mode
2.  Access the text analysis:
    * Use the command palette and search for "Count Selected Words"
    * Click the ribbon button (if enabled)
    * Click the status bar count (if enabled)
    * View the real time word count in the status bar (if enabled)
3.  View comprehensive analysis in the modal:
    * Word count with advanced detection
    * Character count (if enabled in settings)
    * Sentence count (if enabled in settings)
    * Copy individual metrics to clipboard
    * View historical analysis data

---

## Detailed Configuration & Screenshots

For a comprehensive look at all of the plugin's settings and how they are presented, refer to the screenshots below:

| Screenshot | Description |
| :--------- | :---------- |
| <img src="docs/images/settings-01.png" alt="Screenshot of the Custom Selected Word Count plugin's settings interface, displaying Status bar and Modal configuration options" width="600"> | **Status bar:** Show count in status bar, Enable live updates, Hide core wordcount, Status bar label<br />**Modal**: Show character count, Character counting mode, show sentence count, Show date/time in history |
| <img src="docs/images/settings-02.png" alt="Screenshot of plugin settings for excluding code, code blocks, inline code, and various file path types" width="600"> | **Code:** Exclude code, Exclude code blocks, Exclude inline code<br />**Paths:**<br />Exclude paths from word count, Exclude Windows paths, Exclude Unix paths, Exclude UNC paths, Exclude environment paths |
| <img src="docs/images/settings-03.png" alt="Screenshot of plugin settings for excluding Obsidian and HTML comments, and various heading options" width="600"> | **Comments:** Exclude Obsidian comments, Exclude Obsidian comment content, Exclude HTML comments, Exclude HTML comment content<br />**Headings:** Exclude heading markers only, Exclude entire heading lines, Exclude heading sections |
| <img src="docs/images/settings-04.png" alt="Screenshot of plugin settings for excluding specific words and phrases, logging levels, and the start of custom word detection regex" width="600"> | **Words and phrases:** Exclude words, Exclude phrases<br />**Logging:** Enable debug logging, Logging level (not shown)<br />**Custom word detection regex** |
| <img src="docs/images/settings-05.png" alt="Screenshot of plugin settings continuing the custom word detection regex configuration" width="600"> | **Custom word detection regex** (continued) |

---

## Per-Note Exclusion Overrides

You can override global exclusion settings for individual notes using two methods:

### YAML Frontmatter Override

Add a `cswc-disable` property to your note's frontmatter:

```yaml
---
cswc-disable: [exclude-urls, exclude-comments]
---
```

Or disable all exclusions:

```yaml
---
cswc-disable: all
---
```

### Inline Comment Override

Use special comments to disable exclusions for specific sections:

```markdown
This text follows global exclusion rules.

<!-- cswc-disable -->
This section ignores all exclusions - URLs, paths, and comments are counted.
<!-- cswc-enable -->

Back to normal exclusion rules.
```

You can also use Obsidian comment syntax: `%% cswc-disable %%` and `%% cswc-enable %%`.

---

## Support My Work

If you find this plugin useful, please consider supporting its development!

<a href="[https://www.buymeacoffee.com/banisterious](https://www.buymeacoffee.com/banisterious)" target="_blank"><img src="[https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Documentation

For comprehensive documentation, visit the [Documentation Hub](docs/README.md) which includes:

-   **[Getting Started Guide](docs/user/guides/getting-started.md)** - Detailed usage instructions and examples
-   **[Settings Reference](docs/user/reference/settings-reference.md)** - Complete settings documentation
-   **[Word Counting Principles](docs/user/concepts/word-counting-principles.md)** - How the plugin counts words
-   **[Developer Documentation](docs/developer/architecture/overview.md)** - Technical specifications and architecture

<details>
<summary><h4>Exclusion Logic Details (Click to expand)</h4></summary>

The settings page now includes a detailed "Exclusion Logic Details" section. For each exclusion type (Windows Paths, UNC Paths, Unix Paths, Environment Variable Paths, File Extension Exclusion, `file:///` Protocol), you will see:

-   The regex pattern used
-   A plain-English explanation
-   Example matches and non-matches
-   A "Copy Regex" button for advanced users
-   All details are in a collapsible section for clarity

This makes it easy to understand what is being excluded and why.
</details>

---

## Support

If you encounter any issues or have a feature request, please create a [GitHub issue](https://github.com/yourusername/obsidian-selected-word-counter/issues).

<h2>Mobile Compatibility</h2>

This plugin is primarily developed and tested for Obsidian Desktop. While it may work on Obsidian Mobile, mobile support is currently untested. Some features—such as the ribbon button and status bar integration—are not available on mobile. If you use this plugin on mobile and encounter any issues or have suggestions, please report them on GitHub. Your feedback is appreciated and will help improve mobile compatibility in future updates.

<h2>License</h2>

[MIT License](LICENSE.md)
