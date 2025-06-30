// BUILD: 2025-05-07

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

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
	// Comment exclusion settings
	excludeComments: boolean;        // Master toggle for comment exclusion
	excludeObsidianComments: boolean; // Toggle for Obsidian comments (%% %%)
	excludeObsidianCommentContent: boolean; // Toggle for Obsidian comment content
	excludeHtmlComments: boolean;    // Toggle for HTML comments (<!-- -->)
	excludeHtmlCommentContent: boolean; // Toggle for HTML comment content

	enableDebugLogging: boolean;     // Toggle for debug logging
	// Advanced Regex
	enableAdvancedRegex?: boolean;   // Toggle for advanced regex (default: false)
	customWordRegex?: string;        // User-defined regex pattern
}

const DEFAULT_EXCLUSION_LIST = '.jpg, .jpeg, .png, .gif, .svg, .md, .pdf, .docx, .xlsx, .pptx, .zip, .mp3, .mp4, .wav, .ogg, .webm, .mov, .avi, .exe, .dll, .bat, .sh, .ps1, .js, .ts, .json, .csv, .yml, .yaml, .html, .css, .scss, .xml, .ini, .log, .tmp, .bak, .db, .sqlite, .7z, .rar, .tar, .gz, .bz2, .iso, .img, .bin, .apk, .app, .dmg, .pkg, .deb, .rpm, .msi, .sys, .dat, .sav, .bak, .old, .swp, .lock, .cache, .part, .crdownload, .torrent, .ics, .eml, .msg, .vcf, .txt';

const DEFAULT_WORD_REGEX = '[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*';

