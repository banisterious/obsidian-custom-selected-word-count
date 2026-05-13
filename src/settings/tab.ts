import { App, ButtonComponent, DropdownComponent, Notice, Platform, PluginSettingTab, Setting, TextComponent, ToggleComponent } from 'obsidian';
import { DEFAULT_WORD_REGEX } from './types';
import { errorMessage } from '../utils/debug';
import type { AppWithInternals } from '../obsidian-internals';
import type CustomSelectedWordCountPlugin from '../../main';

// Settings tab for plugin options.
export class WordCountSettingTab extends PluginSettingTab {
	plugin: CustomSelectedWordCountPlugin;
	private updateSettingsUI: () => void;
	private updateRegexTest: () => void;
	private exportLogFiles: () => Promise<void>;

	constructor(app: App, plugin: CustomSelectedWordCountPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('word-count-settings');

		// UI Elements Settings

		// Status Bar Settings
		const statusBarContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(statusBarContainer)
			.setName('Show count in status bar')
			.setDesc('Show the selected word count in the status bar next to Obsidian\'s built-in word count.')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addText((text: TextComponent) => text
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addDropdown((dropdown: DropdownComponent) => dropdown
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.showDateTimeInHistory)
				.onChange(async (value: boolean) => {
					this.plugin.settings.showDateTimeInHistory = value;
					await this.plugin.saveSettings();
				}));

		// Per-note Override Information
		const overrideInfo = containerEl.createEl('details', { cls: 'word-count-override-info' });
		overrideInfo.createEl('summary', { text: 'ℹ️ using per-note exclusion overrides' });

		const overrideContent = overrideInfo.createDiv({ cls: 'word-count-override-content' });
		overrideContent.createEl('p', { text: 'You can override any exclusion setting for individual notes by adding a cswc-disable property to the note\'s frontmatter:' });

		const examplePre = overrideContent.createEl('pre', { cls: 'word-count-override-example' });
		examplePre.createEl('code', { text: '---\ncswc-disable: [exclude-urls, exclude-comments]\n---' });

		overrideContent.createEl('p', { text: 'Use "all" to disable all exclusions:' });
		const examplePre2 = overrideContent.createEl('pre', { cls: 'word-count-override-example' });
		examplePre2.createEl('code', { text: '---\ncswc-disable: all\n---' });

		overrideContent.createEl('p', { text: 'Property values are shown next to each setting below (• property: ...)' });

		new Setting(overrideContent)
			.setName('Inline comment overrides')
			.setHeading();
		overrideContent.createEl('p', { text: 'You can also disable exclusions for specific sections within a note using comments:' });
		const inlinePre = overrideContent.createEl('pre', { cls: 'word-count-override-example' });
		// eslint-disable-next-line obsidianmd/ui/sentence-case -- example markdown content shown to the user; each sentence is intentionally capitalized as a user would actually type it
		inlinePre.createEl('code', { text: 'This text is excluded.\n<!-- cswc-disable -->\nThis text is NOT excluded from counts.\n<!-- cswc-enable -->\nThis text is excluded again.' });

		overrideContent.createEl('p', { text: 'Supported comment formats: <!-- cswc-disable --> or %% cswc-disable %%' });

		// Link Exclusion Settings
		const linkContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(linkContainer)
			.setName('Exclude non-visible portions of links')
			.setDesc('For [[note name|alias]] links, only count "alias". For [link text](URL) links, only count "link text". • property: exclude-urls')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeCodeBlocks)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeCodeBlocks = value;
					await this.plugin.saveSettings();
				}));

		new Setting(codeSettingsContainer)
			.setName('Exclude inline code')
			.setDesc('Exclude text within single backticks (`). (Requires code exclusion to be enabled) • Property: exclude-inline-code')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- `exclude-windows-paths` is a literal identifier parsed at runtime; the rule would suggest `exclude-Windows-paths` here, which would break cswc-disable lookups.
			.setDesc('Exclude paths starting with drive letters (e.g., C:\\). (Requires path exclusion to be enabled) • property: exclude-windows-paths')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeWindowsPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeWindowsPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude Unix paths')
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- `exclude-unix-paths` is a literal identifier parsed at runtime; see exclude-windows-paths above.
			.setDesc('Exclude Unix-style paths starting with forward slash (e.g., /usr/local). (Requires path exclusion to be enabled) • property: exclude-unix-paths')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeUnixPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeUnixPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude UNC paths')
			.setDesc('Exclude network paths starting with double backslash (e.g., \\\\server\\share). (Requires path exclusion to be enabled) • property: exclude-unc-paths')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeUNCPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeUNCPaths = value;
					await this.plugin.saveSettings();
				}));

		new Setting(pathSettingsContainer)
			.setName('Exclude environment paths')
			.setDesc('Exclude environment variable paths (e.g., %USERPROFILE%, $HOME). (Requires path exclusion to be enabled) • property: exclude-environment-paths')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeEnvironmentPaths)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeEnvironmentPaths = value;
					await this.plugin.saveSettings();
				}));


		// Comment Exclusion Settings
		const commentContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(commentContainer)
			.setName('Exclude comments from text analysis')
			.setDesc('When enabled, comments will be excluded from word, character, and sentence counts. • property: exclude-comments')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeObsidianCommentContent)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeObsidianCommentContent = value;
					await this.plugin.saveSettings();
				}));

		// HTML comments section
		new Setting(commentSettingsContainer)
			.setName('Exclude HTML comments (<!-- -->)')
			.setDesc('Exclude HTML-style comments from text analysis. (Requires comment exclusion to be enabled)')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.excludeHtmlCommentContent)
				.onChange(async (value: boolean) => {
					this.plugin.settings.excludeHtmlCommentContent = value;
					await this.plugin.saveSettings();
				}));

		// Heading Exclusion Settings
		const headingContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(headingContainer)
			.setName('Exclude headings from text analysis')
			.setDesc('When enabled, Markdown headings will be excluded from word, character, and sentence counts. • property: exclude-headings')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addToggle((toggle: ToggleComponent) => toggle
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
			cls: 'word-count-subsection-desc',
		});

		const headingsList = headingSectionsSubsection.createDiv({ cls: 'word-count-headings-list' });

		// Function to render headings list
		const renderHeadingsList = () => {
			headingsList.empty();

			if (!this.plugin.settings.excludeHeadingSections || this.plugin.settings.excludeHeadingSections.length === 0) {
				headingsList.createDiv({
					text: 'No excluded heading sections. Right-click on headings to add sections.',
					cls: 'word-count-empty-headings',
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
					cls: 'word-count-heading-level',
				});
				headingInfo.createSpan({
					text: headingText,
					cls: 'word-count-heading-text',
				});

				const headingActions = headingItem.createDiv({ cls: 'word-count-heading-actions' });

				const editButton = headingActions.createEl('button', {
					text: 'Edit',
					cls: 'word-count-heading-btn word-count-heading-edit',
				});

				const deleteButton = headingActions.createEl('button', {
					text: 'Delete',
					cls: 'word-count-heading-btn word-count-heading-delete',
				});

				editButton.onclick = async () => {
					// Create inline editor
					const originalText = headingInfo.querySelector('.word-count-heading-text');
					if (!originalText) return;

					const input = createEl('input', {
						type: 'text',
						cls: 'word-count-heading-edit-input',
					});
					input.value = heading;

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
							void saveEdit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							cancelEdit();
						}
					});

					input.addEventListener('blur', () => void saveEdit());
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

		// Words and Phrases Exclusion Settings
		const wordsAndPhrasesContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(wordsAndPhrasesContainer)
			.setName('Exclude words and phrases from text analysis')
			.setDesc('When enabled, specific words and phrases will be excluded from word, character, and sentence counts. • property: exclude-words-phrases')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addText((text: TextComponent) => text
				.setPlaceholder('The, and, or, but')
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
			cls: 'word-count-subsection-desc',
		});

		const phrasesList = phrasesSubsection.createDiv({ cls: 'word-count-phrases-list' });

		// Function to render phrases list
		const renderPhrasesList = () => {
			phrasesList.empty();

			if (!this.plugin.settings.excludedPhrases || this.plugin.settings.excludedPhrases.length === 0) {
				phrasesList.createDiv({
					text: 'No excluded phrases. Right-click selected text to add phrases.',
					cls: 'word-count-empty-phrases',
				});
				return;
			}

			this.plugin.settings.excludedPhrases.forEach((phrase, index) => {
				const phraseItem = phrasesList.createDiv({ cls: 'word-count-phrase-item' });

				const phraseText = phraseItem.createSpan({
					text: phrase,
					cls: 'word-count-phrase-text',
				});

				const phraseActions = phraseItem.createDiv({ cls: 'word-count-phrase-actions' });

				const editButton = phraseActions.createEl('button', {
					text: 'Edit',
					cls: 'word-count-phrase-btn word-count-phrase-edit',
				});

				const deleteButton = phraseActions.createEl('button', {
					text: 'Delete',
					cls: 'word-count-phrase-btn word-count-phrase-delete',
				});

				editButton.onclick = async () => {
					// Create inline editor
					const input = createEl('input', {
						type: 'text',
						cls: 'word-count-phrase-edit-input',
					});
					input.value = phrase;

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
							void saveEdit();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							cancelEdit();
						}
					});

					input.addEventListener('blur', () => void saveEdit());
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


		const debugContainer = containerEl.createDiv({ cls: 'word-count-settings-group' });
		new Setting(debugContainer)
			.setName('Enable debug logging')
			.setDesc('Enable detailed logging for troubleshooting. May impact performance.')
			.addToggle((toggle: ToggleComponent) => toggle
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
			.addButton((button: ButtonComponent) => button
				.setButtonText('Export logs')
				.setTooltip('Export current log files')
				.onClick(async () => {
					await this.exportLogFiles();
				}));

		// Advanced Section

		containerEl.createEl('hr', { cls: 'word-count-advanced-separator' });
		const advancedSection = containerEl.createEl('details', { cls: 'word-count-advanced-section' });
		advancedSection.createEl('summary', {
			text: '⚠️ custom word detection regex (expert only)',
			cls: 'word-count-advanced-summary',
		});

		const advDesc = advancedSection.createDiv();
		advDesc.createEl('p', { text: 'Enable and define a custom regex for word detection. Incorrect regex may cause inaccurate counts or performance issues. Use with caution.' });

		// Enable toggle
		new Setting(advDesc)
			.setName('Enable advanced regex (expert only)')
			.setDesc('Allow custom regex for word detection. For advanced users only.')
			.addToggle((toggle: ToggleComponent) => toggle
				.setValue(this.plugin.settings.enableAdvancedRegex ?? false)
				.onChange(async (value: boolean) => {
					this.plugin.settings.enableAdvancedRegex = value;
					await this.plugin.saveSettings();
					this.updateSettingsUI();
				}),
			);

		// Regex Input Field
		let regexTextComponent: TextComponent | null = null;
		new Setting(advDesc)
			.setName('Custom word detection regex')
			.setDesc(`Define a regular expression pattern for word detection. Default: ${DEFAULT_WORD_REGEX}`)
			.addText((text: TextComponent) => {
				regexTextComponent = text;
				text.setPlaceholder(DEFAULT_WORD_REGEX)
					.setValue(this.plugin.settings.customWordRegex || '')
					.onChange(async (value: string) => {
						this.plugin.settings.customWordRegex = value;
						await this.plugin.saveSettings();
						this.updateRegexTest();
					});
			});

		// Reset to Default Button
		const resetButton = advDesc.createEl('button', {
			text: 'Reset to default',
			cls: 'mod-cta',
		});
		resetButton.onclick = async () => {
			this.plugin.settings.customWordRegex = '';
			await this.plugin.saveSettings();
			regexTextComponent?.setValue('');
			this.updateRegexTest();
		};

		// Test Area
		const testArea = advDesc.createDiv({ cls: 'word-count-test-area' });
		testArea.createDiv({
			text: 'Use the box below to see exactly which text fragments your custom regex will match.',
			cls: 'word-count-test-description',
		});

		const sampleInput = testArea.createEl('textarea', {
			cls: 'word-count-regex-sample',
			attr: {
				placeholder: 'Enter sample text to test your regex...',
				rows: '3',
			},
		});

		const wordCountDisplay = testArea.createDiv({ cls: 'word-count-regex-wordcount' });
		const matchDisplay = testArea.createDiv({ cls: 'word-count-regex-matches' });
		const warningDisplay = testArea.createDiv({ cls: 'word-count-regex-warning' });

		const resetTestBtn = testArea.createEl('button', {
			text: 'Reset test',
			cls: 'word-count-test-reset-button',
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
					warningDisplay.toggleClass('word-count-hidden', true);
					return;
				}

				const regex = new RegExp(customRegex, 'g');
				const matches = sampleText.match(regex) || [];

				wordCountDisplay.textContent = `Word count: ${matches.length}`;
				matchDisplay.textContent = `Matches: [${matches.join(', ')}]`;
				warningDisplay.textContent = '';
				warningDisplay.toggleClass('word-count-hidden', true);
			} catch (error) {
				wordCountDisplay.textContent = 'Word count: Error';
				matchDisplay.textContent = 'Matches: Invalid regex';
				warningDisplay.textContent = `Error: ${errorMessage(error)}`;
				warningDisplay.toggleClass('word-count-hidden', false);
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
						version: this.plugin.manifest.version,
						settings: this.plugin.settings,
					},
					system: {
						platform: Platform.isMacOS ? 'macOS'
							: Platform.isWin ? 'Windows'
								: Platform.isLinux ? 'Linux'
									: 'Unknown',
						isMobileApp: Platform.isMobileApp,
						isDesktopApp: Platform.isDesktopApp,
						language: navigator.language,
					},
					obsidian: {
						version: (this.app as AppWithInternals).appVersion || 'unknown',
					},
				};

				// Create and download the file
				const jsonString = JSON.stringify(logData, null, 2);
				const blob = new Blob([jsonString], { type: 'application/json' });
				const url = URL.createObjectURL(blob);

				const a = createEl('a', { href: url });
				a.download = filename;
				activeDocument.body.appendChild(a);
				a.click();
				activeDocument.body.removeChild(a);
				URL.revokeObjectURL(url);

				new Notice(`Log files exported as ${filename}`);
			} catch (error) {
				new Notice(`Failed to export log files: ${errorMessage(error)}`);
				console.error('Log export error:', error);
			}
		};

		// Initial UI update
		this.updateSettingsUI();
	}
}
