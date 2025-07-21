// BUILD: 2025-05-07

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, parseYaml, setIcon } from 'obsidian';

// Remember to rename these classes and interfaces!

interface WordCountPluginSettings {
	setting: string;
	showDateTimeInHistory: boolean;
	history?: { count: number; date: string }[]; // Persisted as ISO strings
	exclusionList: string; // Comma-separated list of file extensions
	// Path exclusion settings
	excludePaths: boolean;           // Master toggle for path exclusion
	excludeWindowsPaths: boolean;    // Toggle for Windows paths (C:\)
	excludeUnixPaths: boolean;       // Toggle for Unix paths (/)
	excludeUNCPaths: boolean;        // Toggle for UNC paths (\\server)
	excludeEnvironmentPaths: boolean; // Toggle for environment variables (%PATH%, $HOME)
	// Status bar settings
	showStatusBar: boolean;          // Toggle for status bar visibility
	enableLiveCount: boolean;        // Toggle for live word count updates
	statusBarLabel: string;          // Custom label for status bar
	hideCoreWordCount: boolean;      // Toggle for hiding core word count
	// Character count settings
	showCharacterCount: boolean;     // Toggle for showing character count
	characterCountMode: 'all' | 'no-spaces' | 'letters-only'; // Character counting mode
	statusBarDisplayMode: 'words-only' | 'chars-only' | 'both'; // What to show in status bar
	// Sentence count settings
	showSentenceCount: boolean;      // Toggle for showing sentence count
	// Link exclusion settings
	excludeNonVisibleLinkPortions: boolean; // Toggle for excluding non-visible portions of links
	// Code exclusion settings
	excludeCode: boolean;            // Master toggle for code exclusion
	excludeCodeBlocks: boolean;      // Toggle for excluding code blocks
	excludeInlineCode: boolean;      // Toggle for excluding inline code
	// Comment exclusion settings
	excludeComments: boolean;        // Master toggle for comment exclusion
	excludeObsidianComments: boolean; // Toggle for Obsidian comments (%% %%)
	excludeObsidianCommentContent: boolean; // Toggle for Obsidian comment content
	excludeHtmlComments: boolean;    // Toggle for HTML comments (<!-- -->)
	excludeHtmlCommentContent: boolean; // Toggle for HTML comment content
	// Heading exclusion settings
	excludeHeadings: boolean;        // Master toggle for heading exclusion
	excludeHeadingMarkersOnly: boolean; // Toggle for excluding only markers
	excludeEntireHeadingLines: boolean; // Toggle for excluding entire lines
	excludeHeadingSections: string[]; // Array of specific heading sections to exclude
	// Words and phrases exclusion settings
	excludeWordsAndPhrases: boolean; // Master toggle for words/phrases exclusion
	excludedWords: string;           // Comma-separated list of words
	excludedPhrases: string[];       // Array of phrases to exclude

	enableDebugLogging: boolean;     // Toggle for debug logging
	// Advanced Regex
	enableAdvancedRegex?: boolean;   // Toggle for advanced regex (default: false)
	customWordRegex?: string;        // User-defined regex pattern
}

const DEFAULT_EXCLUSION_LIST = '.jpg, .jpeg, .png, .gif, .svg, .md, .pdf, .docx, .xlsx, .pptx, .zip, .mp3, .mp4, .wav, .ogg, .webm, .mov, .avi, .exe, .dll, .bat, .sh, .ps1, .js, .ts, .json, .csv, .yml, .yaml, .html, .css, .scss, .xml, .ini, .log, .tmp, .bak, .db, .sqlite, .7z, .rar, .tar, .gz, .bz2, .iso, .img, .bin, .apk, .app, .dmg, .pkg, .deb, .rpm, .msi, .sys, .dat, .sav, .bak, .old, .swp, .lock, .cache, .part, .crdownload, .torrent, .ics, .eml, .msg, .vcf, .txt';

const DEFAULT_WORD_REGEX = '[A-Za-z0-9]+(?:[\\u2018\\u2019\'-_][A-Za-z0-9]+)*';

const DEFAULT_SETTINGS: WordCountPluginSettings = {
	setting: 'default',
	showDateTimeInHistory: true,
	history: [],
	exclusionList: DEFAULT_EXCLUSION_LIST,
	// Path exclusion defaults
	excludePaths: false,           // Master toggle for path exclusion (disabled)
	excludeWindowsPaths: false,    // Disabled by default
	excludeUnixPaths: false,       // Disabled by default
	excludeUNCPaths: false,        // Disabled by default
	excludeEnvironmentPaths: false, // Disabled by default
	// Status bar defaults
	showStatusBar: false,            // Status bar hidden by default
	enableLiveCount: false,          // Live updates disabled by default
	statusBarLabel: 'Selected: ',    // Default label
	hideCoreWordCount: false,        // Don't hide core word count by default
	// Character count defaults
	showCharacterCount: false,       // Character count hidden by default
	characterCountMode: 'all',       // Count all characters by default
	statusBarDisplayMode: 'words-only', // Show only words in status bar by default
	// Sentence count defaults
	showSentenceCount: false,        // Sentence count hidden by default
	// Link exclusion defaults
	excludeNonVisibleLinkPortions: false, // Link exclusion disabled by default
	// Code exclusion defaults
	excludeCode: false,              // Code exclusion disabled by default
	excludeCodeBlocks: false,        // Code block exclusion disabled by default
	excludeInlineCode: false,        // Inline code exclusion disabled by default
	// Comment exclusion defaults
	excludeComments: false,          // Comment exclusion disabled by default
	excludeObsidianComments: false,  // Obsidian comment exclusion disabled by default
	excludeObsidianCommentContent: false, // Obsidian comment content exclusion disabled by default
	excludeHtmlComments: false,      // HTML comment exclusion disabled by default
	excludeHtmlCommentContent: false, // HTML comment content exclusion disabled by default
	// Heading exclusion defaults
	excludeHeadings: false,          // Heading exclusion disabled by default
	excludeHeadingMarkersOnly: false, // Markers-only exclusion disabled by default
	excludeEntireHeadingLines: false, // Entire lines exclusion disabled by default
	excludeHeadingSections: [],      // Empty heading sections list by default
	// Words and phrases exclusion defaults
	excludeWordsAndPhrases: false,   // Words/phrases exclusion disabled by default
	excludedWords: '',               // Empty word list by default
	excludedPhrases: [],             // Empty phrase list by default

	enableDebugLogging: false,       // Debug logging disabled by default
	// Advanced Regex
	enableAdvancedRegex: false,
	customWordRegex: '',
}

interface WordCountHistoryEntry {
	count: number;
	characterCount?: number;
	sentenceCount?: number;
	date: Date;
}

interface CountResult {
	words: number;
	characters: number;
	sentences: number;
}

function debugLog(plugin: CustomSelectedWordCountPlugin, message: string, ...args: any[]) {
	if (plugin.settings.enableDebugLogging) {
		console.log(`[Word Count Debug] ${message}`, ...args);
	}
}

/**
 * Gets the disabled exclusions from the frontmatter of the active file.
 * @param app The Obsidian app instance.
 * @returns Array of exclusion identifiers to disable, or empty array if none.
 */
function getDisabledExclusionsFromFrontmatter(app: App): string[] {
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		return [];
	}

	const cache = app.metadataCache.getFileCache(activeFile);
	if (!cache || !cache.frontmatter) {
		return [];
	}

	const cswcDisable = cache.frontmatter['cswc-disable'];
	if (!cswcDisable) {
		return [];
	}

	// Handle both array and single string formats
	let disabledItems: string[] = [];
	if (Array.isArray(cswcDisable)) {
		disabledItems = cswcDisable.filter(item => typeof item === 'string');
	} else if (typeof cswcDisable === 'string') {
		disabledItems = [cswcDisable];
	}

	// If "all" is present, return all possible exclusion identifiers
	if (disabledItems.includes('all')) {
		return [
			'exclude-windows-paths',
			'exclude-unix-paths',
			'exclude-unc-paths',
			'exclude-environment-paths',
			'exclude-urls',
			'exclude-code-blocks',
			'exclude-inline-code',
			'exclude-comments',
			'exclude-headings',
			'exclude-specific-headings',
			'exclude-words-phrases'
		];
	}

	return disabledItems;
}

/**
 * Processes text with inline override sections marked by comments.
 * @param text The text to process.
 * @param processFunc Function to apply to non-override sections.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text.
 */
function processTextWithOverrides(
	text: string,
	processFunc: (text: string) => string,
	plugin?: CustomSelectedWordCountPlugin
): string {
	// Combined regex to match both HTML and Obsidian style comments with cswc-disable or cswc-enable
	const markerRegex = /(?:<!--\s*cswc-(disable|enable)\s*-->|%%\s*cswc-(disable|enable)\s*%%)/gi;
	
	let result = '';
	let lastIndex = 0;
	let inOverrideSection = false;
	let match;
	
	// Reset regex state
	markerRegex.lastIndex = 0;
	
	while ((match = markerRegex.exec(text)) !== null) {
		const marker = match[1] || match[2]; // Get 'disable' or 'enable'
		const beforeMatch = text.substring(lastIndex, match.index);
		
		if (inOverrideSection) {
			// In override section - add text as-is
			result += beforeMatch;
		} else {
			// Not in override section - apply processing
			result += processFunc(beforeMatch);
		}
		
		// Toggle override state
		if (marker === 'disable' && !inOverrideSection) {
			inOverrideSection = true;
			if (plugin) debugLog(plugin, 'Entering override section at position:', match.index);
		} else if (marker === 'enable' && inOverrideSection) {
			inOverrideSection = false;
			if (plugin) debugLog(plugin, 'Exiting override section at position:', match.index);
		}
		
		lastIndex = match.index + match[0].length;
	}
	
	// Process remaining text
	const remainingText = text.substring(lastIndex);
	if (inOverrideSection) {
		result += remainingText;
		if (plugin) debugLog(plugin, 'Override section extends to end of text');
	} else {
		result += processFunc(remainingText);
	}
	
	return result;
}

/**
 * Processes code blocks (```) in text according to settings.
 * @param text The text to process.
 * @param excludeCodeBlocks Whether to exclude code blocks.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with code blocks removed if enabled.
 */
function processCodeBlocks(
	text: string,
	excludeCodeBlocks: boolean,
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeCodeBlocks) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing code blocks');

	// Remove code blocks (both ``` and ~~~)
	return text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
}

/**
 * Processes inline code (`) in text according to settings.
 * @param text The text to process.
 * @param excludeInlineCode Whether to exclude inline code.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with inline code removed if enabled.
 */