const DEFAULT_SETTINGS: WordCountPluginSettings = {
	setting: 'default',
	showDateTimeInHistory: false,
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
	// Comment exclusion defaults
	excludeComments: false,          // Comment exclusion disabled by default
	excludeObsidianComments: false,  // Obsidian comment exclusion disabled by default
	excludeObsidianCommentContent: false, // Obsidian comment content exclusion disabled by default
	excludeHtmlComments: false,      // HTML comment exclusion disabled by default
	excludeHtmlCommentContent: false, // HTML comment content exclusion disabled by default

	enableDebugLogging: false,       // Debug logging disabled by default
	// Advanced Regex
	enableAdvancedRegex: false,
	customWordRegex: DEFAULT_WORD_REGEX,
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
 * Counts characters in the selected text according to the plugin specification.
 * @param selectedText The text to analyze.
 * @param mode Character counting mode: 'all', 'no-spaces', or 'letters-only'.
 * @param settings The plugin settings.
 * @param plugin The plugin instance for debug logging.
 * @returns The character count as an integer.
 */
function countSelectedCharacters(
	selectedText: string,
	mode: 'all' | 'no-spaces' | 'letters-only' = 'all',
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin
): number {
	if (!selectedText) return 0;
	
	if (plugin) debugLog(plugin, 'Counting characters in mode:', mode);
	
	let processedText = selectedText;
	
	// Process comments before character counting
	if (settings?.excludeComments) {
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
		
		if (plugin) debugLog(plugin, 'Text after comment processing (char count):', processedText);
	}
	
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
 * @returns The sentence count as an integer.
 */
function countSelectedSentences(
	selectedText: string,
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin
): number {
	if (!selectedText) return 0;
	
	if (plugin) debugLog(plugin, 'Counting sentences in text:', selectedText);
	
	let processedText = selectedText;
	
	// Process comments before sentence counting
	if (settings?.excludeComments) {
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
		
		if (plugin) debugLog(plugin, 'Text after comment processing (sentence count):', processedText);
	}
	
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
 * @returns Object containing both word and character counts.
 */
function countSelectedText(
	selectedText: string,
	excludedExtensions: string[] = [],
	stripEmojis: boolean = true,
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin
): CountResult {
	if (!selectedText) return { words: 0, characters: 0, sentences: 0 };

	// Count characters from the original text first
	const characterCount = countSelectedCharacters(
		selectedText, 
		settings?.characterCountMode || 'all',
		settings,
		plugin
	);

	// Count sentences from the original text
	const sentenceCount = countSelectedSentences(
		selectedText,
		settings,
		plugin
	);

	// Now perform word counting (keeping existing logic)
	const wordCount = countSelectedWords(
		selectedText,
		excludedExtensions,
		stripEmojis,
		settings,
		plugin
	);

	return { words: wordCount, characters: characterCount, sentences: sentenceCount };
}

/**
 * Counts words in the selected text according to the plugin specification.
 * @param selectedText The text to analyze.
 * @param excludedExtensions Array of file extensions to exclude (e.g., ['.jpg', '.png']).
 * @param stripEmojis Whether to strip emojis from the count (default: true).
 * @param settings The plugin settings.
 * @returns The word count as an integer.
 */
function countSelectedWords(
	selectedText: string,
	excludedExtensions: string[] = [],
	stripEmojis: boolean = true,
	settings?: WordCountPluginSettings,
	plugin?: CustomSelectedWordCountPlugin
): number {
	if (!selectedText) return 0;

	// Debug logging
	if (plugin) debugLog(plugin, 'Initial text:', selectedText);

	// Process comments before any other text processing
	if (settings?.excludeComments) {
		// Process Obsidian comments
		if (settings.excludeObsidianComments) {
			selectedText = processObsidianComments(
				selectedText,
				true,
				settings.excludeObsidianCommentContent,
				plugin
			);
		}
		
		// Process HTML comments
		if (settings.excludeHtmlComments) {
			selectedText = processHtmlComments(
				selectedText,
				true,
				settings.excludeHtmlCommentContent,
				plugin
			);
		}
		
		if (plugin) debugLog(plugin, 'Text after comment processing:', selectedText);
	}

	// Strip backticks before any other processing
	selectedText = selectedText.replace(/`/g, '');

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
			if (settings.excludeWindowsPaths) {
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
				if (settings.excludeWindowsPaths) {
					if (plugin) debugLog(plugin, 'Matched Windows path with environment variable');
					return true;
				}
				if (plugin) debugLog(plugin, 'Windows path with environment variable detected but exclusion disabled');
				return false;
			}
			
			if (settings.excludeEnvironmentPaths) {
				if (plugin) debugLog(plugin, 'Matched environment variable');
				return true;
			}
			if (plugin) debugLog(plugin, 'Environment variable detected but exclusion disabled');
			return false;
		}

		// UNC paths (\\server\share) - check original string
		if (/^\\\\[^\\]+\\[^\\]+/.test(str)) {
			if (settings.excludeUNCPaths) {
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
			if (settings.excludeUnixPaths) {
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

	// Strip quotes and emojis
	selectedText = selectedText.replace(/["'''""]/g, '');
	if (stripEmojis) {
		selectedText = selectedText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
	}

	// Use advanced regex if enabled and valid
	let wordRegex: RegExp;
	if (settings?.enableAdvancedRegex && settings.customWordRegex) {
		try {
			wordRegex = new RegExp(settings.customWordRegex, 'giu');
		} catch (e) {
			if (plugin) debugLog(plugin, 'Invalid custom regex, falling back to default:', e);
			wordRegex = /[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*/giu;
		}
	} else {
		wordRegex = /[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*/giu;
	}

	// At the end, use wordRegex to match words
	const matches = selectedText.match(wordRegex);
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
			this.handleWordCount();
		});

		// Register for selection changes if live updates are enabled
		if (this.settings.enableLiveCount) {
			// Remove any existing listener first
			document.removeEventListener('selectionchange', this.handleSelectionChange);
			// Add the new listener
			document.addEventListener('selectionchange', this.handleSelectionChange);
			this.log('Selection change listener registered for live updates');
		} else {
			this.log('Live updates disabled, no selection listener added');
		}

		// Initial update of the status bar
		this.log('Performing initial status bar update');
		this.updateStatusBar();
	}

	private handleSelectionChange = () => {
		this.log('Selection changed event triggered');
		
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		
		this.debounceTimer = setTimeout(() => {
			this.log('Debounced selection change - updating status bar');
			this.updateStatusBar();
		}, 300); // 300ms debounce
	};

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
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			
			if (!view) {
				this.log('No active markdown view found');
				new Notice('Please open a markdown file first');
				return;
			}

			this.log('View mode:', view.getMode());

			if (view.getMode() === 'source') {
				// Source mode
				selectedText = view.editor.getSelection();
				this.log('Source mode selection:', selectedText);
			} else if (view.getMode() === 'preview') {
				// Reading view mode
				const selection = window.getSelection();
				this.log('Reading view selection object:', selection);
				
				// First find the markdown preview container
				const previewContainer = view.containerEl.querySelector('.markdown-preview-view');
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
				selectedText = view.editor.getSelection();
				this.log('Live Preview mode selection:', selectedText);
			}

			if (!selectedText) {
				this.log('No text selected');
				new Notice('No text selected');
				return;
			}

			this.log('Processing selection:', selectedText);
			const exclusions = this.settings.exclusionList.split(',').map(e => e.trim()).filter(e => e);
			const countResult = countSelectedText(selectedText, exclusions, true, this.settings, this);

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

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			this.statusBarItem.setText('');
			this.log('No active markdown view found');
			return;
		}

		this.log('Updating status bar for view mode:', view.getMode());

		let selectedText = '';
		if (view.getMode() === 'source') {
			selectedText = view.editor.getSelection();
		} else if (view.getMode() === 'preview') {
			const selection = window.getSelection();
			if (selection && selection.toString()) {
				selectedText = selection.toString();
			}
		} else {
			// Live Preview mode (default case)
			selectedText = view.editor.getSelection();
		}

		this.log('Selected text length:', selectedText.length, 'Text preview:', selectedText.substring(0, 50));

		if (!selectedText) {
			this.statusBarItem.setText('');
			this.log('No text selected, clearing status bar');
			return;
		}

		const wordCount = count ?? countSelectedWords(
			selectedText,
			this.settings.exclusionList.split(',').map(e => e.trim()).filter(e => e),
			true,
			this.settings,
			this
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

		// Modal header
		const headerEl = contentEl.createDiv({cls: 'modal-header'});
		const titleEl = headerEl.createEl('h2', {cls: 'modal-title'});
		titleEl.createSpan({cls: 'lucide lucide-bar-chart-3'});
		titleEl.appendText('Selection Analysis');

		// Modal content
		const modalContentEl = contentEl.createDiv({cls: 'modal-content'});

		// Count cards section
		const countCardsEl = modalContentEl.createDiv({cls: 'count-cards'});
		
		// Word count card
		const wordCountCard = countCardsEl.createDiv({cls: 'count-card'});
		const wordCountHeader = wordCountCard.createDiv({cls: 'count-header'});
		
		const wordCountLabel = wordCountHeader.createDiv({cls: 'count-label'});
		wordCountLabel.createSpan({cls: 'lucide lucide-type'});
		wordCountLabel.appendText('Words');
		
		const copyWordButton = wordCountHeader.createEl('button', {
			cls: 'copy-button'
		});
		copyWordButton.createSpan({cls: 'lucide lucide-copy'});
		copyWordButton.appendText('Copy');
		
		wordCountCard.createDiv({cls: 'count-value', text: this.countResult.words.toString()});
		wordCountCard.createDiv({cls: 'count-subtitle', text: 'advanced word detection'});
		
		copyWordButton.addEventListener('click', async () => {
			await navigator.clipboard.writeText(this.countResult.words.toString());
			new Notice('Word count copied to clipboard');
		});

		// Character count card (if enabled in settings)
		if (this.plugin?.settings.showCharacterCount) {
			const charCountCard = countCardsEl.createDiv({cls: 'count-card'});
			const charCountHeader = charCountCard.createDiv({cls: 'count-header'});
			
			const charCountLabel = charCountHeader.createDiv({cls: 'count-label'});
			charCountLabel.createSpan({cls: 'lucide lucide-hash'});
			charCountLabel.appendText('Characters');
			
			const copyCharButton = charCountHeader.createEl('button', {
				cls: 'copy-button'
			});
			copyCharButton.createSpan({cls: 'lucide lucide-copy'});
			copyCharButton.appendText('Copy');
			
			charCountCard.createDiv({cls: 'count-value', text: this.countResult.characters.toString()});
			
			const modeText = this.plugin.settings.characterCountMode === 'all' ? 'all characters (including spaces)' : 
							this.plugin.settings.characterCountMode === 'no-spaces' ? 'all characters (excluding spaces)' : 'letters only';
			charCountCard.createDiv({cls: 'count-subtitle', text: modeText});
			
			copyCharButton.addEventListener('click', async () => {
				await navigator.clipboard.writeText(this.countResult.characters.toString());
				new Notice('Character count copied to clipboard');
			});
		}

		// Sentence count card (if enabled in settings)
		if (this.plugin?.settings.showSentenceCount) {
			const sentenceCountCard = countCardsEl.createDiv({cls: 'count-card'});
			const sentenceCountHeader = sentenceCountCard.createDiv({cls: 'count-header'});
			
			const sentenceCountLabel = sentenceCountHeader.createDiv({cls: 'count-label'});
			sentenceCountLabel.createSpan({cls: 'lucide lucide-list-ordered'});
			sentenceCountLabel.appendText('Sentences');
			
			const copySentenceButton = sentenceCountHeader.createEl('button', {
				cls: 'copy-button'
			});
			copySentenceButton.createSpan({cls: 'lucide lucide-copy'});
			copySentenceButton.appendText('Copy');
			
			sentenceCountCard.createDiv({cls: 'count-value', text: this.countResult.sentences.toString()});
			sentenceCountCard.createDiv({cls: 'count-subtitle', text: 'based on punctuation patterns'});
			
			copySentenceButton.addEventListener('click', async () => {
				await navigator.clipboard.writeText(this.countResult.sentences.toString());
				new Notice('Sentence count copied to clipboard');
			});
		}

		// History section
		if (this.history.length > 0) {
			const historySection = modalContentEl.createDiv({cls: 'history-section'});
			
			const historyHeader = historySection.createDiv({cls: 'history-header'});
			const historyTitle = historyHeader.createEl('h3', {cls: 'history-title'});
			historyTitle.createSpan({cls: 'lucide lucide-clock'});
			historyTitle.appendText('Recent Counts');
			
			const clearButton = historyHeader.createEl('button', {
				cls: 'clear-btn'
			});
			clearButton.createSpan({cls: 'lucide lucide-trash-2'});
			clearButton.appendText('Clear');
			
			clearButton.addEventListener('click', () => {
				if (this.plugin) {
					this.plugin.history = [];
					this.plugin.saveHistory();
					this.close();
				}
			});

			const historyList = historySection.createDiv({cls: 'history-list'});

			this.history.slice().reverse().forEach(entry => {
				const historyEntry = historyList.createDiv({cls: 'history-entry'});
				
				let countText = this.showDateTime 
					? `${entry.count} words (${entry.date.toLocaleString()})`
					: `${entry.count} words`;
				
				// Add character count if available and character count is enabled
				if (entry.characterCount !== undefined && this.plugin?.settings.showCharacterCount) {
					const charPart = this.showDateTime 
						? `, ${entry.characterCount} chars`
						: ` | ${entry.characterCount} chars`;
					countText += charPart;
				}

				// Add sentence count if available and sentence count is enabled
				if (entry.sentenceCount !== undefined && this.plugin?.settings.showSentenceCount) {
					const sentencePart = this.showDateTime 
						? `, ${entry.sentenceCount} sentences`
						: ` | ${entry.sentenceCount} sentences`;
					countText += sentencePart;
				}
				
				historyEntry.createDiv({cls: 'history-text', text: countText});
				
				const historyActions = historyEntry.createDiv({cls: 'history-actions'});
				
				const entryCopyButton = historyActions.createEl('button', {
					cls: 'history-copy-btn'
				});
				entryCopyButton.createSpan({cls: 'lucide lucide-copy'});
				entryCopyButton.appendText('Words');
				
				entryCopyButton.addEventListener('click', async () => {
					await navigator.clipboard.writeText(entry.count.toString());
					new Notice('Word count copied to clipboard');
				});

				// Add character count copy button if character count exists and is enabled
				if (entry.characterCount !== undefined && this.plugin?.settings.showCharacterCount) {
					const entryCharCopyButton = historyActions.createEl('button', {
						cls: 'history-copy-btn'
					});
					entryCharCopyButton.createSpan({cls: 'lucide lucide-copy'});
					entryCharCopyButton.appendText('Chars');
					
					entryCharCopyButton.addEventListener('click', async () => {
						await navigator.clipboard.writeText(entry.characterCount!.toString());
						new Notice('Character count copied to clipboard');
					});
				}

				// Add sentence count copy button if sentence count exists and is enabled
				if (entry.sentenceCount !== undefined && this.plugin?.settings.showSentenceCount) {
					const entrySentenceCopyButton = historyActions.createEl('button', {
						cls: 'history-copy-btn'
					});
					entrySentenceCopyButton.createSpan({cls: 'lucide lucide-copy'});
					entrySentenceCopyButton.appendText('Sentences');
					
					entrySentenceCopyButton.addEventListener('click', async () => {
						await navigator.clipboard.writeText(entry.sentenceCount!.toString());
						new Notice('Sentence count copied to clipboard');
					});
				}
			});
		}

		// Modal footer
		const footerEl = contentEl.createDiv({cls: 'modal-footer'});
		const closeButton = footerEl.createEl('button', {cls: 'close-btn'});
		closeButton.createSpan({cls: 'lucide lucide-check'});
		closeButton.appendText('Done');
		
		closeButton.addEventListener('click', () => {
			this.close();
		});
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

		// Live Update Setting
		const liveUpdateContainer = statusBarContainer.createDiv({ cls: 'word-count-container-indented' });
		new Setting(liveUpdateContainer)
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
		const hideWordCountContainer = statusBarContainer.createDiv({ cls: 'word-count-container-indented' });
		new Setting(hideWordCountContainer)
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
		const labelContainer = statusBarContainer.createDiv({ cls: 'word-count-container-indented' });
		new Setting(labelContainer)
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
			.setDesc('Exclude paths starting with drive letters (e.g., C:\\). (Requires path exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeWindowsPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeWindowsPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude Unix paths')
			.setDesc('Exclude Unix-style paths starting with forward slash (e.g., /usr/local). (Requires path exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeUnixPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeUnixPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude UNC paths')
			.setDesc('Exclude network paths starting with double backslash (e.g., \\\\server\\share). (Requires path exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeUNCPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeUNCPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude environment paths')
			.setDesc('Exclude environment variable paths (e.g., %USERPROFILE%, $HOME). (Requires path exclusion to be enabled)')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.excludeEnvironmentPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeEnvironmentPaths = value;
					await this.plugin.saveSettings();
				}));

		// Character Count Settings
		new Setting(containerEl).setName('Character counting').setHeading();

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

		// Comment Exclusion Settings
		new Setting(containerEl).setName('Exclude comments').setHeading();

		const commentContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(commentContainer)
			.setName('Exclude comments from text analysis')
			.setDesc('When enabled, comments will be excluded from word, character, and sentence counts.')
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

		// History & Debug Settings
		new Setting(containerEl).setName('History & debug').setHeading();

		new Setting(containerEl)
			.setName('Show date/time in history')
			.setDesc('Include timestamps when displaying word count history.')
			.addToggle((toggle: any) => toggle
				.setValue(this.plugin.settings.showDateTimeInHistory)
				.onChange(async (value: boolean) => {
					this.plugin.settings.showDateTimeInHistory = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
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
			text: '⚠️ Custom Word Detection Regex (Expert Only)',
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
			.setDesc('Define a regular expression pattern for word detection. Default: \\b\\w+\\b')
			.addText((text: any) => text
				.setPlaceholder('\\b\\w+\\b')
				.setValue(this.plugin.settings.customWordRegex || '\\b\\w+\\b')
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
			this.plugin.settings.customWordRegex = '\\b\\w+\\b';
			await this.plugin.saveSettings();
			// Get the text input component and set its value
			const textComponent = regexSetting.components.find(component => component.constructor.name.includes('Text'));
			if (textComponent && 'setValue' in textComponent) {
				(textComponent as any).setValue('\\b\\w+\\b');
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
			liveUpdateContainer.toggleClass('word-count-hidden', !this.plugin.settings.showStatusBar);
			hideWordCountContainer.toggleClass('word-count-hidden', !this.plugin.settings.showStatusBar);
			labelContainer.toggleClass('word-count-hidden', !this.plugin.settings.showStatusBar);
			pathSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludePaths);
			charCountSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.showCharacterCount);
			charModeContainer.toggleClass('word-count-hidden', !this.plugin.settings.showCharacterCount);
			commentSettingsContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeComments);
			obsidianCommentContentContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeObsidianComments);
			htmlCommentContentContainer.toggleClass('word-count-hidden', !this.plugin.settings.excludeHtmlComments);
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
