import type { WordCountPluginSettings } from '../settings/types';
import { debugLog, type DebugLoggable } from '../utils/debug';
import { applyExclusions } from './pipeline';

// Counts sentences in the selected text using a regex-based boundary
// detector. The shared `applyExclusions` pass runs first; the
// post-pipeline steps below are sentence-specific:
//
//   1. Strip code blocks / inline code / heading lines that the
//      override wrapper may have left intact (e.g. when the user has
//      excludeCode / excludeHeadings disabled but those constructs still
//      contain punctuation that would confuse sentence detection).
//   2. Strip URLs and Windows file paths so the periods inside them
//      don't read as sentence endings.
//   3. Split on /[.!?]+(?:\s*["'])?(?:\s+|$)/ and filter parts.
//
// Three known characterization-test quirks live here:
//   - The abbreviation guard never fires (the period is consumed by
//     the split before the guard tests for it).
//   - The file-extension guard discards entire sentences ending in
//     `name.ext`, not just the in-filename period.
//   - The second URL/path strip below is a safety net for bare URLs
//     that the override-wrapped processLinks step does not catch.
// See docs/planning/audit-phase-4-tests.md § Findings.
export function countSelectedSentences(
	selectedText: string,
	settings?: WordCountPluginSettings,
	plugin?: DebugLoggable,
	disabledExclusions: string[] = [],
): number {
	if (!selectedText) return 0;

	if (plugin) debugLog(plugin, 'Counting sentences in text:', selectedText);

	let processedText = applyExclusions(selectedText, settings, plugin, disabledExclusions);

	// Remove code blocks and inline code first
	processedText = processedText.replace(/```[\s\S]*?```/g, ' ');
	processedText = processedText.replace(/`[^`]*`/g, ' ');

	// Remove markdown headers
	processedText = processedText.replace(/^#{1,6}\s+.*$/gm, ' ');

	// Remove URLs and file paths to avoid counting periods in them
	processedText = processedText.replace(/https?:\/\/[^\s]+/g, ' ');
	processedText = processedText.replace(/[a-zA-Z]:[\\/][^\s]+/g, ' ');

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
		if (/\b(?:Mr|Mrs|Dr|Prof|Sr|Jr|vs|etc|Inc|Ltd|Corp|Co|St|Ave|Blvd|Rd|Dept|Univ|govt|admin|info|tech|dev|org|com|net|edu|gov|mil|int|biz|name|pro|museum|coop|aero|jobs|mobi|travel|xxx|tel|cat|asia|post)\./i.test(part)) {
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
