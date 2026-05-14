import { Editor, EditorPosition, MarkdownView, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type WordCountPluginSettings } from './settings/types';
import { type WordCountHistoryEntry } from './types';
import { debugLog, errorMessage } from './utils/debug';
import { getDisabledExclusionsFromFrontmatter, stripFrontmatter } from './processing/frontmatter';
import { countSelectedWords } from './counting/words';
import { countSelectedText } from './counting/index';
import { WordCountModal } from './ui/modal';
import { WordCountSettingTab } from './settings/tab';
import type { AppWithInternals } from './obsidian-internals';

export default class CustomSelectedWordCountPlugin extends Plugin {
	settings: WordCountPluginSettings;
	history: WordCountHistoryEntry[] = [];
	public statusBarItem: HTMLElement | null = null;
	public debounceTimer: number | null = null;
	public canvasPollingTimer: number | null = null;
	private lastCanvasSelection: string = '';
	private ctrlAProcessed: number = 0;
	private lastSelectedText: string = '';


	// eslint-disable-next-line @typescript-eslint/no-misused-promises -- Plugin.onload's signature is `() => Promise<void> | void`; returning a promise is valid.
	async onload() {
		await this.loadSettings();

		// Register live-update listeners on the main window's document and
		// on every popout that opens. handleSelectionChange and handleKeyDown
		// gate themselves on enableLiveCount, so the listeners are safe to
		// register unconditionally. registerDomEvent cleans them up on
		// plugin unload automatically.
		this.registerDomEvent(window.document, 'selectionchange', this.handleSelectionChange);
		this.registerDomEvent(window.document, 'keydown', this.handleKeyDown);
		this.registerEvent(this.app.workspace.on('window-open', (_workspaceWindow, win) => {
			this.registerDomEvent(win.document, 'selectionchange', this.handleSelectionChange);
			this.registerDomEvent(win.document, 'keydown', this.handleKeyDown);
		}));

		// Add status bar item if enabled
		if (this.settings.showStatusBar) {
			this.setupStatusBar();
		}

		// Apply core word count hiding if enabled
		this.addCoreWordCountStyle();



		// Add the command
		this.addCommand({
			id: 'count-selected-words',
			name: 'Count selected words',
			callback: async () => {
				await this.handleWordCount();
			},
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
			}),
		);

		// Register the settings tab
		this.addSettingTab(new WordCountSettingTab(this.app, this));
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
		this.log('Status bar item created and added');

		this.statusBarItem.addEventListener('click', () => {
			this.log('Status bar clicked - cached Canvas selection:', this.lastCanvasSelection?.length || 0, 'chars');
			void this.handleWordCount();
		});

