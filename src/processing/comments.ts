import { debugLog, type DebugLoggable } from '../utils/debug';

// Processes Obsidian comments (%% %%). When excludeContent is true the
// entire comment (markers + content) is removed; otherwise only the %%
// markers are stripped and the content remains.
export function processObsidianComments(
	text: string,
	excludeComments: boolean,
	excludeContent: boolean,
	plugin?: DebugLoggable,
): string {
	if (!excludeComments) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing Obsidian comments, exclude content:', excludeContent);

	if (excludeContent) {
		// Remove entire comments including content
		return text.replace(/%%[\s\S]*?%%/g, '');
	} else {
		// Remove only comment markers, keep content
		return text.replace(/%%/g, '');
	}
}

// Processes HTML comments (<!-- -->). Same shape as the Obsidian variant.
export function processHtmlComments(
	text: string,
	excludeComments: boolean,
	excludeContent: boolean,
	plugin?: DebugLoggable,
): string {
	if (!excludeComments) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing HTML comments, exclude content:', excludeContent);

	if (excludeContent) {
		// Remove entire comments including content
		return text.replace(/<!--[\s\S]*?-->/g, '');
	} else {
		// Remove only comment markers, keep content
		return text.replace(/<!--/g, '').replace(/-->/g, '');
	}
}
