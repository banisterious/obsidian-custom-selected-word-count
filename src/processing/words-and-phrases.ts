import { debugLog, type DebugLoggable } from '../utils/debug';

// Removes user-configured words and phrases from the text.
//
// - Phrases (the `excludedPhrases` array) are removed first,
//   case-insensitively, with regex-special characters escaped.
// - Words (comma-separated in `excludedWords`) match whole words only
//   (`\b...\b`), case-insensitively, with the same escaping.
export function processWordsAndPhrases(
	text: string,
	excludeWordsAndPhrases: boolean,
	excludedWords: string,
	excludedPhrases: string[],
	plugin?: DebugLoggable,
): string {
	if (!excludeWordsAndPhrases) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing words and phrases exclusion');

	let processedText = text;

	// Process excluded phrases first (case-insensitive)
	if (excludedPhrases && excludedPhrases.length > 0) {
		excludedPhrases.forEach((phrase) => {
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
		const words = excludedWords.split(',').map((w) => w.trim()).filter((w) => w);
		words.forEach((word) => {
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
