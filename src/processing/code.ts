import { debugLog, type DebugLoggable } from '../utils/debug';

// Removes fenced code blocks (``` and ~~~) when excludeCodeBlocks is true.
export function processCodeBlocks(
	text: string,
	excludeCodeBlocks: boolean,
	plugin?: DebugLoggable,
): string {
	if (!excludeCodeBlocks) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing code blocks');

	// Remove code blocks (both ``` and ~~~)
	return text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
}

// Removes single-backtick inline code spans when excludeInlineCode is true.
export function processInlineCode(
	text: string,
	excludeInlineCode: boolean,
	plugin?: DebugLoggable,
): string {
	if (!excludeInlineCode) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing inline code');

	// Remove inline code (single backticks, but not within code blocks)
	// This regex handles escaped backticks and ensures we match paired backticks
	return text.replace(/`(?:[^`\\]|\\.)*`/g, '');
}
