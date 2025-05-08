// BUILD: 2025-05-05

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
	// Ribbon button setting
	showRibbonButton: boolean;       // Toggle for ribbon button visibility
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
	// Ribbon button default
	showRibbonButton: false,        // Hidden by default
	enableDebugLogging: false,       // Debug logging disabled by default
	// Advanced Regex
	enableAdvancedRegex: false,
	customWordRegex: DEFAULT_WORD_REGEX,
}

interface WordCountHistoryEntry {
	count: number;
	date: Date;
}

function debugLog(plugin: CustomSelectedWordCountPlugin, message: string, ...args: any[]) {
	if (plugin.settings.enableDebugLogging) {
		console.log(`[Word Count Debug] ${message}`, ...args);
	}
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
	settings?: WordCountPluginSettings
): number {
	if (!selectedText) return 0;

	// Debug logging
	debugLog(this, 'Initial text:', selectedText);

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
		debugLog(this, 'Checking path:', str);

		// Check each path type with its original format
		// Windows drive letter paths (C:\ or C:/)
		if (/^[A-Za-z]:[\/\\]/.test(str)) {
			if (settings.excludeWindowsPaths) {
				debugLog(this, 'Matched Windows drive path');
				return true;
			}
			debugLog(this, 'Windows path detected but exclusion disabled');
			return false;
		}

		// Environment variables - check original string
		if (/^(?:%[^%]+%|\$[A-Za-z_][A-Za-z0-9_]*)/.test(str)) {
			// Check if this is a Windows path with an environment variable
			if (/^%[^%]+%[\/\\]/.test(str)) {
				if (settings.excludeWindowsPaths) {
					debugLog(this, 'Matched Windows path with environment variable');
					return true;
				}
				debugLog(this, 'Windows path with environment variable detected but exclusion disabled');
				return false;
			}
			
			if (settings.excludeEnvironmentPaths) {
				debugLog(this, 'Matched environment variable');
				return true;
			}
			debugLog(this, 'Environment variable detected but exclusion disabled');
			return false;
		}

		// UNC paths (\\server\share) - check original string
		if (/^\\\\[^\\]+\\[^\\]+/.test(str)) {
			if (settings.excludeUNCPaths) {
				debugLog(this, 'Matched UNC path');
				return true;
			}
			debugLog(this, 'UNC path detected but exclusion disabled');
			return false;
		}

		// Now normalize for other checks
		const normalizedStr = normalizePath(str);

		// file:/// protocol
		if (/^file:\/\/\//.test(normalizedStr)) {
			debugLog(this, 'Matched file:/// protocol');
			return true;
		}

		// Unix paths (/usr/local)
		if (/^\/[^\/]/.test(normalizedStr)) {
			if (settings.excludeUnixPaths) {
				debugLog(this, 'Matched Unix path');
				return true;
			}
			debugLog(this, 'Unix path detected but exclusion disabled');
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
	debugLog(this, 'Raw segments:', rawSegments);

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
				debugLog(this, 'Path continues with:', segment);
			} else {
				debugLog(this, 'Path continuation check failed, reverting');
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
			debugLog(this, 'Excluding final path:', buffer);
		} else {
			segments.push(...buffer.split(/\s+/));
		}
	}

	debugLog(this, 'Processed segments:', segments);

	// Filter out paths and handle extensions
	const filteredWords = segments.filter(word => {
		if (!word.trim()) return false;
		
		// Always keep decimal numbers
		if (/^\d+\.\d+$/.test(word)) return true;
		
		if (hasExcludedExtension(word)) return false;
		if (settings?.excludePaths && looksLikePath(word)) return false;

		return true;
	});

	debugLog(this, 'Filtered words:', filteredWords);
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
			console.warn('Invalid custom regex, falling back to default:', e);
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

		// Add permanent styling class
		document.body.addClass('custom-word-count-plugin');

		// Add necessary classes based on settings
		this.updateClasses();

		// Add status bar item if enabled
		if (this.settings.showStatusBar) {
			this.setupStatusBar();
		}

		// Apply core word count hiding if enabled
		this.addCoreWordCountStyle();

		// Set up ribbon button if enabled
		if (this.settings.showRibbonButton) {
			this.setupRibbonButton();
		}

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
		const body = document.body;
		
		// Status bar visibility
		body.toggleClass('custom-word-count-show-status', this.settings.showStatusBar);
		
		// Core word count visibility
		body.toggleClass('custom-word-count-hide-core', this.settings.hideCoreWordCount);
		
		// Live updates
		body.toggleClass('custom-word-count-live-updates', this.settings.enableLiveCount);
		
		// Path exclusion classes
		body.toggleClass('custom-word-count-exclude-paths', this.settings.excludePaths);
		body.toggleClass('custom-word-count-exclude-windows', this.settings.excludeWindowsPaths);
		body.toggleClass('custom-word-count-exclude-unix', this.settings.excludeUnixPaths);
		body.toggleClass('custom-word-count-exclude-unc', this.settings.excludeUNCPaths);
		body.toggleClass('custom-word-count-exclude-env', this.settings.excludeEnvironmentPaths);
	}

	public setupStatusBar() {
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
		
		if (!this.settings.showStatusBar) {
			this.statusBarItem = null;
			return;
		}
		
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('plugin-word-count');
		
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
		}

		// Initial update of the status bar
		this.updateStatusBar();
	}

	private handleSelectionChange = () => {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		
		this.debounceTimer = setTimeout(() => {
			this.updateStatusBar();
		}, 300); // 300ms debounce
	};

	private setupRibbonButton() {
		// Remove existing button if it exists
		if (this.ribbonButton) {
			this.ribbonButton.remove();
			this.ribbonButton = null;
		}

		// Only create if enabled
		if (this.settings.showRibbonButton) {
			this.ribbonButton = this.addRibbonIcon(
				'hash',
				'Count Selected Words',
				async () => {
					await this.handleWordCount();
				}
			);
			this.ribbonButton.addClass('custom-word-count-ribbon');
			this.ribbonButton.setAttribute('title', 'Count words in selected text');
		}
	}

	private log(message: string, ...args: any[]) {
		if (this.settings.enableDebugLogging) {
			console.log(message, ...args);
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
			const wordCount = countSelectedWords(selectedText, exclusions, true, this.settings);

			// Update status bar if it exists
			if (this.statusBarItem) {
				this.updateStatusBar(wordCount);
			}

			// Add to history
			this.history.unshift({ count: wordCount, date: new Date() });
			if (this.history.length > 50) this.history.pop();
			await this.saveHistory();

			this.log('Opening modal with count:', wordCount);
			// Open the modal
			const modal = new WordCountModal(this.app, wordCount, this.history, this.settings.showDateTimeInHistory, this);
			modal.open();

		} catch (error) {
			console.error('Error in word count command:', error);
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

		// Remove permanent styling class
		document.body.removeClass('custom-word-count-plugin');
	}

	private updateStatusBar(count?: number) {
		if (!this.statusBarItem || !this.settings.showStatusBar) return;

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			this.statusBarItem.setText('');
			return;
		}

		let selectedText = '';
		if (view.getMode() === 'source') {
			selectedText = view.editor.getSelection();
		} else if (view.getMode() === 'preview') {
			const selection = window.getSelection();
			if (selection && selection.toString()) {
				selectedText = selection.toString();
			}
		}

		if (!selectedText) {
			this.statusBarItem.setText('');
			return;
		}

		const wordCount = count ?? countSelectedWords(
			selectedText,
			this.settings.exclusionList.split(',').map(e => e.trim()).filter(e => e),
			true,
			this.settings
		);

		this.statusBarItem.setText(`${this.settings.statusBarLabel}${wordCount}`);
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
					.status-bar-item.plugin-word-count {
						display: none;
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
	wordCount: number;
	history: WordCountHistoryEntry[];
	showDateTime: boolean;
	plugin: CustomSelectedWordCountPlugin | null;
	constructor(app: App, wordCount: number, history: WordCountHistoryEntry[], showDateTime: boolean, plugin: CustomSelectedWordCountPlugin | null = null) {
		super(app);
		this.wordCount = wordCount;
		this.history = history;
		this.showDateTime = showDateTime;
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		contentEl.addClass('word-count-modal');

		// Current count section
		const currentCountEl = contentEl.createDiv({cls: 'current-count'});
		currentCountEl.createSpan({text: `Selected word count: ${this.wordCount}`});
		
		const copyButton = currentCountEl.createEl('button', {
			cls: 'copy-button',
			text: 'Copy'
		});
		
		copyButton.addEventListener('click', async () => {
			await navigator.clipboard.writeText(this.wordCount.toString());
			new Notice('Word count copied to clipboard');
		});

		// History section
		if (this.history.length > 0) {
			const historySection = contentEl.createDiv({cls: 'history-section'});
			
			const historyHeader = historySection.createDiv({cls: 'history-header'});
			historyHeader.createSpan({text: 'History'});
			
			const clearButton = historyHeader.createEl('button', {
				cls: 'copy-button',
				text: 'Clear History'
			});
			
			clearButton.addEventListener('click', () => {
				if (this.plugin) {
					this.plugin.history = [];
					this.plugin.saveHistory();
					this.close();
				}
			});

			this.history.slice().reverse().forEach(entry => {
				const historyEntry = historySection.createDiv({cls: 'history-entry'});
				
				const countText = this.showDateTime 
					? `${entry.count} words (${entry.date.toLocaleString()})`
					: `${entry.count} words`;
				
				historyEntry.createSpan({text: countText});
				
				const entryCopyButton = historyEntry.createEl('button', {
					cls: 'copy-button',
					text: 'Copy'
				});
				
				entryCopyButton.addEventListener('click', async () => {
					await navigator.clipboard.writeText(entry.count.toString());
					new Notice('Word count copied to clipboard');
				});
			});
		}
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
	const section = container.createDiv({ cls: 'swc-exclusion-section' });
	section.createEl('strong', { text: title });

	// Regex row with copy button
	const regexRow = section.createDiv({ cls: 'swc-regex-row' });
	regexRow.createEl('span', { text: `Regex: ${regex}` });
	const copyBtn = regexRow.createEl('button', { text: 'Copy Regex' });
	copyBtn.onclick = () => {
		navigator.clipboard.writeText(regex);
		copyBtn.textContent = 'Copied!';
		setTimeout(() => (copyBtn.textContent = 'Copy Regex'), 1200);
	};

	// Collapsible details
	const details = section.createEl('details', { cls: 'swc-exclusion-details' });
	details.createEl('summary', { text: 'Show Explanation & Examples' });

	details.createEl('div', { text: explanation, cls: 'swc-explanation' });

	// Example matches
	const matchList = details.createEl('ul');
	matchList.createEl('li', { text: 'Example matches:' });
	matches.forEach(example => matchList.createEl('li', { text: example, cls: 'swc-match' }));

	// Example non-matches
	const nonMatchList = details.createEl('ul');
	nonMatchList.createEl('li', { text: 'Example non-matches:' });
	nonMatches.forEach(example => nonMatchList.createEl('li', { text: example, cls: 'swc-nonmatch' }));
}

// Settings tab for plugin options
class WordCountSettingTab extends PluginSettingTab {
	plugin: CustomSelectedWordCountPlugin;

	constructor(app: App, plugin: CustomSelectedWordCountPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		containerEl.addClass('word-count-settings');

		containerEl.createEl('h2', { text: 'Custom Selected Word Count Settings' });

		// UI Elements Settings
		containerEl.createEl('h3', { text: 'UI Elements' });

		// Ribbon Button Setting
		new Setting(containerEl)
			.setName('Show Ribbon Button')
			.setDesc('Add a button to the ribbon menu for quick access to word counting. Changes take effect after restarting Obsidian.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRibbonButton)
				.onChange(async (value) => {
					this.plugin.settings.showRibbonButton = value;
					await this.plugin.saveSettings();
					new Notice('Restart Obsidian for ribbon button changes to take effect');
				}))
			.settingEl.addClass('swc-settings-group');

		// Status Bar Settings
		const statusBarContainer = containerEl.createDiv({ cls: 'swc-settings-group swc-status-settings' });
		new Setting(statusBarContainer)
			.setName('Show Count in Status Bar')
			.setDesc('Show the selected word count in the status bar next to Obsidian\'s built-in word count.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value) => {
					this.plugin.settings.showStatusBar = value;
					if (!value) {
						// Disable live updates if status bar is disabled
						this.plugin.settings.enableLiveCount = false;
						liveUpdateContainer.style.display = 'none';
						labelContainer.style.display = 'none';
						hideWordCountContainer.style.display = 'none';
					} else {
						liveUpdateContainer.style.display = 'block';
						labelContainer.style.display = 'block';
						hideWordCountContainer.style.display = 'block';
					}
					await this.plugin.saveSettings();
					this.plugin.setupStatusBar();
				}));

		// Live Update Setting (indented and initially hidden if status bar is disabled)
		const liveUpdateContainer = statusBarContainer.createDiv({ cls: 'swc-settings-group swc-live-update-settings' });
		liveUpdateContainer.style.paddingLeft = '20px';
		liveUpdateContainer.style.display = this.plugin.settings.showStatusBar ? 'block' : 'none';
		
		new Setting(liveUpdateContainer)
			.setName('Enable Live Updates')
			.setDesc('Update the status bar count automatically when text is selected. When disabled, the count only updates when using the command or clicking the status bar.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableLiveCount)
				.onChange(async (value) => {
					this.plugin.settings.enableLiveCount = value;
					await this.plugin.saveSettings();
					this.plugin.setupStatusBar();
				}));

		// Hide Core Word Count Setting (indented and initially hidden if status bar is disabled)
		const hideWordCountContainer = statusBarContainer.createDiv({ cls: 'swc-settings-group swc-hide-core-settings' });
		hideWordCountContainer.style.paddingLeft = '20px';
		hideWordCountContainer.style.display = this.plugin.settings.showStatusBar ? 'block' : 'none';

		new Setting(hideWordCountContainer)
			.setName('Hide Core Word Count')
			.setDesc('Hide Obsidian\'s built-in word count when the selected word count is enabled. Note: For better reliability, consider disabling the core Word Count plugin in Settings > Core plugins instead.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideCoreWordCount)
				.onChange(async (value) => {
					this.plugin.settings.hideCoreWordCount = value;
					await this.plugin.saveSettings();
					this.plugin.addCoreWordCountStyle();
				}));

		// Status Bar Label Setting (indented and initially hidden if status bar is disabled)
		const labelContainer = statusBarContainer.createDiv({ cls: 'swc-settings-group swc-label-settings' });
		labelContainer.style.paddingLeft = '20px';
		labelContainer.style.display = this.plugin.settings.showStatusBar ? 'block' : 'none';

		new Setting(labelContainer)
			.setName('Status Bar Label')
			.setDesc('Customize the label shown before the count in the status bar (e.g., "Selected: ").')
			.addText(text => text
				.setPlaceholder('Selected: ')
				.setValue(this.plugin.settings.statusBarLabel)
				.onChange(async (value) => {
					this.plugin.settings.statusBarLabel = value;
					await this.plugin.saveSettings();
					this.plugin.setupStatusBar();
				}));

		// Path Exclusion Settings
		containerEl.createEl('h3', { text: 'Path Exclusion' });
		
		new Setting(containerEl)
			.setName('Exclude Paths from Word Count')
			.setDesc('When enabled, file paths will not be counted as words.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludePaths)
				.onChange(async (value) => {
					this.plugin.settings.excludePaths = value;
					await this.plugin.saveSettings();
					updatePathSettingsVisibility();
				}))
			.settingEl.addClass('swc-settings-group');

		// Indented container for sub-settings (cosmetic tweak)
		const pathSettingsContainer = containerEl.createDiv({ cls: 'swc-settings-group swc-path-settings' });
		pathSettingsContainer.style.paddingLeft = '20px'; // Indent to match status bar children
		const updatePathSettingsVisibility = () => {
			pathSettingsContainer.style.display = this.plugin.settings.excludePaths ? 'block' : 'none';
		};
		updatePathSettingsVisibility();

		// Sub-settings for each path type
		const windowsSetting = new Setting(pathSettingsContainer)
			.setName('Exclude Windows Paths')
			.setDesc('Exclude paths starting with drive letters (e.g., C:\\)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeWindowsPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeWindowsPaths = value;
					await this.plugin.saveSettings();
					updateWindowsExclusionInfo();
				}));

		const windowsExclusionInfoContainer = pathSettingsContainer.createDiv();
		const updateWindowsExclusionInfo = () => {
			windowsExclusionInfoContainer.empty();
			if (this.plugin.settings.excludeWindowsPaths) {
				addExclusionInfo(
					windowsExclusionInfoContainer,
					'Windows Paths',
					'^[A-Za-z]:[\/\\]',
					'Matches any path that starts with a drive letter followed by a colon and a slash or backslash.',
					['C:\\Users\\file.txt', 'D:/Music/song.mp3'],
					['/usr/local/bin', '\\server\\share', '%USERPROFILE%\\Documents']
				);
			}
		};
		updateWindowsExclusionInfo();

		const uncSetting = new Setting(pathSettingsContainer)
			.setName('Exclude UNC Paths')
			.setDesc('Exclude network paths (e.g., \\server\\share)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeUNCPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeUNCPaths = value;
					await this.plugin.saveSettings();
					updateUNCExclusionInfo();
				}));

		const uncExclusionInfoContainer = pathSettingsContainer.createDiv();
		const updateUNCExclusionInfo = () => {
			uncExclusionInfoContainer.empty();
			if (this.plugin.settings.excludeUNCPaths) {
				addExclusionInfo(
					uncExclusionInfoContainer,
					'UNC Paths (Network)',
					'^\\[^\\]+\\[^\\]+',
					'Matches any path that starts with two backslashes, followed by a server name and a share name.',
					['\\server\\share\\file.txt', '\\NAS\\Music\\song.mp3'],
					['C:\\Users\\file.txt', '/usr/local/bin']
				);
			}
		};
		updateUNCExclusionInfo();

		const unixSetting = new Setting(pathSettingsContainer)
			.setName('Exclude Unix Paths')
			.setDesc('Exclude paths starting with forward slash (e.g., /usr/local)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeUnixPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeUnixPaths = value;
					await this.plugin.saveSettings();
					updateUnixExclusionInfo();
				}));

		const unixExclusionInfoContainer = pathSettingsContainer.createDiv();
		const updateUnixExclusionInfo = () => {
			unixExclusionInfoContainer.empty();
			if (this.plugin.settings.excludeUnixPaths) {
				addExclusionInfo(
					unixExclusionInfoContainer,
					'Unix Paths',
					'^\/[^\/]',
					'Matches any path that starts with a single forward slash (not double), indicating a Unix-style absolute path.',
					['/usr/local/bin', '/home/user/file.txt'],
					['C:\\Users\\file.txt', '\\server\\share']
				);
			}
		};
		updateUnixExclusionInfo();

		const envSetting = new Setting(pathSettingsContainer)
			.setName('Exclude Environment Paths')
			.setDesc('Exclude paths with environment variables (e.g., %USERPROFILE%, $HOME)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeEnvironmentPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeEnvironmentPaths = value;
					await this.plugin.saveSettings();
					updateEnvExclusionInfo();
				}));

		const envExclusionInfoContainer = pathSettingsContainer.createDiv();
		const updateEnvExclusionInfo = () => {
			envExclusionInfoContainer.empty();
			if (this.plugin.settings.excludeEnvironmentPaths) {
				addExclusionInfo(
					envExclusionInfoContainer,
					'Environment Variable Paths',
					'^(?:%[^%]+%|\$[A-Za-z_][A-Za-z0-9_]*)',
					'Matches any path that starts with a Windows-style environment variable (e.g., %USERPROFILE%) or a Unix-style variable (e.g., $HOME).',
					['%USERPROFILE%\\Documents', '$HOME/Documents/file.txt'],
					['C:\\Users\\file.txt', '/usr/local/bin']
				);
			}
		};
		updateEnvExclusionInfo();

		// File Extension Exclusion
		new Setting(pathSettingsContainer)
			.setName('File Extension Exclusion List')
			.setDesc('Comma-separated list of file extensions to exclude from word counting (e.g., .jpg, .png, .md)')
			.addTextArea(text => text
				.setValue(this.plugin.settings.exclusionList)
				.setPlaceholder('.jpg, .png, .md')
				.onChange(async (value) => {
					this.plugin.settings.exclusionList = value;
					await this.plugin.saveSettings();
					updateFileExtExclusionInfo();
				}));

		const fileExtExclusionInfoContainer = pathSettingsContainer.createDiv();
		const updateFileExtExclusionInfo = () => {
			fileExtExclusionInfoContainer.empty();
			if (this.plugin.settings.excludePaths) { // Always show if parent is enabled
				addExclusionInfo(
					fileExtExclusionInfoContainer,
					'File Extension Exclusion',
					'\.ext$ (e.g., \.jpg$)',
					'Excludes any word/segment that ends with a file extension from the exclusion list (e.g., .jpg, .png, .md).',
					['photo.jpg', 'document.md'],
					['notes.txt (if .txt is not in the exclusion list)', 'C:\\Users\\file.txt (if .txt is not in the exclusion list)']
				);
			}
		};
		updateFileExtExclusionInfo();

		// file:/// Protocol (always shown if parent is enabled)
		const fileProtocolExclusionInfoContainer = pathSettingsContainer.createDiv();
		const updateFileProtocolExclusionInfo = () => {
			fileProtocolExclusionInfoContainer.empty();
			if (this.plugin.settings.excludePaths) {
				addExclusionInfo(
					fileProtocolExclusionInfoContainer,
					'file:/// Protocol',
					'^file:\/\/[^ -\s]+',
					'Matches any path that starts with file:///, which is a URL-style file path.',
					['file:///C:/Users/file.txt', 'file:///home/user/file.txt'],
					['C:\\Users\\file.txt', '/usr/local/bin']
				);
			}
		};
		updateFileProtocolExclusionInfo();

		// Other Settings
		containerEl.createEl('h3', { text: 'Other Settings' });

		// Toggle for showing date/time in history
		new Setting(containerEl)
			.setName('Show Date/Time in History')
			.setDesc('Display the date and time of each word count in the history (default: off).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showDateTimeInHistory)
				.onChange(async (value) => {
					this.plugin.settings.showDateTimeInHistory = value;
					await this.plugin.saveSettings();
				}))
			.settingEl.addClass('swc-settings-group');

		// Debug Settings
		containerEl.createEl('h3', { text: 'Debug Settings' });

		new Setting(containerEl)
			.setName('Enable Debug Logging')
			.setDesc('Enable detailed logging to the console for troubleshooting. Disable this setting unless you need it for debugging issues.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDebugLogging)
				.onChange(async (value) => {
					this.plugin.settings.enableDebugLogging = value;
					await this.plugin.saveSettings();
				}))
			.settingEl.addClass('swc-settings-group');

		// --- Separator and spacing before Advanced section ---
		const advSep = containerEl.createEl('hr');
		advSep.style.marginTop = '2em';
		advSep.style.marginBottom = '1.5em';

		// Advanced Settings Section (collapsible, consistent style)
		const advancedSection = containerEl.createEl('details', { cls: 'cwc-advanced-section' });
		advancedSection.style.marginLeft = '20px'; // Indent to match other sub-settings
		advancedSection.style.marginBottom = '2em';
		const advSummary = advancedSection.createEl('summary', { text: '⚠️ Advanced: Custom Word Detection Regex (Expert Only)' });
		advSummary.style.fontWeight = 'bold';
		advSummary.style.fontSize = '1em';
		const advDesc = advancedSection.createDiv();
		advDesc.createEl('p', { text: 'Enable and define a custom regex for word detection. Incorrect regex may cause inaccurate counts or performance issues. Use with caution.' });
		// Enable toggle
		const advToggle = new Setting(advDesc)
			.setName('Enable Advanced Regex (Expert Only)')
			.setDesc('Allow custom regex for word detection. For advanced users only.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAdvancedRegex ?? false)
				.onChange(async (value) => {
					this.plugin.settings.enableAdvancedRegex = value;
					await this.plugin.saveSettings();
					displayRegexFields();
				})
			);
		// Regex input, test, and reset
		const regexFieldsContainer = advDesc.createDiv();
		regexFieldsContainer.style.marginLeft = '0';
		const displayRegexFields = () => {
			regexFieldsContainer.empty();
			if (!this.plugin.settings.enableAdvancedRegex) return;
			// Regex input
			const regexInputSetting = new Setting(regexFieldsContainer)
				.setName('Custom Regex Pattern')
				.setDesc('Enter your custom regex for word detection. Default: ' + DEFAULT_WORD_REGEX)
				.addText(text => text
					.setValue(this.plugin.settings.customWordRegex || DEFAULT_WORD_REGEX)
					.onChange(async (value) => {
						this.plugin.settings.customWordRegex = value;
						await this.plugin.saveSettings();
						updateRegexTest();
					})
				);
			// Move Reset to Default Regex button just below the input
			const regexInput = regexInputSetting.controlEl.querySelector('input');
			const resetBtn = regexFieldsContainer.createEl('button', { text: 'Reset to Default Regex', cls: 'mod-cta' });
			resetBtn.style.alignSelf = 'flex-start';
			resetBtn.style.marginTop = '0.3em';
			resetBtn.style.marginBottom = '0.8em';
			resetBtn.style.fontSize = '0.85em';
			resetBtn.style.padding = '2px 10px';
			resetBtn.onclick = async () => {
				this.plugin.settings.customWordRegex = DEFAULT_WORD_REGEX;
				await this.plugin.saveSettings();
				if (regexInput) regexInput.value = DEFAULT_WORD_REGEX;
				updateRegexTest();
			};
			// Add small text below the reset button
			const resetBtnDesc = regexFieldsContainer.createEl('div', { text: 'This will reset your custom regex pattern to the default.' });
			resetBtnDesc.style.fontSize = '0.8em';
			resetBtnDesc.style.color = '#888';
			resetBtnDesc.style.marginBottom = '0.8em';
			// Test area (left-aligned)
			const testArea = regexFieldsContainer.createDiv();
			testArea.style.display = 'flex';
			testArea.style.flexDirection = 'column';
			testArea.style.alignItems = 'flex-start';
			testArea.style.marginTop = '0.5em';
			testArea.style.marginBottom = '0.5em';
			testArea.style.width = '100%';
			const testLabel = testArea.createEl('label', { text: 'Test Your Regex:', attr: { style: 'margin-bottom: 0.2em; font-weight: 500;' } });
			// Add descriptive text in tiny letters
			const testDesc = testArea.createEl('div', { text: 'Use the box below to see exactly which text fragments your custom regex will match, as well as a word count, making it easier to debug or refine your pattern.' });
			testDesc.style.fontSize = '0.8em';
			testDesc.style.color = '#888';
			testDesc.style.marginBottom = '0.3em';
			const sampleInput = testArea.createEl('textarea', { cls: 'cwc-regex-sample', placeholder: 'Enter sample text to test your regex...' });
			sampleInput.rows = 3;
			sampleInput.style.width = '100%';
			sampleInput.style.marginBottom = '0.5em';
			const wordCountDisplay = testArea.createEl('div', { cls: 'cwc-regex-wordcount' });
			wordCountDisplay.style.fontWeight = 'bold';
			wordCountDisplay.style.marginBottom = '0.2em';
			const matchDisplay = testArea.createEl('div', { cls: 'cwc-regex-matches' });
			const warningDisplay = testArea.createEl('div', { cls: 'cwc-regex-warning' });
			const updateRegexTest = () => {
				const pattern = this.plugin.settings.customWordRegex || DEFAULT_WORD_REGEX;
				let regex: RegExp;
				try {
					regex = new RegExp(pattern, 'giu');
					warningDisplay.setText('');
				} catch (e) {
					warningDisplay.setText('⚠️ Invalid regex: ' + e.message);
					matchDisplay.setText('');
					wordCountDisplay.setText('');
					return;
				}
				const sample = sampleInput.value;
				if (!sample) {
					matchDisplay.setText('');
					wordCountDisplay.setText('');
					return;
				}
				const matches = sample.match(regex);
				if (matches) {
					wordCountDisplay.setText('Word count: ' + matches.length);
					matchDisplay.setText('Matches: ' + matches.join(', '));
				} else {
					wordCountDisplay.setText('Word count: 0');
					matchDisplay.setText('No matches.');
				}
			};
			sampleInput.addEventListener('input', updateRegexTest);
			// Add Reset Test button below the test area
			const resetTestBtn = testArea.createEl('button', { text: 'Reset Test' });
			resetTestBtn.style.alignSelf = 'flex-start';
			resetTestBtn.style.fontSize = '0.85em';
			resetTestBtn.style.padding = '2px 10px';
			resetTestBtn.style.marginTop = '0.3em';
			resetTestBtn.onclick = () => {
				sampleInput.value = '';
				updateRegexTest();
			};
		};
		displayRegexFields();
	}
}
