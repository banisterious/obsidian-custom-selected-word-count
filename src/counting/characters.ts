import type { WordCountPluginSettings } from '../settings/types';
import { debugLog, type DebugLoggable } from '../utils/debug';
import { applyExclusions } from './pipeline';

// Counts characters in the selected text after running the shared
// exclusion pipeline, then applies one of three counting modes:
//   - 'all'           : count every character including spaces and punctuation
//   - 'no-spaces'     : count every character except whitespace
//   - 'letters-only'  : count only A-Z / a-z
export function countSelectedCharacters(
	selectedText: string,
	mode: 'all' | 'no-spaces' | 'letters-only' = 'all',
	settings?: WordCountPluginSettings,
	plugin?: DebugLoggable,
	disabledExclusions: string[] = [],
): number {
	if (!selectedText) return 0;

	if (plugin) debugLog(plugin, 'Counting characters in mode:', mode);

	let processedText = applyExclusions(selectedText, settings, plugin, disabledExclusions);

	switch (mode) {
		case 'all':
			return processedText.length;
		case 'no-spaces':
			processedText = processedText.replace(/\s/g, '');
			return processedText.length;
		case 'letters-only': {
			const matches = processedText.match(/[A-Za-z]/g);
			return matches ? matches.length : 0;
		}
		default:
			return processedText.length;
	}
}
