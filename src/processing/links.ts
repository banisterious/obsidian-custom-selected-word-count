import { debugLog, type DebugLoggable } from '../utils/debug';

// Replaces markdown link syntax with just the visible portion when
// excludeNonVisible is true:
//   [[Note|alias]]      -> alias
//   [[Note Name]]       -> Note Name
//   [text](url)         -> text
export function processLinks(
	text: string,
	excludeNonVisible: boolean,
	plugin?: DebugLoggable,
): string {
	if (!excludeNonVisible) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing links, exclude non-visible portions:', excludeNonVisible);

	let processedText = text;

	// Process internal links with aliases: [[Note Name|Alias]] -> Alias
	processedText = processedText.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2');

	// Process internal links without aliases: [[Note Name]] -> Note Name
	processedText = processedText.replace(/\[\[([^\]]+)\]\]/g, '$1');

	// Process external links: [link text](url) -> link text
	processedText = processedText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

	if (plugin) debugLog(plugin, 'Text after link processing:', processedText);

	return processedText;
}