function processInlineCode(
	text: string,
	excludeInlineCode: boolean,
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeInlineCode) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing inline code');

	// Remove inline code (single backticks, but not within code blocks)
	// This regex handles escaped backticks and ensures we match paired backticks
	return text.replace(/`(?:[^`\\]|\\.)*`/g, '');
}

/**
 * Processes Obsidian comments (%% %%) in text according to settings.
 * @param text The text to process.
 * @param excludeComments Whether to exclude comments at all.
 * @param excludeContent Whether to exclude the content inside comments.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with comments handled according to settings.
 */
function processObsidianComments(
	text: string,
	excludeComments: boolean,
	excludeContent: boolean,
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeComments) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing Obsidian comments, exclude content:', excludeContent);

	if (excludeContent) {
		// Remove entire comments including content
		return text.replace(/%%[\s\S]*?%%/g, '');
	} else {
		// Remove only comment markers, keep content
		return text.replace(/%%/g, '');
	}
}

/**
 * Processes HTML comments (<!-- -->) in text according to settings.
 * @param text The text to process.
 * @param excludeComments Whether to exclude comments at all.
 * @param excludeContent Whether to exclude the content inside comments.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with comments handled according to settings.
 */
function processHtmlComments(
	text: string,
	excludeComments: boolean,
	excludeContent: boolean,
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeComments) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing HTML comments, exclude content:', excludeContent);

	if (excludeContent) {
		// Remove entire comments including content
		return text.replace(/<!--[\s\S]*?-->/g, '');
	} else {
		// Remove only comment markers, keep content
		return text.replace(/<!--/g, '').replace(/-->/g, '');
	}
}

/**
 * Processes markdown links to exclude non-visible portions according to settings.
 * @param text The text to process.
 * @param excludeNonVisible Whether to exclude non-visible portions of links.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with links handled according to settings.
 */
function processLinks(
	text: string,
	excludeNonVisible: boolean,
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeNonVisible) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing links, exclude non-visible portions:', excludeNonVisible);

	let processedText = text;

	// Process internal links with aliases: [[Note Name|Alias]] -> Alias
	processedText = processedText.replace(/\[\[([^\|\]]+)\|([^\]]+)\]\]/g, '$2');
	
	// Process internal links without aliases: [[Note Name]] -> Note Name
	processedText = processedText.replace(/\[\[([^\]]+)\]\]/g, '$1');
	
	// Process external links: [link text](url) -> link text
	processedText = processedText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

	if (plugin) debugLog(plugin, 'Text after link processing:', processedText);

	return processedText;
}

/**
 * Processes headings in text according to settings.
 * @param text The text to process.
 * @param excludeHeadings Whether to exclude headings at all.
 * @param excludeMarkersOnly Whether to exclude only the heading markers.
 * @param excludeEntireLines Whether to exclude entire heading lines.
 * @param excludeHeadingSections Array of specific heading sections to exclude.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with headings handled according to settings.
 */
function processHeadings(
	text: string,
	excludeHeadings: boolean,
	excludeMarkersOnly: boolean,
	excludeEntireLines: boolean,
	excludeHeadingSections: string[],
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeHeadings) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing headings, markers only:', excludeMarkersOnly, 'entire lines:', excludeEntireLines, 'specific sections:', excludeHeadingSections);

	let processedText = text;

	// First, handle selective heading section exclusion
	if (excludeHeadingSections && excludeHeadingSections.length > 0) {
		processedText = processSelectiveHeadingSections(text, excludeHeadingSections, plugin);
	}
	
	// Then apply other heading processing modes
	if (excludeEntireLines) {
		// Remove entire heading lines (both ATX and Setext)
		// ATX headings: # ## ### etc.
		processedText = processedText.replace(/^#{1,6}\s+.*$/gm, '');
		// Setext headings: underlined with = or -
		processedText = processedText.replace(/^.+\n[=-]+\s*$/gm, '');
	} else if (excludeMarkersOnly) {
		// Remove only the heading markers, keep the text
		// ATX headings: remove # symbols and leading space
		processedText = processedText.replace(/^#{1,6}\s+/gm, '');
		// Setext headings: remove the underline, keep the heading text
		processedText = processedText.replace(/^(.+)\n[=-]+\s*$/gm, '$1');
	}

	if (plugin) debugLog(plugin, 'Text after heading processing:', processedText);

	return processedText;
}

/**
 * Processes selective heading sections by removing only specifically excluded headings and their content.
 * @param selectedText The selected text to process.
 * @param excludeHeadingSections Array of specific headings to exclude (e.g., ["## My Section", "# Important Chapter"]).
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with specified heading sections removed.
 */
function processSelectiveHeadingSections(
	selectedText: string,
	excludeHeadingSections: string[],
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (plugin) debugLog(plugin, 'Processing selective heading sections for:', excludeHeadingSections);

	// Split the selected text into lines for processing
	const lines = selectedText.split('\n');
	const processedLines: string[] = [];
	let skipUntilNextHeading = false;
	let currentSkippingHeadingLevel = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

		if (headingMatch) {
			// This is a heading line
			const headingLevel = headingMatch[1].length;
			const headingText = headingMatch[2].trim();
			const fullHeading = line.trim(); // Full heading including markers
			
			// Check if this heading should be excluded
			const shouldExclude = excludeHeadingSections.some(excludedHeading => 
				excludedHeading.toLowerCase() === fullHeading.toLowerCase()
			);

			if (shouldExclude) {
				// Start skipping this heading and its content
				skipUntilNextHeading = true;
				currentSkippingHeadingLevel = headingLevel;
				if (plugin) debugLog(plugin, `Excluding heading section: ${fullHeading}`);
				continue; // Skip this heading line
			} else if (skipUntilNextHeading) {
				// We're currently skipping content, check if this heading ends the section
				if (headingLevel <= currentSkippingHeadingLevel) {
					// This is a same or higher level heading, stop skipping
					skipUntilNextHeading = false;
					currentSkippingHeadingLevel = 0;
					if (plugin) debugLog(plugin, `Ending exclusion at heading: ${fullHeading}`);
				} else {
					// This is a subsection of the excluded heading, continue skipping
					if (plugin) debugLog(plugin, `Skipping subsection: ${fullHeading}`);
					continue;
				}
			}

			// If we reach here, this heading should be kept
			if (!skipUntilNextHeading) {
				processedLines.push(line);
			}
		} else {
			// This is not a heading line
			if (!skipUntilNextHeading) {
				// Keep this line
				processedLines.push(line);
			} else {
				// We're skipping content under an excluded heading
				if (plugin) debugLog(plugin, 'Skipping content line:', line);
			}
		}
	}

	const result = processedLines.join('\n');
	if (plugin) debugLog(plugin, 'Text after selective heading sections processing:', result);
	return result;
}

/**
 * Processes words and phrases exclusion in text according to settings.
 * @param text The text to process.
 * @param excludeWordsAndPhrases Whether to exclude words and phrases at all.
 * @param excludedWords Comma-separated list of words to exclude.
 * @param excludedPhrases Array of phrases to exclude.
 * @param plugin The plugin instance for debug logging.
 * @returns The processed text with words and phrases excluded according to settings.
 */
function processWordsAndPhrases(
	text: string,
	excludeWordsAndPhrases: boolean,
	excludedWords: string,
	excludedPhrases: string[],
	plugin?: CustomSelectedWordCountPlugin
): string {
	if (!excludeWordsAndPhrases) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing words and phrases exclusion');

	let processedText = text;

	// Process excluded phrases first (case-insensitive)
	if (excludedPhrases && excludedPhrases.length > 0) {
		excludedPhrases.forEach(phrase => {
			if (phrase.trim()) {
				// Create case-insensitive regex for the phrase
				const phraseRegex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
				processedText = processedText.replace(phraseRegex, '');
				if (plugin) debugLog(plugin, 'Excluded phrase:', phrase);
			}
		});
	}

	// Process excluded words (case-insensitive, whole words only)
	if (excludedWords && excludedWords.trim()) {
		const words = excludedWords.split(',').map(w => w.trim()).filter(w => w);
		words.forEach(word => {
			if (word) {
				// Create case-insensitive regex for whole word matching
				const wordRegex = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
				processedText = processedText.replace(wordRegex, '');
				if (plugin) debugLog(plugin, 'Excluded word:', word);
			}
		});
	}

	if (plugin) debugLog(plugin, 'Text after words and phrases processing:', processedText);

	return processedText;
}

/**
 * Counts characters in the selected text according to the plugin specification.
 * @param selectedText The text to analyze.
 * @param mode Character counting mode: 'all', 'no-spaces', or 'letters-only'.
 * @param settings The plugin settings.
 * @param plugin The plugin instance for debug logging.
 * @param disabledExclusions Array of exclusion identifiers to disable for this count.
 * @returns The character count as an integer.
 */
function countSelectedCharacters(
	selectedText: string,
	mode: 'all' | 'no-spaces' | 'letters-only' = 'all',
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin,
	disabledExclusions: string[] = []
): number {
	if (!selectedText) return 0;
	
	if (plugin) debugLog(plugin, 'Counting characters in mode:', mode);
	
	// Helper function to check if exclusion is disabled
	const isExclusionDisabled = (exclusionId: string): boolean => {
		return disabledExclusions.includes(exclusionId);
	};
	
	// First, handle inline override sections
	let processedText = processTextWithOverrides(selectedText, (text) => {
		let result = text;
		
		// Process code blocks first (before inline code)
		if (settings?.excludeCode && settings?.excludeCodeBlocks && !isExclusionDisabled('exclude-code-blocks')) {
			result = processCodeBlocks(
				result,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after code block processing (char count):', result);
		}
		
		// Process inline code after code blocks
		if (settings?.excludeCode && settings?.excludeInlineCode && !isExclusionDisabled('exclude-inline-code')) {
			result = processInlineCode(
				result,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after inline code processing (char count):', result);
		}
		
		// Process comments before character counting
		if (settings?.excludeComments && !isExclusionDisabled('exclude-comments')) {
			// Process Obsidian comments
			if (settings.excludeObsidianComments) {
				result = processObsidianComments(
					result,
					true,
					settings.excludeObsidianCommentContent,
					plugin
				);
			}
			
			// Process HTML comments
			if (settings.excludeHtmlComments) {
				result = processHtmlComments(
					result,
					true,
					settings.excludeHtmlCommentContent,
					plugin
				);
			}
			
			if (plugin) debugLog(plugin, 'Text after comment processing (char count):', result);
		}
		
		// Process links after comments but before character counting
		if (settings?.excludeNonVisibleLinkPortions && !isExclusionDisabled('exclude-urls')) {
			result = processLinks(
				result,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after link processing (char count):', result);
		}
		
		// Process headings after links but before character counting
		if (settings?.excludeHeadings && !isExclusionDisabled('exclude-headings')) {
			result = processHeadings(
				result,
				true,
				settings.excludeHeadingMarkersOnly,
				settings.excludeEntireHeadingLines,
				settings.excludeHeadingSections,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after heading processing (char count):', result);
		}
		
		// Process words and phrases after headings but before character counting
		if (settings?.excludeWordsAndPhrases && !isExclusionDisabled('exclude-words-phrases')) {
			result = processWordsAndPhrases(
				result,
				true,
				settings.excludedWords,
				settings.excludedPhrases,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after words/phrases processing (char count):', result);
		}
		
		return result;
	}, plugin);
	
	switch (mode) {
		case 'all':
			// Count all characters including spaces and punctuation
			return processedText.length;
		case 'no-spaces':
			// Count all characters except whitespace
			processedText = processedText.replace(/\s/g, '');
			return processedText.length;
		case 'letters-only':
			// Count only letters (alphabetic characters)
			const matches = processedText.match(/[A-Za-z]/g);
			return matches ? matches.length : 0;
		default:
			return processedText.length;
	}
}

/**
 * Counts sentences in the selected text using advanced sentence detection.
 * @param selectedText The text to analyze.
 * @param settings The plugin settings.
 * @param plugin The plugin instance for debug logging.
 * @param disabledExclusions Array of exclusion identifiers to disable for this count.
 * @returns The sentence count as an integer.
 */
function countSelectedSentences(
	selectedText: string,
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin,
	disabledExclusions: string[] = []
): number {
	if (!selectedText) return 0;
	
	if (plugin) debugLog(plugin, 'Counting sentences in text:', selectedText);
	
	// Helper function to check if exclusion is disabled
	const isExclusionDisabled = (exclusionId: string): boolean => {
		return disabledExclusions.includes(exclusionId);
	};
	
	// First, handle inline override sections
	let processedText = processTextWithOverrides(selectedText, (text) => {
		let result = text;
		
		// Process code blocks first (before inline code)
		if (settings?.excludeCode && settings?.excludeCodeBlocks && !isExclusionDisabled('exclude-code-blocks')) {
			result = processCodeBlocks(
				result,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after code block processing (sentence count):', result);
		}
		
		// Process inline code after code blocks
		if (settings?.excludeCode && settings?.excludeInlineCode && !isExclusionDisabled('exclude-inline-code')) {
			result = processInlineCode(
				result,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after inline code processing (sentence count):', result);
		}
		
		// Process comments before sentence counting
		if (settings?.excludeComments && !isExclusionDisabled('exclude-comments')) {
			// Process Obsidian comments
			if (settings.excludeObsidianComments) {
				result = processObsidianComments(
					result,
					true,
					settings.excludeObsidianCommentContent,
					plugin
				);
			}
			
			// Process HTML comments
			if (settings.excludeHtmlComments) {
				result = processHtmlComments(
					result,
					true,
					settings.excludeHtmlCommentContent,
					plugin
				);
			}
			
			if (plugin) debugLog(plugin, 'Text after comment processing (sentence count):', result);
		}
		
		// Process links after comments but before sentence counting
		if (settings?.excludeNonVisibleLinkPortions && !isExclusionDisabled('exclude-urls')) {
			result = processLinks(
				result,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after link processing (sentence count):', result);
		}
		
		// Process headings after links but before sentence counting
		if (settings?.excludeHeadings && !isExclusionDisabled('exclude-headings')) {
			result = processHeadings(
				result,
				true,
				settings.excludeHeadingMarkersOnly,
				settings.excludeEntireHeadingLines,
				settings.excludeHeadingSections,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after heading processing (sentence count):', result);
		}
		
		// Process words and phrases after headings but before sentence counting
		if (settings?.excludeWordsAndPhrases && !isExclusionDisabled('exclude-words-phrases')) {
			result = processWordsAndPhrases(
				result,
				true,
				settings.excludedWords,
				settings.excludedPhrases,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after words/phrases processing (sentence count):', result);
		}
		
		return result;
	}, plugin);
	
	// Remove code blocks and inline code first
	processedText = processedText.replace(/```[\s\S]*?```/g, ' ');
	processedText = processedText.replace(/`[^`]*`/g, ' ');
	
	// Remove markdown headers
	processedText = processedText.replace(/^#{1,6}\s+.*$/gm, ' ');
	
	// Remove URLs and file paths to avoid counting periods in them
	processedText = processedText.replace(/https?:\/\/[^\s]+/g, ' ');
	processedText = processedText.replace(/[a-zA-Z]:[\\\/][^\s]+/g, ' ');
	
	// Advanced sentence boundary detection
	// This regex handles:
	// - Standard sentence endings: . ! ?
	// - Abbreviations (Mr. Dr. etc.) - won't count as sentence endings
	// - Decimal numbers (3.14) - won't count as sentence endings
	// - Multiple punctuation (?! ... etc.)
	// - Quotation marks after punctuation
	const sentenceRegex = /[.!?]+(?:\s*["'])?(?:\s+|$)/g;
	
	// However, we need to exclude some false positives:
	// - Decimal numbers (e.g., "3.14")
	// - Common abbreviations
	// - File extensions
	// - Ellipsis as single sentence
	
	const sentences: string[] = [];
	const parts = processedText.split(sentenceRegex);
	
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i].trim();
		if (!part) continue;
		
		// Skip if this looks like it ends with an abbreviation
		if (/\b(?:Mr|Mrs|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd|Corp|Co|St|Ave|Blvd|Rd|Dept|Univ|govt|admin|info|tech|dev|org|com|net|edu|gov|mil|int|biz|name|pro|museum|coop|aero|jobs|mobi|travel|xxx|tel|cat|asia|post|xxx|tel|mil|museum|name|pro|travel|xxx|tel)\./i.test(part)) {
			continue;
		}
		
		// Skip if this looks like a decimal number
		if (/\d+\.\d*$/.test(part.trim())) {
			continue;
		}
		
		// Skip if this looks like a file extension or version number
		if (/\w+\.\w+$/.test(part.trim()) && part.trim().length < 20) {
			continue;
		}
		
		// Must have at least some letters to be a real sentence
		if (/[a-zA-Z]/.test(part)) {
			sentences.push(part);
		}
	}
	
	const count = Math.max(0, sentences.length);
	
	if (plugin) debugLog(plugin, 'Sentence count result:', count, 'Sentences found:', sentences);
	
	return count;
}

