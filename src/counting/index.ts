import type { CountResult } from '../types';
import type { WordCountPluginSettings } from '../settings/types';
import type { DebugLoggable } from '../utils/debug';
import { countSelectedCharacters } from './characters';
import { countSelectedSentences } from './sentences';
import { countSelectedWords } from './words';

// Aggregator: runs all three counts against the same input and returns
// them together. Each count function runs its own copy of the exclusion
// pipeline internally — the cost is acceptable because the pipeline is
// pure and inexpensive, and decoupling the three keeps each count's
// post-pipeline logic (mode switch / sentence boundaries / path
// handling) self-contained.
export function countSelectedText(
	selectedText: string,
	excludedExtensions: string[] = [],
	stripEmojis: boolean = true,
	settings?: WordCountPluginSettings,
	plugin?: DebugLoggable,
	disabledExclusions: string[] = [],
): CountResult {
	if (!selectedText) return { words: 0, characters: 0, sentences: 0 };

	const characterCount = countSelectedCharacters(
		selectedText,
		settings?.characterCountMode || 'all',
		settings,
		plugin,
		disabledExclusions,
	);

	const sentenceCount = countSelectedSentences(
		selectedText,
		settings,
		plugin,
		disabledExclusions,
	);

	const wordCount = countSelectedWords(
		selectedText,
		excludedExtensions,
		stripEmojis,
		settings,
		plugin,
		disabledExclusions,
	);

	return { words: wordCount, characters: characterCount, sentences: sentenceCount };
}