		// Canvas iframe polling tracks selection inside Canvas iframes
		// where selectionchange events do not surface.
		if (this.settings.enableLiveCount) {
			this.startCanvasPolling();
		} else {
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

		// Skip if we just processed Select All (within last 2 seconds)
		const now = Date.now();
		const timeSinceSelectAll = now - this.ctrlAProcessed;
		this.log('Select All flag check:', {
			ctrlAProcessed: this.ctrlAProcessed,
			now: now,
			timeSinceSelectAll: timeSinceSelectAll,
			shouldSkip: this.ctrlAProcessed && timeSinceSelectAll < 2000,
		});

		if (this.ctrlAProcessed && timeSinceSelectAll < 2000) {
			this.log('Skipping selection change - Select All was recently processed');
			return;
		}

		// Additional check: if this looks like a CTRL-A selection in reading view, handle it properly
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (markdownView && markdownView.getMode() === 'preview') {
			const selection = activeWindow.getSelection();
			const selectedText = selection?.toString() || '';
			const previewContainer = markdownView.containerEl.querySelector('.markdown-preview-view');
			const contentText = previewContainer?.textContent || '';

			// If we have a very large selection that includes more than just content, it's likely CTRL-A
			// In this case, show content-only word count instead of clearing
			if (selectedText.length > contentText.length * 1.1 && this.statusBarItem && this.settings.showStatusBar) {
				this.log('Selection change - Detected CTRL-A selection (includes title), showing content count');

				const disabledExclusions = getDisabledExclusionsFromFrontmatter(this.app);
				const wordCount = countSelectedWords(
					contentText,
					this.settings.exclusionList.split(',').map((e) => e.trim()).filter((e) => e),
					true,
					this.settings,
					this,
					disabledExclusions,
				);

				const liveIndicator = this.settings.enableLiveCount ? ' (live)' : '';
				const statusText = `${this.settings.statusBarLabel}${wordCount}${liveIndicator}`;

				// Store the content for later use (e.g., when clicking status bar)
				this.lastSelectedText = contentText;
				this.log('Selection change - Stored CTRL-A content text, length:', contentText.length);

				this.log('Selection change - Setting CTRL-A status bar text:', statusText);
				this.statusBarItem.setText(statusText);
				return;
			}
		}

		// Enhanced debugging for Canvas integration
		const selection = activeWindow.getSelection();
		const selectedText = selection ? selection.toString() : '';
		const activeLeaf = this.app.workspace.getMostRecentLeaf();
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
			const iframe = activeDocument.activeElement as HTMLIFrameElement;
			this.log('Selection change - Active element:', iframe?.tagName);
			this.log('Selection change - Is iframe?', iframe?.tagName === 'IFRAME');
			if (iframe?.tagName === 'IFRAME' && iframe.contentWindow) {
				try {
					const iframeSelection = iframe.contentWindow.getSelection();
					const iframeText = iframeSelection?.toString() || '';
					this.log('Selection change - Iframe selection:', iframeText.length, 'chars');
					this.log('Selection change - Iframe text preview:', iframeText.substring(0, 50));
				} catch (e) {
					this.log('Selection change - Iframe error:', errorMessage(e));
				}
			}
		}


		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.log('Debounced selection change - updating status bar');
			this.updateStatusBar();
		}, 300); // 300ms debounce
	};

	private handleKeyDown = (event: KeyboardEvent) => {
		// Detect CTRL-A (Windows/Linux) or CMD-A (macOS) and handle it directly since Reading view doesn't create proper selections
		if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !event.shiftKey && !event.altKey) {
			this.log('Select All detected (Ctrl+A or Cmd+A)!');

			const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (markdownView && markdownView.getMode() === 'preview') {
				this.log('Select All in Reading view - handling select all directly');

				// Set flag immediately to prevent selection change handler interference
				this.ctrlAProcessed = Date.now();
				this.log('Select All flag set immediately:', this.ctrlAProcessed);

				// Get the preview container
				const previewContainer = markdownView.containerEl.querySelector('.markdown-preview-view');
				if (previewContainer && this.statusBarItem && this.settings.showStatusBar) {
					// Use a longer timeout to ensure DOM is updated after CTRL-A
					window.setTimeout(() => {
						this.log('Select All timeout - extracting full document content');

						// Get content text directly (this excludes title and frontmatter automatically)
						const contentText = previewContainer.textContent || '';

						if (contentText.trim() && this.statusBarItem) {
							this.log('Select All - Processing document content:', contentText.length, 'chars');

							const disabledExclusions = getDisabledExclusionsFromFrontmatter(this.app);
							const wordCount = countSelectedWords(
								contentText,
								this.settings.exclusionList.split(',').map((e) => e.trim()).filter((e) => e),
								true,
								this.settings,
								this,
								disabledExclusions,
							);

							const liveIndicator = this.settings.enableLiveCount ? ' (live)' : '';
							const statusText = `${this.settings.statusBarLabel}${wordCount}${liveIndicator}`;

							this.log('Select All - Setting status bar text:', statusText);
							this.statusBarItem.setText(statusText);

							// Store the content for later use (e.g., when clicking status bar)
							this.lastSelectedText = contentText;
							this.log('Select All - Stored content text, length:', contentText.length);

							// Flag was already set immediately when Select All was detected
						} else {
							this.log('Select All - No content found in preview container or status bar not available');
						}
					}, 100); // Longer delay to ensure Select All completes
				}
			} else if (markdownView) {
				this.log('Select All in', markdownView.getMode(), 'mode - will be handled by selection change');
			}
		}
	};

	private startCanvasPolling() {
		this.stopCanvasPolling(); // Clear any existing timer

		this.canvasPollingTimer = window.setInterval(() => {
			const activeLeaf = this.app.workspace.getMostRecentLeaf();
			const viewType = activeLeaf?.view?.getViewType();

			// Only poll if we're in Canvas view
			if (viewType === 'canvas') {
				const iframe = activeDocument.activeElement as HTMLIFrameElement;
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
					} catch {
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
			window.clearInterval(this.canvasPollingTimer);
			this.canvasPollingTimer = null;
			this.lastCanvasSelection = '';
			this.log('Canvas polling stopped');
		}
	}

	private log(message: string, ...args: unknown[]) {
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
					this.log('Source mode selection (before frontmatter stripping):', selectedText);
					// Strip frontmatter for consistency across all modes
					selectedText = stripFrontmatter(selectedText);
					this.log('Source mode selection (after frontmatter stripping):', selectedText);
				} else if (markdownView.getMode() === 'preview') {
					// Reading view mode
					const selection = activeWindow.getSelection();
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
					this.log('Live Preview mode selection (before frontmatter stripping):', selectedText);
					// Strip frontmatter for consistency across all modes
					selectedText = stripFrontmatter(selectedText);
					this.log('Live Preview mode selection (after frontmatter stripping):', selectedText);
				}
			} else {
				// Fallback for non-MarkdownView types (Canvas, etc.)
				const activeLeaf = this.app.workspace.getMostRecentLeaf();
				if (activeLeaf && activeLeaf.view) {
					viewType = activeLeaf.view.getViewType();
					this.log('HandleWordCount - non-MarkdownView type:', viewType);

					// Try multiple methods to get selected text for Canvas/other views
					const windowSelection = activeWindow.getSelection();
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

							const iframe = activeDocument.activeElement as HTMLIFrameElement;
							if (iframe && iframe.tagName === 'IFRAME' && iframe.contentWindow) {
								try {
									const iframeSelection = iframe.contentWindow.getSelection();
									if (iframeSelection) {
										selectionText = iframeSelection.toString();
										this.log('HandleWordCount - fresh Canvas iframe selection found:', selectionText.length, 'chars');
									}
								} catch (e) {
									this.log('HandleWordCount - Canvas iframe selection error:', errorMessage(e));
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

			if (!selectedText && this.lastSelectedText) {
				// Use the stored selection if we have one (e.g., after clicking status bar following select-all)
				this.log('No current selection, using stored selection');
				selectedText = this.lastSelectedText;
			}

			if (!selectedText) {
				this.log('No text selected');
				new Notice('No text selected');
				return;
			}

			this.log('Processing selection:', selectedText);
			const exclusions = this.settings.exclusionList.split(',').map((e) => e.trim()).filter((e) => e);
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
				date: new Date(),
			});
			if (this.history.length > 50) this.history.pop();
			await this.saveSettings();

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
			window.clearTimeout(this.debounceTimer);
		}
		// Stop Canvas polling
		this.stopCanvasPolling();
		if (this.statusBarItem) {
			this.statusBarItem.remove();
		}
		// Live-update listeners registered via this.registerDomEvent are
		// cleaned up automatically by the Plugin base class on unload.

		// Drop the body class that hides Obsidian's core word count
		activeDocument.body.removeClass('word-count-hide-core');
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
				// Strip frontmatter for consistency across all modes
				selectedText = stripFrontmatter(selectedText);
			} else if (markdownView.getMode() === 'preview') {
				// Use the same sophisticated logic as handleWordCount for Reading view
				const selection = activeWindow.getSelection();
				this.log('Status bar - Reading view selection object:', selection);

				// First find the markdown preview container
				const previewContainer = markdownView.containerEl.querySelector('.markdown-preview-view');
				this.log('Status bar - Preview container:', previewContainer);

				if (selection && selection.rangeCount > 0 && previewContainer) {
					const range = selection.getRangeAt(0);
					this.log('Status bar - Range text:', range?.toString());
					this.log('Status bar - Selection isCollapsed:', selection.isCollapsed);
					this.log('Status bar - Range collapsed:', range.collapsed);
					this.log('Status bar - Start container type:', range.startContainer.nodeType);
					this.log('Status bar - End container type:', range.endContainer.nodeType);
					this.log('Status bar - Start offset:', range.startOffset);
					this.log('Status bar - End offset:', range.endOffset);

					// Check if either the start or end container is within the preview
					const startInPreview = previewContainer.contains(range.startContainer);
					const endInPreview = previewContainer.contains(range.endContainer);

					this.log('Status bar - Start in preview:', startInPreview);
					this.log('Status bar - End in preview:', endInPreview);

					if (range.toString().trim()) {
						if (startInPreview || endInPreview) {
							selectedText = range.toString();
							this.log('Status bar - Using selection from Reading view:', selectedText.length, 'chars');
						} else {
							this.log('Status bar - Selection containers not within preview');
						}
					} else if (!range.collapsed && (startInPreview || endInPreview)) {
						// Try extracting text manually if range is non-collapsed but toString() is empty
						try {
							const clonedContents = range.cloneContents();
							const extractedText = clonedContents.textContent || '';
							if (extractedText.trim()) {
								selectedText = extractedText;
								this.log('Status bar - Extracted text manually:', selectedText.length, 'chars');
							}
						} catch (e) {
							this.log('Status bar - Manual extraction failed:', errorMessage(e));
						}
					} else {
						this.log('Status bar - Empty or collapsed selection');
					}
				} else {
					this.log('Status bar - No valid selection range found or preview container not found');
				}
			} else {
				// Live Preview mode (default case)
				selectedText = markdownView.editor.getSelection();
				// Strip frontmatter for consistency across all modes
				selectedText = stripFrontmatter(selectedText);
			}
		} else {
			// Fallback for non-MarkdownView types (Canvas, etc.)
			const activeLeaf = this.app.workspace.getMostRecentLeaf();
			if (activeLeaf && activeLeaf.view) {
				viewType = activeLeaf.view.getViewType();
				this.log('Updating status bar for non-MarkdownView type:', viewType);

				// Debug Canvas view properties
				if (viewType === 'canvas') {
					this.log('Canvas view properties:', Object.keys(activeLeaf.view));
					this.log('Canvas view container:', activeLeaf.view.containerEl);

					// Check for iframe access
					const iframe = activeDocument.activeElement as HTMLIFrameElement;
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
								this.log('Iframe selection error:', errorMessage(e));
							}
						}
					}
				}

				// Try multiple methods to get selected text for Canvas/other views
				const windowSelection = activeWindow.getSelection();
				let selectionText = windowSelection?.toString() || '';

				// For Canvas views, check iframe selection
				if (!selectionText && viewType === 'canvas') {
					this.log('Trying Canvas iframe selection...');

					// Check if active element is an iframe (Canvas content)
					const iframe = activeDocument.activeElement as HTMLIFrameElement;
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
							this.log('Canvas iframe selection error:', errorMessage(e));
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
			this.lastSelectedText = ''; // Clear stored selection
			this.log('No text selected, clearing status bar');
			return;
		}

		// Store the selected text for later use (e.g., when clicking status bar after select-all)
		this.lastSelectedText = selectedText;
		this.log('Storing selected text, length:', selectedText.length);

		const disabledExclusions = getDisabledExclusionsFromFrontmatter(this.app);
		const wordCount = count ?? countSelectedWords(
			selectedText,
			this.settings.exclusionList.split(',').map((e) => e.trim()).filter((e) => e),
			true,
			this.settings,
			this,
			disabledExclusions,
		);

		// Add live indicator if enabled
		const liveIndicator = this.settings.enableLiveCount ? ' (live)' : '';
		const statusText = `${this.settings.statusBarLabel}${wordCount}${liveIndicator}`;

		this.log('Setting status bar text:', statusText);
		this.statusBarItem.setText(statusText);
	}

	public addCoreWordCountStyle() {
		activeDocument.body.toggleClass('word-count-hide-core', this.settings.hideCoreWordCount);
	}

	// Detects if the cursor is on a heading line and returns the full heading text
	// (including markers), or null if the cursor is not on a heading line.
	getHeadingAtCursor(editor: Editor, cursor: EditorPosition): string | null {
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
				(existingHeading) => existingHeading.toLowerCase() === trimmedHeading.toLowerCase(),
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
			(this.app as AppWithInternals).setting.open();
			(this.app as AppWithInternals).setting.openTabById(this.manifest.id);

		} catch (error) {
			this.log('Error adding excluded heading:', errorMessage(error));
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
				(existingPhrase) => existingPhrase.toLowerCase() === trimmedPhrase.toLowerCase(),
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
			(this.app as AppWithInternals).setting.open();
			(this.app as AppWithInternals).setting.openTabById(this.manifest.id);

		} catch (error) {
			this.log('Error adding excluded phrase:', errorMessage(error));
			new Notice('Failed to add phrase to exclusion list');
		}
	}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<WordCountPluginSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		// Load history from settings, converting date strings to Date objects
		if (this.settings.history && Array.isArray(this.settings.history)) {
			this.history = this.settings.history.map((entry) => ({
				count: entry.count,
				characterCount: entry.characterCount,
				sentenceCount: entry.sentenceCount,
				date: new Date(entry.date),
			}));
		} else {
			this.history = [];
		}
	}

	async saveSettings() {
		// Sync the runtime history into the persisted-settings shape
		// (Date -> ISO string). Previously the runtime array and the
		// persisted array drifted: new entries (and their character /
		// sentence counts) never made it to disk.
		this.settings.history = this.history.map((entry) => ({
			count: entry.count,
			characterCount: entry.characterCount,
			sentenceCount: entry.sentenceCount,
			date: entry.date.toISOString(),
		}));
		await this.saveData(this.settings);

		// Update UI elements based on settings
		this.setupStatusBar();
		this.addCoreWordCountStyle();
	}
}
