// TEST BUILD: 2025-05-05

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
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
}

const DEFAULT_EXCLUSION_LIST = '.jpg, .jpeg, .png, .gif, .svg, .md, .pdf, .docx, .xlsx, .pptx, .zip, .mp3, .mp4, .wav, .ogg, .webm, .mov, .avi, .exe, .dll, .bat, .sh, .ps1, .js, .ts, .json, .csv, .yml, .yaml, .html, .css, .scss, .xml, .ini, .log, .tmp, .bak, .db, .sqlite, .7z, .rar, .tar, .gz, .bz2, .iso, .img, .bin, .apk, .app, .dmg, .pkg, .deb, .rpm, .msi, .sys, .dat, .sav, .bak, .old, .swp, .lock, .cache, .part, .crdownload, .torrent, .ics, .eml, .msg, .vcf, .txt';

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	showDateTimeInHistory: false,
	history: [],
	exclusionList: DEFAULT_EXCLUSION_LIST,
	// Path exclusion defaults
	excludePaths: false,           // Off by default as per specification
	excludeWindowsPaths: true,     // On by default when excludePaths is enabled
	excludeUnixPaths: true,        // On by default when excludePaths is enabled
	excludeUNCPaths: true,         // On by default when excludePaths is enabled
	excludeEnvironmentPaths: true,  // On by default when excludePaths is enabled
	// Status bar defaults
	showStatusBar: false,            // Status bar hidden by default
	enableLiveCount: false,          // Live updates disabled by default
	statusBarLabel: 'Selected: ',    // Default label
	hideCoreWordCount: false,        // Don't hide core word count by default
	// Ribbon button default
	showRibbonButton: false,        // Hidden by default
	enableDebugLogging: false,       // Debug logging disabled by default
}