/**
 * Counts both words and characters in the selected text according to the plugin specification.
 * @param selectedText The text to analyze.
 * @param excludedExtensions Array of file extensions to exclude (e.g., ['.jpg', '.png']).
 * @param stripEmojis Whether to strip emojis from the count (default: true).
 * @param settings The plugin settings.
 * @param plugin The plugin instance.
 * @param disabledExclusions Array of exclusion identifiers to disable for this count.
 * @returns Object containing both word and character counts.
 */
function countSelectedText(
	selectedText: string,
	excludedExtensions: string[] = [],
	stripEmojis: boolean = true,
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin,
	disabledExclusions: string[] = []
): CountResult {
	if (!selectedText) return { words: 0, characters: 0, sentences: 0 };

	// Count characters from the original text first
	const characterCount = countSelectedCharacters(
		selectedText, 
		settings?.characterCountMode || 'all',
		settings,
		plugin,
		disabledExclusions
	);

	// Count sentences from the original text
	const sentenceCount = countSelectedSentences(
		selectedText,
		settings,
		plugin,
		disabledExclusions
	);

	// Now perform word counting (keeping existing logic)
	const wordCount = countSelectedWords(
		selectedText,
		excludedExtensions,
		stripEmojis,
		settings,
		plugin,
		disabledExclusions
	);

	return { words: wordCount, characters: characterCount, sentences: sentenceCount };
}

/**
 * Counts words in the selected text according to the plugin specification.
 * @param selectedText The text to analyze.
 * @param excludedExtensions Array of file extensions to exclude (e.g., ['.jpg', '.png']).
 * @param stripEmojis Whether to strip emojis from the count (default: true).
 * @param settings The plugin settings.
 * @param plugin The plugin instance.
 * @param disabledExclusions Array of exclusion identifiers to disable for this count.
 * @returns The word count as an integer.
 */
