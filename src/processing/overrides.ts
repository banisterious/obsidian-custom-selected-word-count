import { debugLog, type DebugLoggable } from '../utils/debug';

// Walks `text` looking for `cswc-disable` / `cswc-enable` marker pairs
// (HTML-style `<!-- ... -->` or Obsidian-style `%% ... %%`). Sections
// between a disable marker and the next enable marker are kept as-is;
// other text is passed through `processFunc` for normal exclusion
// handling. An unclosed disable marker extends to end of text.
export function processTextWithOverrides(
	text: string,
	processFunc: (text: string) => string,
	plugin?: DebugLoggable,
): string {
	// Combined regex to match both HTML and Obsidian style comments with cswc-disable or cswc-enable
	const markerRegex = /(?:<!--\s*cswc-(disable|enable)\s*-->|%%\s*cswc-(disable|enable)\s*%%)/gi;

	let result = '';
	let lastIndex = 0;
	let inOverrideSection = false;
	let match;

	// Reset regex state
	markerRegex.lastIndex = 0;

	while ((match = markerRegex.exec(text)) !== null) {
		const marker = match[1] || match[2]; // Get 'disable' or 'enable'
		const beforeMatch = text.substring(lastIndex, match.index);

		if (inOverrideSection) {
			// In override section - add text as-is
			result += beforeMatch;
		} else {
			// Not in override section - apply processing
			result += processFunc(beforeMatch);
		}

		// Toggle override state
		if (marker === 'disable' && !inOverrideSection) {
			inOverrideSection = true;
			if (plugin) debugLog(plugin, 'Entering override section at position:', match.index);
		} else if (marker === 'enable' && inOverrideSection) {
			inOverrideSection = false;
			if (plugin) debugLog(plugin, 'Exiting override section at position:', match.index);
		}

		lastIndex = match.index + match[0].length;
	}

	// Process remaining text
	const remainingText = text.substring(lastIndex);
	if (inOverrideSection) {
		result += remainingText;
		if (plugin) debugLog(plugin, 'Override section extends to end of text');
	} else {
		result += processFunc(remainingText);
	}

	return result;
}
