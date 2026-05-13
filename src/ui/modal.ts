import { App, Modal, Notice, setIcon } from 'obsidian';
import type { CountResult, WordCountHistoryEntry } from '../types';
import type CustomSelectedWordCountPlugin from '../../main';

// Minimal modal for displaying word count and history
export class WordCountModal extends Modal {
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
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('word-count-modal');

		// Modal header with icon
		const headerEl = contentEl.createDiv({ cls: 'modal-header' });
		const headerIcon = headerEl.createSpan({ cls: 'modal-header-icon', attr: { 'aria-hidden': 'true' } });
		setIcon(headerIcon, 'chart-no-axes-column');
		headerEl.createEl('h2', { cls: 'modal-title', text: 'Selection analysis' });

		// Modal content with improved padding
		const modalContentEl = contentEl.createDiv({ cls: 'modal-content' });

		// Count cards section with enhanced layout
		const countCardsEl = modalContentEl.createDiv({ cls: 'count-cards' });

		// Word count card
		this.createCountCard(
			countCardsEl,
			'word-count-lucide-type',
			'WORDS',
			this.countResult.words,
			'Advanced word detection including contractions, hyphenated words, and numbers',
			'Copy Words Count',
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
				'Copy Characters Count',
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
				'Copy Sentences Count',
			);
		}

		// History section
		if (this.history.length > 0) {
			const historySection = modalContentEl.createDiv({ cls: 'history-section' });

			const historyHeader = historySection.createDiv({ cls: 'history-header' });
			const historyTitle = historyHeader.createDiv({ cls: 'history-title' });
			const historyIcon = historyTitle.createSpan({ cls: 'history-title-icon', attr: { 'aria-hidden': 'true' } });
			setIcon(historyIcon, 'clock');
			historyTitle.appendText('Recent Counts');

			const clearButton = historyHeader.createEl('button', {
				cls: 'clear-btn',
				attr: {
					'title': 'Clear all history entries',
					'aria-label': 'Clear all history entries',
				},
			});
			const clearIcon = clearButton.createSpan({ cls: 'clear-btn-icon', attr: { 'aria-hidden': 'true' } });
			setIcon(clearIcon, 'trash-2');
			clearButton.appendText('Clear');

			clearButton.addEventListener('click', () => {
				new ConfirmModal(this.app, 'Clear all history entries?', 'Clear', () => {
					if (this.plugin) {
						this.plugin.history = [];
						void this.plugin.saveSettings();
						this.close();
					}
				}).open();
			});

			const historyList = historySection.createDiv({ cls: 'history-list' });

			this.history.slice().reverse().forEach((entry) => {
				const entryDiv = historyList.createDiv({ cls: 'history-entry' });

				// Build the full count text
				const countParts: string[] = [`${entry.count} words`];

				if (entry.characterCount !== undefined && this.plugin?.settings.showCharacterCount) {
					countParts.push(`${entry.characterCount} chars`);
				}

				if (entry.sentenceCount !== undefined && this.plugin?.settings.showSentenceCount) {
					countParts.push(`${entry.sentenceCount} sentences`);
				}

				const fullCountText = countParts.join(', ');

				// Create content container for text and timestamp
				const contentDiv = entryDiv.createDiv({ cls: 'history-content' });
				contentDiv.createDiv({ cls: 'history-text', text: fullCountText });

				// Add timestamp if enabled
				if (this.showDateTime) {
					const timestampEl = contentDiv.createDiv({ cls: 'history-timestamp' });
					timestampEl.textContent = entry.date.toLocaleString();
				}

				const actionsDiv = entryDiv.createDiv({ cls: 'history-actions' });

				// Single copy button that copies the entire count string
				const copyButton = actionsDiv.createEl('button', {
					cls: 'history-copy-btn',
					attr: {
						'title': 'Copy this count',
						'aria-label': `Copy "${fullCountText}"`,
					},
				});
				const historyCopyIcon = copyButton.createSpan({ cls: 'history-copy-icon', attr: { 'aria-hidden': 'true' } });
				setIcon(historyCopyIcon, 'copy');
				copyButton.appendText('Copy');

				copyButton.addEventListener('click', () => {
					void (async () => {
						await navigator.clipboard.writeText(fullCountText);
						new Notice('Count copied to clipboard');

						// Visual feedback
						historyCopyIcon.empty();
						setIcon(historyCopyIcon, 'check');
						copyButton.addClass('word-count-copy-confirmed');

						window.setTimeout(() => {
							historyCopyIcon.empty();
							setIcon(historyCopyIcon, 'copy');
							copyButton.removeClass('word-count-copy-confirmed');
						}, 1000);
					})();
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
		tooltipText: string,
	) {
		const card = container.createDiv({ cls: 'count-card' });

		// Card header with icon and label
		const header = card.createDiv({ cls: 'count-header' });
		const labelDiv = header.createDiv({ cls: 'count-label' });
		const labelIcon = labelDiv.createSpan({ cls: 'count-label-icon', attr: { 'aria-hidden': 'true' } });
		this.setCardIcon(labelIcon, iconClass);
		labelDiv.appendText(label);

		// Count value container with number and copy button
		const valueContainer = card.createDiv({ cls: 'count-value-container' });
		const formattedCount = count.toLocaleString(); // Add thousands separators
		const valueEl = valueContainer.createDiv({ cls: 'count-value', text: formattedCount });

		// Apply dynamic font sizing based on digit count
		this.applyDynamicFontSize(valueEl, count);

		const copyButton = valueContainer.createEl('button', {
			cls: 'copy-button',
			attr: {
				'title': tooltipText,
				'aria-label': tooltipText,
			},
		});
		const copyIcon = copyButton.createSpan({ cls: 'copy-button-icon', attr: { 'aria-hidden': 'true' } });
		setIcon(copyIcon, 'copy');

		// Description text
		card.createDiv({ cls: 'count-subtitle', text: description });

		// Copy button functionality
		copyButton.addEventListener('click', () => {
			void (async () => {
				await navigator.clipboard.writeText(count.toString());
				new Notice(`${label.toLowerCase()} count copied to clipboard`);

				// Visual feedback - briefly change button appearance
				copyIcon.empty();
				setIcon(copyIcon, 'check');
				copyButton.addClass('word-count-copy-confirmed');

				window.setTimeout(() => {
					copyIcon.empty();
					setIcon(copyIcon, 'copy');
					copyButton.removeClass('word-count-copy-confirmed');
				}, 1000);
			})();
		});

		return card;
	}

	// Sets the appropriate icon for count card labels.
	private setCardIcon(element: HTMLElement, iconClass: string): void {
		if (iconClass.includes('type')) {
			setIcon(element, 'type');
		} else if (iconClass.includes('hash')) {
			setIcon(element, 'hash');
		} else if (iconClass.includes('list-ordered')) {
			setIcon(element, 'list-ordered');
		}
	}

	// Dynamically adjusts font size based on the number of digits to prevent layout overflow.
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
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Minimal confirm dialog so the plugin can drop the browser-native
// `confirm()` call (flagged by `no-alert` and not Obsidian-idiomatic).
export class ConfirmModal extends Modal {
	private message: string;
	private confirmLabel: string;
	private onConfirm: () => void;

	constructor(app: App, message: string, confirmLabel: string, onConfirm: () => void) {
		super(app);
		this.message = message;
		this.confirmLabel = confirmLabel;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('p', { text: this.message });

		const buttons = contentEl.createDiv({ cls: 'word-count-confirm-buttons' });

		const cancelButton = buttons.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());

		const confirmButton = buttons.createEl('button', {
			text: this.confirmLabel,
			cls: 'mod-warning',
		});
		confirmButton.addEventListener('click', () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