function countSelectedWords(
	selectedText: string,
	excludedExtensions: string[] = [],
	stripEmojis: boolean = true,
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin,
	disabledExclusions: string[] = []
): number {
	if (!selectedText) return 0;

	// Debug logging
	if (plugin) debugLog(plugin, 'Initial text:', selectedText);

	// Helper function to check if exclusion is disabled
	const isExclusionDisabled = (exclusionId: string): boolean => {
		return disabledExclusions.includes(exclusionId);
	};

	// First, handle inline override sections
	selectedText = processTextWithOverrides(selectedText, (text) => {
		let processedText = text;

		// Process code blocks first (before inline code)
		if (settings?.excludeCode && settings?.excludeCodeBlocks && !isExclusionDisabled('exclude-code-blocks')) {
			processedText = processCodeBlocks(
				processedText,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after code block processing:', processedText);
		}
		
		// Process inline code after code blocks
		if (settings?.excludeCode && settings?.excludeInlineCode && !isExclusionDisabled('exclude-inline-code')) {
			processedText = processInlineCode(
				processedText,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after inline code processing:', processedText);
		}

		// Process comments before any other text processing
		if (settings?.excludeComments && !isExclusionDisabled('exclude-comments')) {
			// Process Obsidian comments
			if (settings.excludeObsidianComments) {
				processedText = processObsidianComments(
					processedText,
					true,
					settings.excludeObsidianCommentContent,
					plugin
				);
			}
			
			// Process HTML comments
			if (settings.excludeHtmlComments) {
				processedText = processHtmlComments(
					processedText,
					true,
					settings.excludeHtmlCommentContent,
					plugin
				);
			}
			
			if (plugin) debugLog(plugin, 'Text after comment processing:', processedText);
		}

		// Process links after comments but before other text processing
		if (settings?.excludeNonVisibleLinkPortions && !isExclusionDisabled('exclude-urls')) {
			processedText = processLinks(
				processedText,
				true,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after link processing:', processedText);
		}
		
		// Process headings after links but before other text processing
		if (settings?.excludeHeadings && !isExclusionDisabled('exclude-headings')) {
			processedText = processHeadings(
				processedText,
				true,
				settings.excludeHeadingMarkersOnly,
				settings.excludeEntireHeadingLines,
				settings.excludeHeadingSections,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after heading processing:', processedText);
		}
		
		// Process words and phrases after headings but before other text processing
		if (settings?.excludeWordsAndPhrases && !isExclusionDisabled('exclude-words-phrases')) {
			processedText = processWordsAndPhrases(
				processedText,
				true,
				settings.excludedWords,
				settings.excludedPhrases,
				plugin
			);
			
			if (plugin) debugLog(plugin, 'Text after words/phrases processing:', processedText);
		}
		
		return processedText;
	}, plugin);

	// Function to normalize path separators
	const normalizePath = (str: string): string => {
		return str.replace(/[\/\\]+/g, '/');
	};

	// Function to check if a string looks like a path
	const looksLikePath = (str: string): boolean => {
		if (!settings?.excludePaths) return false;

		// Debug logging
		if (plugin) debugLog(plugin, 'Checking path:', str);

		// Check each path type with its original format
		// Windows drive letter paths (C:\ or C:/)
		if (/^[A-Za-z]:[\/\\]/.test(str)) {
			if (settings.excludeWindowsPaths && !isExclusionDisabled('exclude-windows-paths')) {
				if (plugin) debugLog(plugin, 'Matched Windows drive path');
				return true;
			}
			if (plugin) debugLog(plugin, 'Windows path detected but exclusion disabled');
			return false;
		}

		// Environment variables - check original string
		if (/^(?:%[^%]+%|\$[A-Za-z_][A-Za-z0-9_]*)/.test(str)) {
			// Check if this is a Windows path with an environment variable
			if (/^%[^%]+%[\/\\]/.test(str)) {
				if (settings.excludeWindowsPaths && !isExclusionDisabled('exclude-windows-paths')) {
					if (plugin) debugLog(plugin, 'Matched Windows path with environment variable');
					return true;
				}
				if (plugin) debugLog(plugin, 'Windows path with environment variable detected but exclusion disabled');
				return false;
			}
			
			if (settings.excludeEnvironmentPaths && !isExclusionDisabled('exclude-environment-paths')) {
				if (plugin) debugLog(plugin, 'Matched environment variable');
				return true;
			}
			if (plugin) debugLog(plugin, 'Environment variable detected but exclusion disabled');
			return false;
		}

		// UNC paths (\\server\share) - check original string
		if (/^\\\\[^\\]+\\[^\\]+/.test(str)) {
			if (settings.excludeUNCPaths && !isExclusionDisabled('exclude-unc-paths')) {
				if (plugin) debugLog(plugin, 'Matched UNC path');
				return true;
			}
			if (plugin) debugLog(plugin, 'UNC path detected but exclusion disabled');
			return false;
		}

		// Now normalize for other checks
		const normalizedStr = normalizePath(str);

		// file:/// protocol
		if (/^file:\/\/\//.test(normalizedStr)) {
			if (plugin) debugLog(plugin, 'Matched file:/// protocol');
			return true;
		}

		// Unix paths (/usr/local)
		if (/^\/[^\/]/.test(normalizedStr)) {
			if (settings.excludeUnixPaths && !isExclusionDisabled('exclude-unix-paths')) {
				if (plugin) debugLog(plugin, 'Matched Unix path');
				return true;
			}
			if (plugin) debugLog(plugin, 'Unix path detected but exclusion disabled');
			return false;
		}

		return false;
	};

	// Function to check if a string ends with any of the excluded extensions
	const hasExcludedExtension = (str: string): boolean => {
		if (!excludedExtensions.length) return false;
		
		// Don't treat decimal numbers as having extensions
		if (/^\d+\.\d+$/.test(str)) {
			return false;
		}
		
		str = str.toLowerCase();  // normalize to lowercase
		const filename = str.split(/[\/\\]/).pop() || '';
		
		if (!filename.includes('.')) {
			return false;
		}

		const result = excludedExtensions.some(ext => {
			const pattern = new RegExp('\\.' + ext.replace(/^\./, '') + '$', 'i');
			return pattern.test(filename);
		});
		
		return result;
	};

	// First handle file:/// protocol paths
	if (settings?.excludePaths) {
		const fileProtocolPattern = /file:\/\/\/[^\s]+/g;
		selectedText = selectedText.replace(fileProtocolPattern, ' ');
	}

	// Split text into segments while preserving decimal numbers and handling paths
	const segments: string[] = [];
	let buffer = '';
	let inPath = false;

	// Split into words but preserve decimal points in numbers
	const rawSegments = selectedText.split(/\s+/);
	if (plugin) debugLog(plugin, 'Raw segments:', rawSegments);

	for (let i = 0; i < rawSegments.length; i++) {
		const segment = rawSegments[i];
		if (!segment) continue;

		// Check if this segment is a decimal number
		if (/^\d+\.\d+$/.test(segment)) {
			segments.push(segment);
			continue;
		}

		// Check if this segment starts a path
		const isPathStart = looksLikePath(segment);
		
		if (settings?.excludePaths && isPathStart) {
			inPath = true;
			buffer = segment;
		}
		// Check if this segment continues a path
		else if (inPath) {
			buffer += ' ' + segment;
			// Check if the complete buffer is a path after each addition
			const isValidPath = looksLikePath(buffer);
			
			if (isValidPath) {
				if (plugin) debugLog(plugin, 'Path continues with:', segment);
			} else {
				if (plugin) debugLog(plugin, 'Path continuation check failed, reverting');
				segments.push(...buffer.split(/\s+/));
				inPath = false;
				buffer = '';
			}
		}
		// Normal word (not part of a path)
		else {
			segments.push(segment);
		}
	}

	// Handle any remaining buffer
	if (buffer) {
		const isValidPath = looksLikePath(buffer);
		
		if (inPath && isValidPath) {
			if (plugin) debugLog(plugin, 'Excluding final path:', buffer);
		} else {
			segments.push(...buffer.split(/\s+/));
		}
	}

	if (plugin) debugLog(plugin, 'Processed segments:', segments);

	// Filter out paths and handle extensions
	const filteredWords = segments.filter(word => {
		if (!word.trim()) return false;
		
		// Always keep decimal numbers
		if (/^\d+\.\d+$/.test(word)) return true;
		
		if (hasExcludedExtension(word)) return false;
		if (settings?.excludePaths && looksLikePath(word)) return false;

		return true;
	});

	if (plugin) debugLog(plugin, 'Filtered words:', filteredWords);
	selectedText = filteredWords.join(' ');

	// Strip double quotes only (preserve all apostrophes for contractions) and emojis
	selectedText = selectedText.replace(/["""]/g, '');
	if (stripEmojis) {
		selectedText = selectedText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
	}

	// Use advanced regex if enabled and valid
	let wordRegex: RegExp;
	if (settings?.enableAdvancedRegex && settings.customWordRegex && settings.customWordRegex.trim()) {
		try {
			wordRegex = new RegExp(settings.customWordRegex, 'giu');
		} catch (e) {
			if (plugin) debugLog(plugin, 'Invalid custom regex, falling back to default:', e);
			wordRegex = /[A-Za-z0-9]+(?:[\u2018\u2019'-_][A-Za-z0-9]+)*/giu;
		}
	} else {
		wordRegex = /[A-Za-z0-9]+(?:[\u2018\u2019'-_][A-Za-z0-9]+)*/giu;
	}

	if (plugin) debugLog(plugin, 'Final text before regex matching:', selectedText);
	if (plugin) debugLog(plugin, 'Using word regex pattern:', wordRegex.source);

	// Test for smart quotes specifically
	if (plugin && /[\u2018\u2019']/.test(selectedText)) {
		debugLog(plugin, 'Smart quotes detected in text');
		// Show the exact characters and their Unicode values
		const smartQuoteMatches = selectedText.match(/[\u2018\u2019']/g);
		if (smartQuoteMatches) {
			debugLog(plugin, 'Smart quote characters found:', smartQuoteMatches.map(char => 
				`'${char}' (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`
			));
		}
	}

	// At the end, use wordRegex to match words
	const matches = selectedText.match(wordRegex);
	if (plugin) debugLog(plugin, 'Regex matches found:', matches);
	return matches ? matches.length : 0;
}

// Helper function to format date as yyyy-mm-dd HH:MM:SS
function formatDateISO(date: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default class CustomSelectedWordCountPlugin extends Plugin {
	settings: WordCountPluginSettings;
	history: WordCountHistoryEntry[] = [];
	public statusBarItem: HTMLElement | null = null;
	public debounceTimer: NodeJS.Timeout | null = null;
	public canvasPollingTimer: NodeJS.Timeout | null = null;
	private lastCanvasSelection: string = '';
	private ribbonButton: HTMLElement | null = null;

	async onload() {
		await this.loadSettings();



		// Add necessary classes based on settings
		this.updateClasses();

		// Add status bar item if enabled
		if (this.settings.showStatusBar) {
			this.setupStatusBar();
		}

		// Apply core word count hiding if enabled
		this.addCoreWordCountStyle();



		// Add the command
		this.addCommand({
			id: 'count-selected-words',
			name: 'Count Selected Words',
			callback: async () => {
				await this.handleWordCount();
			}
		});

		// Register context menu for phrase and heading exclusion
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				const cursor = editor.getCursor();
				
				// Add heading section exclusion option if enabled and cursor is on a heading
				if (this.settings.excludeHeadings && this.settings.excludeHeadingSections) {
					const headingAtCursor = this.getHeadingAtCursor(editor, cursor);
					if (headingAtCursor) {
						menu.addItem((item) => {
							item
								.setTitle('Exclude heading section from word count')
								.setIcon('heading')
								.onClick(async () => {
									await this.addExcludedHeading(headingAtCursor);
								});
						});
					}
				}

				// Add phrase exclusion option if enabled and text is selected
				if (this.settings.excludeWordsAndPhrases) {
					const selectedText = editor.getSelection();
					if (selectedText && selectedText.trim()) {
						menu.addItem((item) => {
							item
								.setTitle('Exclude phrase from word count')
								.setIcon('minus-circle')
								.onClick(async () => {
									await this.addExcludedPhrase(selectedText.trim());
								});
						});
					}
				}
			})
		);

		// Register the settings tab
		this.addSettingTab(new WordCountSettingTab(this.app, this));
	}

	private updateClasses() {
		// All styling is now handled directly by individual methods:
		// - Status bar visibility: handled in setupStatusBar()
		// - Core word count hiding: handled in addCoreWordCountStyle()
		// - Live updates indicator: handled in updateStatusBar()
		// - Path exclusion: handled in word counting logic, no UI styling needed
	}

	public setupStatusBar() {
		this.log('Setting up status bar - showStatusBar:', this.settings.showStatusBar, 'enableLiveCount:', this.settings.enableLiveCount);
		
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
		
		if (!this.settings.showStatusBar) {
			this.statusBarItem = null;
			this.log('Status bar disabled in settings');
			return;
		}
		
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('plugin-word-count');
		this.log('Status bar item created and added');
		
		if (this.settings.hideCoreWordCount) {
			this.statusBarItem.addClass('hide-core-count');
		}
		
		this.statusBarItem.addEventListener('click', () => {
			this.log('Status bar clicked - cached Canvas selection:', this.lastCanvasSelection?.length || 0, 'chars');
			this.handleWordCount();
		});

		// Register for selection changes if live updates are enabled
		if (this.settings.enableLiveCount) {
			// Remove any existing listener first
			document.removeEventListener('selectionchange', this.handleSelectionChange);
			// Add the new listener
			document.addEventListener('selectionchange', this.handleSelectionChange);
			this.log('Selection change listener registered for live updates');
			
			// Start Canvas polling for iframe selection detection
			this.startCanvasPolling();
		} else {
			this.log('Live updates disabled, no selection listener added');
			this.stopCanvasPolling();
		}

		// Initial update of the status bar
		this.log('Performing initial status bar update');
		this.updateStatusBar();
	}

	private handleSelectionChange = () => {
		if (!this.settings.enableLiveCount) {
			this.log('Live count disabled, skipping selection change update');
			return;
		}
		
		// Enhanced debugging for Canvas integration
		const selection = window.getSelection();
		const selectedText = selection ? selection.toString() : '';
		const activeLeaf = this.app.workspace.activeLeaf;
		const viewType = activeLeaf?.view?.getViewType() || 'unknown';
		
		this.log('=== Selection Change Debug ===');
		this.log('View type:', viewType);
		this.log('Selected text length:', selectedText.length);
		this.log('Selected text preview:', selectedText.substring(0, 100));
		this.log('Status bar enabled:', this.settings.showStatusBar);
		this.log('Status bar item exists:', !!this.statusBarItem);
		this.log('Live count enabled:', this.settings.enableLiveCount);
		
		// Debug Canvas iframe in selection change
		if (viewType === 'canvas') {
			const iframe = document.activeElement as HTMLIFrameElement;
			this.log('Selection change - Active element:', iframe?.tagName);
			this.log('Selection change - Is iframe?', iframe?.tagName === 'IFRAME');
			if (iframe?.tagName === 'IFRAME' && iframe.contentWindow) {
				try {
					const iframeSelection = iframe.contentWindow.getSelection();
					const iframeText = iframeSelection?.toString() || '';
					this.log('Selection change - Iframe selection:', iframeText.length, 'chars');
					this.log('Selection change - Iframe text preview:', iframeText.substring(0, 50));
				} catch (e) {
					this.log('Selection change - Iframe error:', e.message);
				}
			}
		}
		
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		
		this.debounceTimer = setTimeout(() => {
			this.log('Debounced selection change - updating status bar');
			this.updateStatusBar();
		}, 300); // 300ms debounce
	};

	private startCanvasPolling() {
		this.stopCanvasPolling(); // Clear any existing timer
		
		this.canvasPollingTimer = setInterval(() => {
			const activeLeaf = this.app.workspace.activeLeaf;
			const viewType = activeLeaf?.view?.getViewType();
			
			// Only poll if we're in Canvas view
			if (viewType === 'canvas') {
				const iframe = document.activeElement as HTMLIFrameElement;
				if (iframe?.tagName === 'IFRAME' && iframe.contentWindow) {
					try {
						const iframeSelection = iframe.contentWindow.getSelection();
						const currentSelection = iframeSelection?.toString() || '';
						
						// Always update cache, even if empty (to track clearing selection)
						if (currentSelection !== this.lastCanvasSelection) {
							this.lastCanvasSelection = currentSelection;
							this.log('Canvas polling detected selection change:', currentSelection.length, 'chars');
							this.log('Canvas cached selection updated to:', this.lastCanvasSelection.substring(0, 50));
							this.updateStatusBar();
						}
					} catch (e) {
						// Silently ignore iframe access errors
					}
				} else {
					// No iframe focused - clear cached selection if we had one
					if (this.lastCanvasSelection) {
						this.log('Canvas iframe not focused - clearing cached selection');
						this.lastCanvasSelection = '';
						this.updateStatusBar();
					}
				}
			} else {
				// Not in Canvas view - clear cached selection
				if (this.lastCanvasSelection) {
					this.log('Not in Canvas view - clearing cached selection');
					this.lastCanvasSelection = '';
				}
			}
		}, 500); // Poll every 500ms
		
		this.log('Canvas polling started');
	}

	private stopCanvasPolling() {
		if (this.canvasPollingTimer) {
			clearInterval(this.canvasPollingTimer);
			this.canvasPollingTimer = null;
			this.lastCanvasSelection = '';
			this.log('Canvas polling stopped');
		}
	}

	private setupRibbonButton() {
		// Remove existing button if it exists
		if (this.ribbonButton) {
			this.ribbonButton.remove();
			this.ribbonButton = null;
		}
		// Ribbon button functionality removed as per Obsidian guidelines
	}

	private log(message: string, ...args: any[]) {
		if (this.settings.enableDebugLogging) {
			debugLog(this, message, ...args);
		}
	}

	private async handleWordCount() {
		try {
			let selectedText = '';
			let viewType = 'unknown';
			
			// First try to get a MarkdownView (traditional text editing views)
			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			
			if (markdownView) {
				viewType = 'markdown';
				this.log('HandleWordCount - MarkdownView mode:', markdownView.getMode());

				if (markdownView.getMode() === 'source') {
					// Source mode
					selectedText = markdownView.editor.getSelection();
					this.log('Source mode selection:', selectedText);
				} else if (markdownView.getMode() === 'preview') {
					// Reading view mode
					const selection = window.getSelection();
					this.log('Reading view selection object:', selection);
					
					// First find the markdown preview container
					const previewContainer = markdownView.containerEl.querySelector('.markdown-preview-view');
					this.log('Preview container:', previewContainer);
					
					if (selection && selection.rangeCount > 0 && previewContainer) {
						const range = selection.getRangeAt(0);
						this.log('Initial range text:', range?.toString());
						
						if (range.toString().trim()) {
							// Check if either the start or end container is within the preview
							const startInPreview = previewContainer.contains(range.startContainer);
							const endInPreview = previewContainer.contains(range.endContainer);
							
							this.log('Start container:', range.startContainer);
							this.log('End container:', range.endContainer);
							this.log('Start in preview:', startInPreview);
							this.log('End in preview:', endInPreview);
							
							if (startInPreview || endInPreview) {
								selectedText = range.toString();
								this.log('Using selection from Reading view:', selectedText);
							} else {
								this.log('Selection containers not within preview');
							}
						} else {
							this.log('Empty selection');
						}
					} else {
						this.log('No valid selection range found or preview container not found');
					}
				} else {
					// Live Preview mode
					selectedText = markdownView.editor.getSelection();
					this.log('Live Preview mode selection:', selectedText);
				}
			} else {
				// Fallback for non-MarkdownView types (Canvas, etc.)
				const activeLeaf = this.app.workspace.activeLeaf;
				if (activeLeaf && activeLeaf.view) {
					viewType = activeLeaf.view.getViewType();
					this.log('HandleWordCount - non-MarkdownView type:', viewType);
					
					// Try multiple methods to get selected text for Canvas/other views
					const windowSelection = window.getSelection();
					let selectionText = windowSelection?.toString() || '';
					
					// For Canvas views, use cached selection or try iframe selection
					if (!selectionText && viewType === 'canvas') {
						// First try to use cached selection from polling
						if (this.lastCanvasSelection) {
							selectionText = this.lastCanvasSelection;
							this.log('HandleWordCount - using cached Canvas selection:', selectionText.length, 'chars');
						} else {
							// Fallback: try to get fresh iframe selection
							this.log('HandleWordCount - trying fresh Canvas iframe selection...');
							
							const iframe = document.activeElement as HTMLIFrameElement;
							if (iframe && iframe.tagName === 'IFRAME' && iframe.contentWindow) {
								try {
									const iframeSelection = iframe.contentWindow.getSelection();
									if (iframeSelection) {
										selectionText = iframeSelection.toString();
										this.log('HandleWordCount - fresh Canvas iframe selection found:', selectionText.length, 'chars');
									}
								} catch (e) {
									this.log('HandleWordCount - Canvas iframe selection error:', e.message);
								}
							}
						}
					}
					
					selectedText = selectionText;
					this.log('HandleWordCount - Final selected text for', viewType, ':', selectedText.length, 'chars');
				} else {
					this.log('No active view found');
					new Notice('Please open a file first');
					return;
				}
			}

			if (!selectedText) {
				this.log('No text selected');
				new Notice('No text selected');
				return;
			}

			this.log('Processing selection:', selectedText);
			const exclusions = this.settings.exclusionList.split(',').map(e => e.trim()).filter(e => e);
			const disabledExclusions = getDisabledExclusionsFromFrontmatter(this.app);
			const countResult = countSelectedText(selectedText, exclusions, true, this.settings, this, disabledExclusions);

			// Update status bar if it exists
			if (this.statusBarItem) {
				this.updateStatusBar(countResult.words);
			}

			// Add to history
			this.history.unshift({ 
				count: countResult.words, 
				characterCount: countResult.characters,
				sentenceCount: countResult.sentences,
				date: new Date() 
			});
			if (this.history.length > 50) this.history.pop();
			await this.saveHistory();

			this.log('Opening modal with counts:', countResult);
			// Open the modal
			const modal = new WordCountModal(this.app, countResult, this.history, this.settings.showDateTimeInHistory, this);
			modal.open();

		} catch (error) {
			this.log('Error in word count command:', error);
			new Notice('Error counting words. Please try again or check console for details.');
		}
	}

	onunload() {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		// Stop Canvas polling
		this.stopCanvasPolling();
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
		if (this.ribbonButton) {
			this.ribbonButton.remove();
		}
		// Remove the selection change listener
		document.removeEventListener('selectionchange', this.handleSelectionChange);
		
		// Remove our style element if it exists
		const styleElement = document.getElementById('selected-word-counter-core-hide');
		if (styleElement) {
			styleElement.remove();
		}


	}

	private updateStatusBar(count?: number) {
		if (!this.statusBarItem || !this.settings.showStatusBar) {
			this.log('Status bar update skipped - statusBarItem:', !!this.statusBarItem, 'showStatusBar:', this.settings.showStatusBar);
			return;
		}

		// First try to get a MarkdownView (traditional text editing views)
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		let selectedText = '';
		let viewType = 'unknown';

		if (markdownView) {
			viewType = 'markdown';
			this.log('Updating status bar for MarkdownView mode:', markdownView.getMode());

			if (markdownView.getMode() === 'source') {
				selectedText = markdownView.editor.getSelection();
			} else if (markdownView.getMode() === 'preview') {
				const selection = window.getSelection();
				if (selection && selection.toString()) {
					selectedText = selection.toString();
				}
			} else {
				// Live Preview mode (default case)
				selectedText = markdownView.editor.getSelection();
			}
		} else {
			// Fallback for non-MarkdownView types (Canvas, etc.)
			const activeLeaf = this.app.workspace.activeLeaf;
			if (activeLeaf && activeLeaf.view) {
				viewType = activeLeaf.view.getViewType();
				this.log('Updating status bar for non-MarkdownView type:', viewType);
				
				// Debug Canvas view properties
				if (viewType === 'canvas') {
					this.log('Canvas view properties:', Object.keys(activeLeaf.view));
					this.log('Canvas view container:', activeLeaf.view.containerEl);
					
					// Check for iframe access
					const iframe = document.activeElement as HTMLIFrameElement;
					if (iframe && iframe.tagName === 'IFRAME') {
						this.log('Active iframe:', iframe);
						this.log('Iframe content accessible:', !!iframe.contentDocument);
						this.log('Iframe contentWindow accessible:', !!iframe.contentWindow);
						
						// Try to access iframe selection
						if (iframe.contentWindow) {
							try {
								const iframeSelection = iframe.contentWindow.getSelection();
								if (iframeSelection) {
									this.log('Iframe selection text:', iframeSelection.toString());
								}
							} catch (e) {
								this.log('Iframe selection error:', e.message);
							}
						}
					}
				}

				// Try multiple methods to get selected text for Canvas/other views
				const windowSelection = window.getSelection();
				let selectionText = windowSelection?.toString() || '';
				
				// For Canvas views, check iframe selection
				if (!selectionText && viewType === 'canvas') {
					this.log('Trying Canvas iframe selection...');
					
					// Check if active element is an iframe (Canvas content)
					const iframe = document.activeElement as HTMLIFrameElement;
					this.log('Active element:', iframe?.tagName);
					this.log('Is iframe?', iframe?.tagName === 'IFRAME');
					this.log('Has contentWindow?', !!iframe?.contentWindow);
					
					if (iframe && iframe.tagName === 'IFRAME' && iframe.contentWindow) {
						try {
							const iframeSelection = iframe.contentWindow.getSelection();
							this.log('Iframe selection object:', !!iframeSelection);
							this.log('Iframe selection rangeCount:', iframeSelection?.rangeCount);
							if (iframeSelection) {
								selectionText = iframeSelection.toString();
								this.log('Canvas iframe selection found:', selectionText.length, 'chars');
								this.log('Canvas iframe selection text preview:', selectionText.substring(0, 50));
							} else {
								this.log('No iframe selection object found');
							}
						} catch (e) {
							this.log('Canvas iframe selection error:', e.message);
						}
					} else {
						this.log('Iframe detection failed - activeElement is not a suitable iframe');
					}
				}
				
				selectedText = selectionText;
				this.log('Final selected text for', viewType, ':', selectedText.length, 'chars');
			} else {
				this.statusBarItem.setText('');
				this.log('No active view found');
				return;
			}
		}

		this.log('View type:', viewType, 'Selected text length:', selectedText.length, 'Text preview:', selectedText.substring(0, 50));

		if (!selectedText) {
			this.statusBarItem.setText('');
			this.log('No text selected, clearing status bar');
			return;
		}

		const disabledExclusions = getDisabledExclusionsFromFrontmatter(this.app);
		const wordCount = count ?? countSelectedWords(
			selectedText,
			this.settings.exclusionList.split(',').map(e => e.trim()).filter(e => e),
			true,
			this.settings,
			this,
			disabledExclusions
		);

		// Add live indicator if enabled
		const liveIndicator = this.settings.enableLiveCount ? ' (live)' : '';
		const statusText = `${this.settings.statusBarLabel}${wordCount}${liveIndicator}`;
		
		this.log('Setting status bar text:', statusText);
		this.statusBarItem.setText(statusText);
	}

	public addCoreWordCountStyle() {
		// Add or remove the CSS based on the setting
		const styleId = 'selected-word-counter-core-hide';
		let styleElement = document.getElementById(styleId);
		
		if (this.settings.hideCoreWordCount) {
			if (!styleElement) {
				styleElement = document.createElement('style');
				styleElement.id = styleId;
				styleElement.textContent = `
					/* Hide Obsidian's core word count, but not our plugin */
					.status-bar-item.mod-clickable:not(.plugin-word-count) {
						display: none !important;
					}
				`;
				document.head.appendChild(styleElement);
			}
		} else {
			if (styleElement) {
				styleElement.remove();
			}
		}
	}

	/**
	 * Detects if the cursor is on a heading line and returns the full heading text.
	 * @param editor The editor instance
	 * @param cursor The cursor position
	 * @returns The full heading text (including markers) if on a heading, null otherwise
	 */
	getHeadingAtCursor(editor: any, cursor: any): string | null {
		try {
			const lineText = editor.getLine(cursor.line);
			const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
			
			if (headingMatch) {
				const fullHeading = lineText.trim();
				debugLog(this, 'Detected heading at cursor:', fullHeading);
				return fullHeading;
			}
			
			return null;
		} catch (error) {
			debugLog(this, 'Error detecting heading at cursor:', error);
			return null;
		}
	}

	async addExcludedHeading(heading: string) {
		try {
			// Trim the heading and check if it's not empty
			const trimmedHeading = heading.trim();
			if (!trimmedHeading) {
				new Notice('Cannot exclude empty heading');
				return;
			}

			// Check if heading already exists (case-insensitive)
			const existsAlready = this.settings.excludeHeadingSections.some(
				existingHeading => existingHeading.toLowerCase() === trimmedHeading.toLowerCase()
			);

			if (existsAlready) {
				new Notice(`Heading "${trimmedHeading}" is already excluded`);
				return;
			}

			// Add the heading to the exclusion list
			this.settings.excludeHeadingSections.push(trimmedHeading);
			await this.saveSettings();

			// Show success notice
			new Notice(`Added "${trimmedHeading}" to heading exclusion list`);

			// Open plugin settings using Obsidian API
			(this.app as any).setting.open();
			(this.app as any).setting.openTabById(this.manifest.id);

		} catch (error) {
			console.error('Error adding excluded heading:', error);
			new Notice('Failed to add heading to exclusion list');
		}
	}

	async addExcludedPhrase(phrase: string) {
		try {
			// Trim the phrase and check if it's not empty
			const trimmedPhrase = phrase.trim();
			if (!trimmedPhrase) {
				new Notice('Cannot exclude empty phrase');
				return;
			}

			// Check if phrase already exists (case-insensitive)
			const existsAlready = this.settings.excludedPhrases.some(
				existingPhrase => existingPhrase.toLowerCase() === trimmedPhrase.toLowerCase()
			);

			if (existsAlready) {
				new Notice(`Phrase "${trimmedPhrase}" is already excluded`);
				return;
			}

			// Add the phrase to the exclusion list
			this.settings.excludedPhrases.push(trimmedPhrase);
			await this.saveSettings();

			// Show success notice
			new Notice(`Added "${trimmedPhrase}" to exclusion list`);

			// Open plugin settings using Obsidian API
			(this.app as any).setting.open();
			(this.app as any).setting.openTabById(this.manifest.id);

		} catch (error) {
			console.error('Error adding excluded phrase:', error);
			new Notice('Failed to add phrase to exclusion list');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Load history from settings, converting date strings to Date objects
		if (this.settings.history && Array.isArray(this.settings.history)) {
			this.history = this.settings.history.map(entry => ({
				count: entry.count,
				date: new Date(entry.date)
			}));
		} else {
			this.history = [];
		}
		// Always ensure exclusionList is up to date with the default list
		this.settings.exclusionList = DEFAULT_EXCLUSION_LIST;
		await this.saveSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.updateClasses();
		
		// Update UI elements based on settings
		this.setupStatusBar();
		this.setupRibbonButton();
		this.addCoreWordCountStyle();
	}

	async saveHistory() {
		await this.saveSettings();
	}
}

// Minimal modal for displaying word count and history
class WordCountModal extends Modal {
	countResult: CountResult;
	history: WordCountHistoryEntry[];
	showDateTime: boolean;
	plugin: CustomSelectedWordCountPlugin | null;
	constructor(app: App, countResult: CountResult, history: WordCountHistoryEntry[], showDateTime: boolean, plugin: CustomSelectedWordCountPlugin | null = null) {
		super(app);
		this.countResult = countResult;
		this.history = history;
		this.showDateTime = showDateTime;
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass('word-count-modal');

		// Modal header with icon
		const headerEl = contentEl.createDiv({cls: 'modal-header'});
		const headerIcon = headerEl.createSpan({cls: 'modal-header-icon', attr: {'aria-hidden': 'true'}});
		setIcon(headerIcon, 'chart-no-axes-column');
		const titleEl = headerEl.createEl('h2', {cls: 'modal-title', text: 'Selection Analysis'});

		// Modal content with improved padding
		const modalContentEl = contentEl.createDiv({cls: 'modal-content'});

		// Count cards section with enhanced layout
		const countCardsEl = modalContentEl.createDiv({cls: 'count-cards'});
		
		// Word count card
		this.createCountCard(
			countCardsEl,
			'word-count-lucide-type',
			'WORDS',
			this.countResult.words,
			'Advanced word detection including contractions, hyphenated words, and numbers',
			'Copy Words Count'
		);

		// Character count card (if enabled in settings)
		if (this.plugin?.settings.showCharacterCount) {
			const modeText = this.plugin.settings.characterCountMode === 'all' 
				? 'All characters including spaces, punctuation, and symbols'
				: this.plugin.settings.characterCountMode === 'no-spaces' 
				? 'All characters excluding whitespace'
				: 'Only alphabetic characters (A-Z, a-z)';

			this.createCountCard(
				countCardsEl,
				'word-count-lucide-hash',
				'CHARACTERS',
				this.countResult.characters,
				modeText,
				'Copy Characters Count'
			);
		}

		// Sentence count card (if enabled in settings)
		if (this.plugin?.settings.showSentenceCount) {
			this.createCountCard(
				countCardsEl,
				'word-count-lucide-list-ordered',
				'SENTENCES',
				this.countResult.sentences,
				'Smart sentence detection with abbreviation and decimal number handling',
				'Copy Sentences Count'
			);
		}



		// History section
		if (this.history.length > 0) {
			const historySection = modalContentEl.createDiv({cls: 'history-section'});
			
			const historyHeader = historySection.createDiv({cls: 'history-header'});
			const historyTitle = historyHeader.createDiv({cls: 'history-title'});
			const historyIcon = historyTitle.createSpan({cls: 'history-title-icon', attr: {'aria-hidden': 'true'}});
			setIcon(historyIcon, 'clock');
			historyTitle.appendText('Recent Counts');
			
			const clearButton = historyHeader.createEl('button', {
				cls: 'clear-btn',
				attr: {
					'title': 'Clear all history entries',
					'aria-label': 'Clear all history entries'
				}
			});
			const clearIcon = clearButton.createSpan({cls: 'clear-btn-icon', attr: {'aria-hidden': 'true'}});
			setIcon(clearIcon, 'trash-2');
			clearButton.appendText('Clear');
			
			clearButton.addEventListener('click', () => {
				// Add confirmation dialog
				if (confirm('Clear all history entries?')) {
					if (this.plugin) {
						this.plugin.history = [];
						this.plugin.saveHistory();
						this.close();
					}
				}
			});

			const historyList = historySection.createDiv({cls: 'history-list'});

			this.history.slice().reverse().forEach(entry => {
				const entryDiv = historyList.createDiv({cls: 'history-entry'});
				
				// Build the full count text
				let countParts: string[] = [`${entry.count} words`];
				
				if (entry.characterCount !== undefined && this.plugin?.settings.showCharacterCount) {
					countParts.push(`${entry.characterCount} chars`);
				}
				
				if (entry.sentenceCount !== undefined && this.plugin?.settings.showSentenceCount) {
					countParts.push(`${entry.sentenceCount} sentences`);
				}
				
				const fullCountText = countParts.join(', ');
				
				// Create content container for text and timestamp
				const contentDiv = entryDiv.createDiv({cls: 'history-content'});
				const textEl = contentDiv.createDiv({cls: 'history-text', text: fullCountText});
				
				// Add timestamp if enabled
				if (this.showDateTime) {
					const timestampEl = contentDiv.createDiv({cls: 'history-timestamp'});
					timestampEl.textContent = entry.date.toLocaleString();
				}
				
				const actionsDiv = entryDiv.createDiv({cls: 'history-actions'});
				
				// Single copy button that copies the entire count string
				const copyButton = actionsDiv.createEl('button', {
					cls: 'history-copy-btn',
					attr: {
						'title': 'Copy this count',
						'aria-label': `Copy "${fullCountText}"`
					}
				});
				const historyCopyIcon = copyButton.createSpan({cls: 'history-copy-icon', attr: {'aria-hidden': 'true'}});
				setIcon(historyCopyIcon, 'copy');
				copyButton.appendText('Copy');
				
				copyButton.addEventListener('click', async () => {
					await navigator.clipboard.writeText(fullCountText);
					new Notice('Count copied to clipboard');
					
					// Visual feedback
					historyCopyIcon.empty();
					setIcon(historyCopyIcon, 'check');
					copyButton.style.background = 'var(--interactive-accent)';
					copyButton.style.color = 'var(--text-on-accent)';
					
					setTimeout(() => {
						historyCopyIcon.empty();
						setIcon(historyCopyIcon, 'copy');
						copyButton.style.background = '';
						copyButton.style.color = '';
					}, 1000);
				});
			});
		}


	}

	private createCountCard(
		container: HTMLElement, 
		iconClass: string, 
		label: string, 
		count: number, 
		description: string, 
		tooltipText: string
	) {
		const card = container.createDiv({cls: 'count-card'});
		
		// Card header with icon and label
		const header = card.createDiv({cls: 'count-header'});
		const labelDiv = header.createDiv({cls: 'count-label'});
		const labelIcon = labelDiv.createSpan({cls: 'count-label-icon', attr: {'aria-hidden': 'true'}});
		this.setCardIcon(labelIcon, iconClass);
		labelDiv.appendText(label);
		
		// Count value container with number and copy button
		const valueContainer = card.createDiv({cls: 'count-value-container'});
		const formattedCount = count.toLocaleString(); // Add thousands separators
		const valueEl = valueContainer.createDiv({cls: 'count-value', text: formattedCount});
		
		// Apply dynamic font sizing based on digit count
		this.applyDynamicFontSize(valueEl, count);
		
		const copyButton = valueContainer.createEl('button', {
			cls: 'copy-button',
			attr: {
				'title': tooltipText,
				'aria-label': tooltipText
			}
		});
		const copyIcon = copyButton.createSpan({cls: 'copy-button-icon', attr: {'aria-hidden': 'true'}});
		setIcon(copyIcon, 'copy');
		
		// Description text
		card.createDiv({cls: 'count-subtitle', text: description});
		
		// Copy button functionality
		copyButton.addEventListener('click', async () => {
			await navigator.clipboard.writeText(count.toString());
			new Notice(`${label.toLowerCase()} count copied to clipboard`);
			
			// Visual feedback - briefly change button appearance
			const originalIcon = copyIcon;
			copyIcon.empty();
			setIcon(copyIcon, 'check');
			copyButton.style.background = 'var(--interactive-accent)';
			copyButton.style.color = 'var(--text-on-accent)';
			
			setTimeout(() => {
				copyIcon.empty();
				setIcon(copyIcon, 'copy');
				copyButton.style.background = '';
				copyButton.style.color = '';
			}, 1000);
		});
		
		return card;
	}

	/**
	 * Sets the appropriate icon for count card labels
	 */
	private setCardIcon(element: HTMLElement, iconClass: string): void {
		if (iconClass.includes('type')) {
			setIcon(element, 'type');
		} else if (iconClass.includes('hash')) {
			setIcon(element, 'hash');
		} else if (iconClass.includes('list-ordered')) {
			setIcon(element, 'list-ordered');
		}
	}

	/**
	 * Dynamically adjusts font size based on the number of digits to prevent layout overflow
	 */
	private applyDynamicFontSize(element: HTMLElement, count: number): void {
		const digitCount = count.toString().length;
		let fontSize: string;
		
		if (digitCount <= 2) {
			fontSize = '4.5em'; // Full size for 1-2 digits
		} else if (digitCount === 3) {
			fontSize = '3.8em'; // Smaller for 3 digits
		} else if (digitCount === 4) {
			fontSize = '2.8em'; // Much more aggressive for 4 digits (like "5,473")
		} else if (digitCount === 5) {
			fontSize = '2.2em'; // Very aggressive for 5 digits (like "26,752")
		} else if (digitCount === 6) {
			fontSize = '1.8em'; // Even smaller for 6 digits
		} else if (digitCount === 7) {
			fontSize = '1.6em'; // Smaller for 7 digits
		} else {
			fontSize = '1.4em'; // Minimum size for 8+ digits
		}
		
		element.style.fontSize = fontSize;
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

// Helper function for exclusion info
function addExclusionInfo(
	container: HTMLElement,
	title: string,
	regex: string,
	explanation: string,
	matches: string[],
	nonMatches: string[]
) {
	const section = container.createDiv({ cls: 'word-count-exclusion-section' });
	section.createEl('strong', { text: title });

	// Regex row with copy button
	const regexRow = section.createDiv({ cls: 'word-count-regex-row' });
	regexRow.createEl('span', { text: `Regex: ${regex}` });
	const copyBtn = regexRow.createEl('button', { text: 'Copy Regex' });
	copyBtn.onclick = () => {
		navigator.clipboard.writeText(regex);
		copyBtn.textContent = 'Copied!';
		setTimeout(() => (copyBtn.textContent = 'Copy Regex'), 1200);
	};

	// Collapsible details
	const details = section.createEl('details', { cls: 'word-count-exclusion-details' });
	details.createEl('summary', { text: 'Show Explanation & Examples' });

	details.createEl('div', { text: explanation, cls: 'word-count-explanation' });

	// Example matches
	const matchList = details.createEl('ul');
	matchList.createEl('li', { text: 'Example matches:' });
	matches.forEach(example => matchList.createEl('li', { text: example, cls: 'word-count-match' }));

	// Example non-matches
	const nonMatchList = details.createEl('ul');
	nonMatchList.createEl('li', { text: 'Example non-matches:' });
	nonMatches.forEach(example => nonMatchList.createEl('li', { text: example, cls: 'word-count-nonmatch' }));
}

// Settings tab for plugin options
class WordCountSettingTab extends PluginSettingTab {
	plugin: CustomSelectedWordCountPlugin;
	private updateSettingsUI: () => void;
	private updateRegexTest: () => void;
	private exportLogFiles: () => Promise<void>;

	constructor(app: App, plugin: CustomSelectedWordCountPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		containerEl.addClass('word-count-settings');



		// UI Elements Settings

		// Status Bar Settings
		const statusBarContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(statusBarContainer)
			.setName('Show count in status bar')
			.setDesc('Show the selected word count in the status bar next to Obsidian\'s built-in word count.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value: boolean) => {
					this.plugin.settings.showStatusBar = value;
					if (!value) {
						// Disable live updates if status bar is disabled
						this.plugin.settings.enableLiveCount = false;
					}
					await this.plugin.saveSettings();
					this.plugin.setupStatusBar();
					this.updateSettingsUI();
				}));

		// Status bar sub-settings container
		const statusBarSettingsContainer = statusBarContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-status-bar-settings' });
		
		// Live Update Setting
		new Setting(statusBarSettingsContainer)
			.setName('Enable live updates')
			.setDesc('Update the status bar count automatically when text is selected. (Requires status bar to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.enableLiveCount)
				.onChange(async (value: boolean) => {
					this.plugin.settings.enableLiveCount = value;
					await this.plugin.saveSettings();
					this.plugin.setupStatusBar();
				}));

		// Hide Core Word Count Setting
		new Setting(statusBarSettingsContainer)
			.setName('Hide core word count')
			.setDesc('Hide Obsidian\'s built-in word count when the selected word count is enabled. (Requires status bar to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.hideCoreWordCount)
				.onChange(async (value: boolean) => {
					this.plugin.settings.hideCoreWordCount = value;
					await this.plugin.saveSettings();
					this.plugin.addCoreWordCountStyle();
				}));

		// Status Bar Label Setting
		new Setting(statusBarSettingsContainer)
			.setName('Status bar label')
			.setDesc('Customize the label shown before the count in the status bar. (Requires status bar to be enabled)')
			.addText((text: any) => text
				.setPlaceholder('Selected: ')
				.setValue(this.plugin.settings.statusBarLabel)
				.onChange(async (value: string) => {
					this.plugin.settings.statusBarLabel = value;
					await this.plugin.saveSettings();
					this.plugin.setupStatusBar();
				}));

		// Character Count Settings
		const charCountContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(charCountContainer)
			.setName('Show character count')
			.setDesc('Display character count alongside word count in the modal.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.showCharacterCount)
				.onChange(async (value: boolean) => {
					this.plugin.settings.showCharacterCount = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const charCountSettingsContainer = charCountContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-char-settings' });

		// Character counting mode
		const charModeContainer = charCountSettingsContainer.createDiv({ cls: 'word-count-container-indented' });
		new Setting(charModeContainer)
			.setName('Character counting mode')
			.setDesc('Choose how characters are counted. (Requires character count to be enabled)')
			.addDropdown((dropdown: any) => dropdown
				.addOption('all', 'All characters (including spaces)')
				.addOption('no-spaces', 'All characters (excluding spaces)')
				.addOption('letters-only', 'Letters only')
				.setValue(this.plugin.settings.characterCountMode)
				.onChange(async (value: 'all' | 'no-spaces' | 'letters-only') => {
					this.plugin.settings.characterCountMode = value;
					await this.plugin.saveSettings();
				}));

		// Sentence count settings
		const sentenceCountContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(sentenceCountContainer)
			.setName('Show sentence count')
			.setDesc('Display sentence count alongside word count in the modal.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.showSentenceCount)
				.onChange(async (value: boolean) => {
					this.plugin.settings.showSentenceCount = value;
					await this.plugin.saveSettings();
				}));
		
		// History settings
		const historyContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(historyContainer)
			.setName('Show date/time in history')
			.setDesc('Include timestamps when displaying word count history in the modal.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.showDateTimeInHistory)
				.onChange(async (value: boolean) => {
					this.plugin.settings.showDateTimeInHistory = value;
					await this.plugin.saveSettings();
				}));

		// Per-note Override Information
		const overrideInfo = containerEl.createEl('details', { cls: 'word-count-override-info' });
		const overrideSummary = overrideInfo.createEl('summary', { text: 'ℹ️ Using per-note exclusion overrides' });
		
		const overrideContent = overrideInfo.createDiv({ cls: 'word-count-override-content' });
		overrideContent.createEl('p', { text: 'You can override any exclusion setting for individual notes by adding a cswc-disable property to the note\'s frontmatter:' });
		
		const examplePre = overrideContent.createEl('pre', { cls: 'word-count-override-example' });
		examplePre.createEl('code', { text: '---\ncswc-disable: [exclude-urls, exclude-comments]\n---' });
		
		overrideContent.createEl('p', { text: 'Use "all" to disable all exclusions:' });
		const examplePre2 = overrideContent.createEl('pre', { cls: 'word-count-override-example' });
		examplePre2.createEl('code', { text: '---\ncswc-disable: all\n---' });
		
		overrideContent.createEl('p', { text: 'Property values are shown next to each setting below (• Property: ...)' });
		
		overrideContent.createEl('h4', { text: 'Inline comment overrides' });
		overrideContent.createEl('p', { text: 'You can also disable exclusions for specific sections within a note using comments:' });
		const inlinePre = overrideContent.createEl('pre', { cls: 'word-count-override-example' });
		inlinePre.createEl('code', { text: 'This text is excluded.\n<!-- cswc-disable -->\nThis text is NOT excluded from counts.\n<!-- cswc-enable -->\nThis text is excluded again.' });
		
		overrideContent.createEl('p', { text: 'Supported comment formats: <!-- cswc-disable --> or %% cswc-disable %%' });

		// Link Exclusion Settings
		const linkContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(linkContainer)
			.setName('Exclude non-visible portions of links')
			.setDesc('For [[Note Name|Alias]] links, only count "Alias". For [link text](url) links, only count "link text". • Property: exclude-urls')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeNonVisibleLinkPortions)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeNonVisibleLinkPortions = value;
					await this.plugin.saveSettings();
				}));

		// Code Exclusion Settings
		const codeContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(codeContainer)
			.setName('Exclude code')
			.setDesc('When enabled, code will be excluded from word, character, and sentence counts.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeCode)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeCode = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));
		
		const codeSettingsContainer = codeContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-code-settings' });
		
		new Setting(codeSettingsContainer)
			.setName('Exclude code blocks')
			.setDesc('Exclude text within triple backtick (```) or tilde (~~~) code blocks. (Requires code exclusion to be enabled) • Property: exclude-code-blocks')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeCodeBlocks)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeCodeBlocks = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(codeSettingsContainer)
			.setName('Exclude inline code')
			.setDesc('Exclude text within single backticks (`). (Requires code exclusion to be enabled) • Property: exclude-inline-code')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeInlineCode)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeInlineCode = value;
					await this.plugin.saveSettings();
				}));

		// Path Exclusion Settings
		
		const pathContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(pathContainer)
			.setName('Exclude paths from word count')
			.setDesc('When enabled, file paths will not be counted as words.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludePaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludePaths = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const pathSettingsContainer = pathContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-path-settings' });

		// Sub-settings for each path type
		new Setting(pathSettingsContainer)
			.setName('Exclude Windows paths')
			.setDesc('Exclude paths starting with drive letters (e.g., C:\\). (Requires path exclusion to be enabled) • Property: exclude-windows-paths')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeWindowsPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeWindowsPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude Unix paths')
			.setDesc('Exclude Unix-style paths starting with forward slash (e.g., /usr/local). (Requires path exclusion to be enabled) • Property: exclude-unix-paths')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeUnixPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeUnixPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude UNC paths')
			.setDesc('Exclude network paths starting with double backslash (e.g., \\\\server\\share). (Requires path exclusion to be enabled) • Property: exclude-unc-paths')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeUNCPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeUNCPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude environment paths')
			.setDesc('Exclude environment variable paths (e.g., %USERPROFILE%, $HOME). (Requires path exclusion to be enabled) • Property: exclude-environment-paths')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeEnvironmentPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeEnvironmentPaths = value;
					await this.plugin.saveSettings();
				}));


		// Comment Exclusion Settings
		const commentContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(commentContainer)
			.setName('Exclude comments from text analysis')
			.setDesc('When enabled, comments will be excluded from word, character, and sentence counts. • Property: exclude-comments')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeComments)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeComments = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const commentSettingsContainer = commentContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-comment-settings' });

		// Obsidian comments section
		new Setting(commentSettingsContainer)
			.setName('Exclude Obsidian comments (%% %%)')
			.setDesc('Exclude Obsidian-style comments from text analysis. (Requires comment exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeObsidianComments)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeObsidianComments = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const obsidianCommentContentContainer = commentSettingsContainer.createDiv({ cls: 'word-count-container-indented' });
		new Setting(obsidianCommentContentContainer)
			.setName('Exclude Obsidian comment content')
			.setDesc('When unchecked, only the comment markers (%% %%) are excluded, but the content inside is still counted. (Requires Obsidian comment exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeObsidianCommentContent)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeObsidianCommentContent = value;
					await this.plugin.saveSettings();
				}));

		// HTML comments section
		new Setting(commentSettingsContainer)
			.setName('Exclude HTML comments (<!-- -->)')
			.setDesc('Exclude HTML-style comments from text analysis. (Requires comment exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeHtmlComments)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeHtmlComments = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const htmlCommentContentContainer = commentSettingsContainer.createDiv({ cls: 'word-count-container-indented' });
		new Setting(htmlCommentContentContainer)
			.setName('Exclude HTML comment content')
			.setDesc('When unchecked, only the comment markers (<!-- -->) are excluded, but the content inside is still counted. (Requires HTML comment exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeHtmlCommentContent)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeHtmlCommentContent = value;
					await this.plugin.saveSettings();
				}));

		// Heading Exclusion Settings
		const headingContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(headingContainer)
			.setName('Exclude headings from text analysis')
			.setDesc('When enabled, markdown headings will be excluded from word, character, and sentence counts. • Property: exclude-headings')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeHeadings)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeHeadings = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const headingSettingsContainer = headingContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-heading-settings' });

		// Heading exclusion options
		new Setting(headingSettingsContainer)
			.setName('Exclude heading markers only')
			.setDesc('Exclude only the # symbols but count the heading text. (Requires heading exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeHeadingMarkersOnly)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeHeadingMarkersOnly = value;
					if (value) {
						// If markers only is enabled, disable other options
						this.plugin.settings.excludeEntireHeadingLines = false;
						// Clear heading sections exclusion
						this.plugin.settings.excludeHeadingSections = [];
					}
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		new Setting(headingSettingsContainer)
			.setName('Exclude entire heading lines')
			.setDesc('Exclude complete heading lines including the text. (Requires heading exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeEntireHeadingLines)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeEntireHeadingLines = value;
					if (value) {
						// If entire lines is enabled, disable other options
						this.plugin.settings.excludeHeadingMarkersOnly = false;
						// Clear heading sections exclusion
						this.plugin.settings.excludeHeadingSections = [];
					}
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		// Heading sections exclusion subsection
		const headingSectionsSubsection = headingSettingsContainer.createDiv({ cls: 'word-count-subsection' });
		const headingSectionsHeader = headingSectionsSubsection.createDiv({ cls: 'word-count-subsection-header' });
		headingSectionsHeader.createEl('strong', { text: 'Excluded heading sections' });
		headingSectionsHeader.createEl('p', { 
			text: 'Right-click on heading lines to exclude entire sections. (Requires heading exclusion to be enabled)',
			cls: 'word-count-subsection-desc'
		});

		const headingsList = headingSectionsSubsection.createDiv({ cls: 'word-count-headings-list' });

		// Function to render headings list
		const renderHeadingsList = () => {
			headingsList.empty();
			
			if (!this.plugin.settings.excludeHeadingSections || this.plugin.settings.excludeHeadingSections.length === 0) {
				headingsList.createDiv({ 
					text: 'No excluded heading sections. Right-click on headings to add sections.',
					cls: 'word-count-empty-headings'
				});
				return;
			}

			this.plugin.settings.excludeHeadingSections.forEach((heading, index) => {
				const headingItem = headingsList.createDiv({ cls: 'word-count-heading-item' });
				
				// Extract heading level and text for display
				const headingMatch = heading.match(/^(#{1,6})\s+(.*)$/);
				const headingLevel = headingMatch ? headingMatch[1].length : 1;
				const headingText = headingMatch ? headingMatch[2] : heading;
				
				const headingInfo = headingItem.createDiv({ cls: 'word-count-heading-info' });
				headingInfo.createSpan({ 
					text: `H${headingLevel}`,
					cls: 'word-count-heading-level'
				});
				headingInfo.createSpan({ 
					text: headingText,
					cls: 'word-count-heading-text'
				});

				const headingActions = headingItem.createDiv({ cls: 'word-count-heading-actions' });
				
				const editButton = headingActions.createEl('button', {
					text: 'Edit',
					cls: 'word-count-heading-btn word-count-heading-edit'
				});
				
				const deleteButton = headingActions.createEl('button', {
					text: 'Delete',
					cls: 'word-count-heading-btn word-count-heading-delete'
				});

				editButton.onclick = async () => {
					// Create inline editor
					const originalText = headingInfo.querySelector('.word-count-heading-text');
					if (!originalText) return;
					
					const input = document.createElement('input');
					input.type = 'text';
					input.value = heading;
					input.className = 'word-count-heading-edit-input';
					
					// Replace the text with input
					originalText.replaceWith(input);
					input.focus();
					input.select();
					
					const saveEdit = async () => {
						const newValue = input.value.trim();
						if (newValue && newValue !== heading) {
							this.plugin.settings.excludeHeadingSections[index] = newValue;
							await this.plugin.saveSettings();
						}
						renderHeadingsList();
					};
					
					const cancelEdit = () => {
						renderHeadingsList();
					};
					
					input.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							saveEdit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							cancelEdit();
						}
					});
					
					input.addEventListener('blur', saveEdit);
				};

				deleteButton.onclick = async () => {
					this.plugin.settings.excludeHeadingSections.splice(index, 1);
					await this.plugin.saveSettings();
					renderHeadingsList();
				};
			});
		};

		// Initial render
		renderHeadingsList();

		// Store reference for updates
		(this as any).renderHeadingsList = renderHeadingsList;

		// Words and Phrases Exclusion Settings
		const wordsAndPhrasesContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(wordsAndPhrasesContainer)
			.setName('Exclude words and phrases from text analysis')
			.setDesc('When enabled, specific words and phrases will be excluded from word, character, and sentence counts. • Property: exclude-words-phrases')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeWordsAndPhrases)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeWordsAndPhrases = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		const wordsAndPhrasesSettingsContainer = wordsAndPhrasesContainer.createDiv({ cls: 'word-count-container-indented word-count-settings-group word-count-words-phrases-settings' });

		// Words exclusion subsection
		const wordsSubsection = wordsAndPhrasesSettingsContainer.createDiv({ cls: 'word-count-subsection' });
		new Setting(wordsSubsection)
			.setName('Excluded words')
			.setDesc('Comma-separated list of words to exclude (case-insensitive, exact matches only). (Requires words/phrases exclusion to be enabled)')
			.addText((text: any) => text
				.setPlaceholder('the, and, or, but')
				.setValue(this.plugin.settings.excludedWords)
				.onChange(async (value: string) => {
					this.plugin.settings.excludedWords = value;
					await this.plugin.saveSettings();
				}));

		// Phrases exclusion subsection
		const phrasesSubsection = wordsAndPhrasesSettingsContainer.createDiv({ cls: 'word-count-subsection' });
		const phrasesHeader = phrasesSubsection.createDiv({ cls: 'word-count-subsection-header' });
		phrasesHeader.createEl('strong', { text: 'Excluded phrases' });
		phrasesHeader.createEl('p', { 
			text: 'Select text in any note and right-click to add phrases. (Requires words/phrases exclusion to be enabled)',
			cls: 'word-count-subsection-desc'
		});

		const phrasesList = phrasesSubsection.createDiv({ cls: 'word-count-phrases-list' });

		// Function to render phrases list
		const renderPhrasesList = () => {
			phrasesList.empty();
			
			if (!this.plugin.settings.excludedPhrases || this.plugin.settings.excludedPhrases.length === 0) {
				phrasesList.createDiv({ 
					text: 'No excluded phrases. Right-click selected text to add phrases.',
					cls: 'word-count-empty-phrases'
				});
				return;
			}

			this.plugin.settings.excludedPhrases.forEach((phrase, index) => {
				const phraseItem = phrasesList.createDiv({ cls: 'word-count-phrase-item' });
				
				const phraseText = phraseItem.createSpan({ 
					text: phrase,
					cls: 'word-count-phrase-text'
				});

				const phraseActions = phraseItem.createDiv({ cls: 'word-count-phrase-actions' });
				
				const editButton = phraseActions.createEl('button', {
					text: 'Edit',
					cls: 'word-count-phrase-btn word-count-phrase-edit'
				});
				
				const deleteButton = phraseActions.createEl('button', {
					text: 'Delete',
					cls: 'word-count-phrase-btn word-count-phrase-delete'
				});

				editButton.onclick = async () => {
					// Create inline editor
					const input = document.createElement('input');
					input.type = 'text';
					input.value = phrase;
					input.className = 'word-count-phrase-edit-input';
					
					// Replace the text with input
					phraseText.replaceWith(input);
					input.focus();
					input.select();
					
					const saveEdit = async () => {
						const newValue = input.value.trim();
						if (newValue && newValue !== phrase) {
							this.plugin.settings.excludedPhrases[index] = newValue;
							await this.plugin.saveSettings();
						}
						renderPhrasesList();
					};
					
					const cancelEdit = () => {
						renderPhrasesList();
					};
					
					input.addEventListener('keydown', (e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							saveEdit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							cancelEdit();
						}
					});
					
					input.addEventListener('blur', saveEdit);
				};

				deleteButton.onclick = async () => {
					this.plugin.settings.excludedPhrases.splice(index, 1);
					await this.plugin.saveSettings();
					renderPhrasesList();
				};
			});
		};

		// Initial render
		renderPhrasesList();

		// Store reference for updates
		(this as any).renderPhrasesList = renderPhrasesList;


		const debugContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(debugContainer)
			.setName('Enable debug logging')
			.setDesc('Enable detailed logging for troubleshooting. May impact performance.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.enableDebugLogging)
				.onChange(async (value: boolean) => {
					this.plugin.settings.enableDebugLogging = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}));

		// Export Log Files (only visible when debug logging is enabled)
		const exportLogsContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(exportLogsContainer)
			.setName('Export log files')
			.setDesc('Export debug log files with timestamp for troubleshooting. Format: ocswcp-logs-YYYYMMDD-HHMMSS.json')
			.addButton((button: any) => button
				.setButtonText('Export Logs')
				.setTooltip('Export current log files')
				.onClick(async () => {
					await this.exportLogFiles();
				}));

		// Advanced Section
		
		const advSep = containerEl.createEl('hr', { cls: 'word-count-advanced-separator' });
		const advancedSection = containerEl.createEl('details', { cls: 'word-count-advanced-section' });
		const advSummary = advancedSection.createEl('summary', { 
			text: '⚠️ Custom word detection regex (expert only)',
			cls: 'word-count-advanced-summary'
		});

		const advDesc = advancedSection.createDiv();
		advDesc.createEl('p', { text: 'Enable and define a custom regex for word detection. Incorrect regex may cause inaccurate counts or performance issues. Use with caution.' });

		// Enable toggle
		const advToggle = new Setting(advDesc)
			.setName('Enable advanced regex (expert only)')
			.setDesc('Allow custom regex for word detection. For advanced users only.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.enableAdvancedRegex ?? false)
				.onChange(async (value: boolean) => {
					this.plugin.settings.enableAdvancedRegex = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				})
			);

		// Regex Input Field
		const regexSetting = new Setting(advDesc)
			.setName('Custom word detection regex')
			.setDesc('Define a regular expression pattern for word detection. Default: [A-Za-z0-9]+(?:[\\u2018\\u2019\'-_][A-Za-z0-9]+)*')
			.addText((text: any) => text
				.setPlaceholder('[A-Za-z0-9]+(?:[\\u2018\\u2019\'-_][A-Za-z0-9]+)*')
				.setValue(this.plugin.settings.customWordRegex || '')
				.onChange(async (value: string) => {
					this.plugin.settings.customWordRegex = value;
					await this.plugin.saveSettings();
					this.updateRegexTest();
				}));

		// Reset to Default Button
		const resetButton = advDesc.createEl('button', {
			text: 'Reset to Default',
			cls: 'mod-cta'
		});
		resetButton.onclick = async () => {
			this.plugin.settings.customWordRegex = '';
			await this.plugin.saveSettings();
			// Get the text input component and set its value
			const textComponent = regexSetting.components.find(component => component.constructor.name.includes('Text'));
			if (textComponent && 'setValue' in textComponent) {
				(textComponent as any).setValue('');
			}
			this.updateRegexTest();
		};

		// Test Area
		const testArea = advDesc.createDiv({ cls: 'word-count-test-area' });
		const testDesc = testArea.createEl('div', {
			text: 'Use the box below to see exactly which text fragments your custom regex will match.',
			cls: 'word-count-test-description'
		});

		const sampleInput = testArea.createEl('textarea', {
			cls: 'word-count-regex-sample',
			attr: {
				placeholder: 'Enter sample text to test your regex...',
				rows: '3'
			}
		});

		const wordCountDisplay = testArea.createEl('div', { cls: 'word-count-regex-wordcount' });
		const matchDisplay = testArea.createEl('div', { cls: 'word-count-regex-matches' });
		const warningDisplay = testArea.createEl('div', { cls: 'word-count-regex-warning' });

		const resetTestBtn = testArea.createEl('button', {
			text: 'Reset Test',
			cls: 'word-count-test-reset-button'
		});

		// Update regex test functionality
		this.updateRegexTest = () => {
			const sampleText = sampleInput.value || '';
			const customRegex = this.plugin.settings.customWordRegex || '\\b\\w+\\b';
			
			try {
				if (!sampleText) {
					wordCountDisplay.textContent = 'Word count: 0';
					matchDisplay.textContent = 'Matches: (enter sample text above)';
					warningDisplay.textContent = '';
					warningDisplay.style.display = 'none';
					return;
				}

				const regex = new RegExp(customRegex, 'g');
				const matches = sampleText.match(regex) || [];
				
				wordCountDisplay.textContent = `Word count: ${matches.length}`;
				matchDisplay.textContent = `Matches: [${matches.join(', ')}]`;
				warningDisplay.textContent = '';
				warningDisplay.style.display = 'none';
			} catch (error) {
				wordCountDisplay.textContent = 'Word count: Error';
				matchDisplay.textContent = 'Matches: Invalid regex';
				warningDisplay.textContent = `Error: ${error.message}`;
				warningDisplay.style.display = 'block';
			}
		};

		// Wire up test area events
		sampleInput.addEventListener('input', this.updateRegexTest);
		resetTestBtn.onclick = () => {
			sampleInput.value = '';
			this.updateRegexTest();
		};

		// Initial test update
		this.updateRegexTest();

		// Helper method to update UI visibility based on settings
		this.updateSettingsUI = () => {
			statusBarSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.showStatusBar);
			codeSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeCode);
			pathSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludePaths);
			charCountSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.showCharacterCount);
			charModeContainer.toggleClass('word-count-hidden', !this.plugin.settings.showCharacterCount);
			commentSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeComments);
			obsidianCommentContentContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeObsidianComments);
			htmlCommentContentContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeHtmlComments);
			headingSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeHeadings);
			wordsAndPhrasesSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeWordsAndPhrases);
			testArea.toggleClass('word-count-hidden', !this.plugin.settings.enableAdvancedRegex);
			exportLogsContainer.toggleClass('word-count-hidden', !this.plugin.settings.enableDebugLogging);
		};

		// Export log files functionality
		this.exportLogFiles = async () => {
			try {
				// Generate timestamp for filename
				const now = new Date();
				const timestamp = now.toISOString()
					.replace(/[-:]/g, '')
					.replace('T', '-')
					.split('.')[0]; // YYYYMMDD-HHMMSS format
				
				const filename = `ocswcp-logs-${timestamp}.json`;
				
				// Collect log data (for now, just basic plugin info and settings)
				const logData = {
					timestamp: now.toISOString(),
					plugin: {
						name: 'Custom Selected Word Count Plugin',
						version: '1.1.0',
						settings: this.plugin.settings
					},
					system: {
						userAgent: navigator.userAgent,
						platform: navigator.userAgent.includes('Windows') ? 'Windows' : 
								  navigator.userAgent.includes('Mac') ? 'macOS' : 
								  navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown',
						language: navigator.language
					},
					obsidian: {
						version: (this.app as any).appVersion || 'unknown'
					}
				};
				
				// Create and download the file
				const jsonString = JSON.stringify(logData, null, 2);
				const blob = new Blob([jsonString], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				
				new Notice(`Log files exported as ${filename}`);
			} catch (error) {
				new Notice(`Failed to export log files: ${error.message}`);
				console.error('Log export error:', error);
			}
		};

		// Initial UI update
		this.updateSettingsUI();
	}
}