interface WordCountHistoryEntry {
	count: number;
	date: Date;
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
	settings?: MyPluginSettings
): number {
	if (!selectedText) return 0;

	// Debug logging
	console.log('Initial text:', selectedText);

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
		console.log('Checking path:', str);

		// Check each path type with its original format
		// Windows drive letter paths (C:\ or C:/)
		if (/^[A-Za-z]:[\/\\]/.test(str)) {
			if (settings.excludeWindowsPaths) {
				console.log('Matched Windows drive path');
				return true;
			}
			console.log('Windows path detected but exclusion disabled');
			return false;
		}

		// Environment variables - check original string
		if (/^(?:%[^%]+%|\$[A-Za-z_][A-Za-z0-9_]*)/.test(str)) {
			// Check if this is a Windows path with an environment variable
			if (/^%[^%]+%[\/\\]/.test(str)) {
				if (settings.excludeWindowsPaths) {
					console.log('Matched Windows path with environment variable');
					return true;
				}
				console.log('Windows path with environment variable detected but exclusion disabled');
				return false;
			}
			
			if (settings.excludeEnvironmentPaths) {
				console.log('Matched environment variable');
				return true;
			}
			console.log('Environment variable detected but exclusion disabled');
			return false;
		}

		// UNC paths (\\server\share) - check original string
		if (/^\\\\[^\\]+\\[^\\]+/.test(str)) {
			if (settings.excludeUNCPaths) {
				console.log('Matched UNC path');
				return true;
			}
			console.log('UNC path detected but exclusion disabled');
			return false;
		}

		// Now normalize for other checks
		const normalizedStr = normalizePath(str);

		// file:/// protocol
		if (/^file:\/\/\//.test(normalizedStr)) {
			console.log('Matched file:/// protocol');
			return true;
		}

		// Unix paths (/usr/local)
		if (/^\/[^\/]/.test(normalizedStr)) {
			if (settings.excludeUnixPaths) {
				console.log('Matched Unix path');
				return true;
			}
			console.log('Unix path detected but exclusion disabled');
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
	console.log('Raw segments:', rawSegments);

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
				console.log('Path continues with:', segment);
			} else {
				console.log('Path continuation check failed, reverting');
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
			console.log('Excluding final path:', buffer);
		} else {
			segments.push(...buffer.split(/\s+/));
		}
	}

	console.log('Processed segments:', segments);

	// Filter out paths and handle extensions
	const filteredWords = segments.filter(word => {
		if (!word.trim()) return false;
		
		// Always keep decimal numbers
		if (/^\d+\.\d+$/.test(word)) return true;
		
		if (hasExcludedExtension(word)) return false;
		if (settings?.excludePaths && looksLikePath(word)) return false;

		return true;
	});

	console.log('Filtered words:', filteredWords);
	selectedText = filteredWords.join(' ');

	// Strip quotes and emojis
	selectedText = selectedText.replace(/["'''""]/g, '');
	if (stripEmojis) {
		selectedText = selectedText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
	}

	// Final word counting
	const words: string[] = [];
	
	// First find decimal numbers
	const decimalPattern = /\b\d+\.\d+\b/g;
	let match;
	while ((match = decimalPattern.exec(selectedText)) !== null) {
		words.push(match[0]);
		// Replace the matched decimal with a space to avoid double-counting
		selectedText = selectedText.slice(0, match.index) + ' ' + selectedText.slice(match.index + match[0].length);
	}

	// Then find remaining words
	const wordPattern = /[A-Za-z0-9]+(?:[\-_'][A-Za-z0-9]+)*/g;
	while ((match = wordPattern.exec(selectedText)) !== null) {
		words.push(match[0]);
	}

	console.log('Final words:', words);
	return words.length;
}

// Helper function to format date as yyyy-mm-dd HH:MM:SS
function formatDateISO(date: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
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
		this.addSettingTab(new WordCounterSettingTab(this.app, this));
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
		this.statusBarItem.setText('');  // Start empty
		this.statusBarItem.style.cursor = 'pointer';  // Show it's clickable
		this.statusBarItem.setAttribute('aria-label', 'Selected Word Count');
		this.statusBarItem.setAttribute('title', 'Click to show word count details and history');
		
		// Handle clicks on status bar
		this.statusBarItem.onClickEvent(async () => {
			await this.handleWordCount();
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
	plugin: MyPlugin | null;
	constructor(app: App, wordCount: number, history: WordCountHistoryEntry[], showDateTime: boolean, plugin: MyPlugin | null = null) {
		super(app);
		this.wordCount = wordCount;
		this.history = history;
		this.showDateTime = showDateTime;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Main label
		const label = contentEl.createEl('div', { text: 'Custom Selected Word Count:', cls: 'swc-label' });
		label.style.fontWeight = 'bold';
		label.style.marginBottom = '0.5em';

		// Word count value
		const count = contentEl.createEl('div', { text: this.wordCount.toString(), cls: 'swc-count' });
		count.style.fontSize = '2em';
		count.style.marginBottom = '1em';

		// Button section
		const buttonSection = contentEl.createEl('div', { cls: 'swc-buttons' });
		buttonSection.style.display = 'flex';
		buttonSection.style.gap = '0.5em';
		buttonSection.style.marginBottom = '1em';

		// Copy to Clipboard button
		const copyBtn = buttonSection.createEl('button', { text: 'Copy to Clipboard' });
		copyBtn.onclick = () => {
			navigator.clipboard.writeText(this.wordCount.toString());
			copyBtn.textContent = 'Copied!';
			setTimeout(() => (copyBtn.textContent = 'Copy to Clipboard'), 1200);
		};
		copyBtn.title = 'Copy the current word count to the clipboard';

		// Clear History button
		const clearBtn = buttonSection.createEl('button', { text: 'Clear History' });
		clearBtn.onclick = async () => {
			if (this.plugin) {
				this.plugin.history = [];
				await this.plugin.saveHistory();
			}
			this.history.length = 0;
			this.onOpen(); // Refresh modal
		};
		clearBtn.title = 'Clear the word count history';

		// OK button
		const okBtn = buttonSection.createEl('button', { text: 'OK' });
		okBtn.onclick = () => this.close();
		okBtn.title = 'Close this dialog';

		// History section
		const historySection = contentEl.createEl('div', { cls: 'swc-history' });
		const historyLabel = historySection.createEl('div', { text: 'History:', cls: 'swc-history-label' });
		historyLabel.style.fontWeight = 'bold';
		historyLabel.style.marginTop = '1em';
		historyLabel.style.marginBottom = '0.5em';

		if (this.history.length === 0) {
			historySection.createEl('div', { text: 'No history yet.' });
		} else {
			const list = historySection.createEl('ul', { cls: 'swc-history-list' });
			this.history.slice(0, 50).forEach(entry => {
				const item = list.createEl('li', { cls: 'swc-history-item' });
				item.createSpan({ text: entry.count.toString(), cls: 'swc-history-count' });
				if (this.showDateTime) {
					item.createSpan({ text: '  (' + formatDateISO(entry.date) + ')', cls: 'swc-history-date' });
				}
				// Copy button for each history entry
				const copyHistoryBtn = item.createEl('button', { text: 'Copy', cls: 'swc-history-copy-btn' });
				copyHistoryBtn.style.marginLeft = '0.5em';
				copyHistoryBtn.onclick = () => {
					navigator.clipboard.writeText(entry.count.toString());
					copyHistoryBtn.textContent = 'Copied!';
					setTimeout(() => (copyHistoryBtn.textContent = 'Copy'), 1200);
				};
				copyHistoryBtn.title = 'Copy this word count to the clipboard';
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Settings tab for plugin options
class WordCounterSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

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
				}));

		// Status Bar Settings
		const statusBarContainer = containerEl.createDiv();
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
		const liveUpdateContainer = statusBarContainer.createDiv();
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
		const hideWordCountContainer = statusBarContainer.createDiv();
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
		const labelContainer = statusBarContainer.createDiv();
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
				}));

		// Individual path type settings (only shown when excludePaths is enabled)
		const pathSettingsContainer = containerEl.createDiv();
		const updatePathSettingsVisibility = () => {
			pathSettingsContainer.style.display = this.plugin.settings.excludePaths ? 'block' : 'none';
		};
		updatePathSettingsVisibility();

		new Setting(pathSettingsContainer)
			.setName('Exclude Windows Paths')
			.setDesc('Exclude paths starting with drive letters (e.g., C:\\)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeWindowsPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeWindowsPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude UNC Paths')
			.setDesc('Exclude network paths (e.g., \\\\server\\share)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeUNCPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeUNCPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude Unix Paths')
			.setDesc('Exclude paths starting with forward slash (e.g., /usr/local)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeUnixPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeUnixPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude Environment Paths')
			.setDesc('Exclude paths with environment variables (e.g., %USERPROFILE%, $HOME)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.excludeEnvironmentPaths)
				.onChange(async (value) => {
					this.plugin.settings.excludeEnvironmentPaths = value;
					await this.plugin.saveSettings();
				}));

		// File extension exclusion list (part of path settings)
		new Setting(pathSettingsContainer)
			.setName('File Extension Exclusion List')
			.setDesc('Comma-separated list of file extensions to exclude from word counting (e.g., .jpg, .png, .md)')
			.addTextArea(text => text
				.setValue(this.plugin.settings.exclusionList)
				.setPlaceholder('.jpg, .png, .md')
				.onChange(async (value) => {
					this.plugin.settings.exclusionList = value;
					await this.plugin.saveSettings();
				}));

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
				}));

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
				}));
	}
}
