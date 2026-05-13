import { App } from 'obsidian';

// Removes YAML frontmatter from the beginning of selected text.
export function stripFrontmatter(text: string): string {
	// Only remove frontmatter if it starts at the very beginning
	if (!text.startsWith('---')) {
		return text;
	}

	// Find the closing frontmatter delimiter
	const lines = text.split('\n');
	let frontmatterEnd = -1;

	// Start from line 1 (skip the opening ---)
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (line === '---' || line === '...') {
			frontmatterEnd = i;
			break;
		}
	}

	// If no closing delimiter found, assume the whole selection is frontmatter
	if (frontmatterEnd === -1) {
		return '';
	}

	// Return everything after the frontmatter (including the newline after ---)
	const remainingLines = lines.slice(frontmatterEnd + 1);
	return remainingLines.join('\n');
}

// Reads the active file's `cswc-disable` frontmatter and returns the
// list of exclusion identifiers to disable for this count. Returns []
// when there's no active file, no frontmatter, or no `cswc-disable`
// key. The literal "all" expands to the full identifier list.
export function getDisabledExclusionsFromFrontmatter(app: App): string[] {
	const activeFile = app.workspace.getActiveFile();
	if (!activeFile) {
		return [];
	}

	const cache = app.metadataCache.getFileCache(activeFile);
	if (!cache || !cache.frontmatter) {
		return [];
	}

	const cswcDisable: unknown = cache.frontmatter['cswc-disable'];
	if (!cswcDisable) {
		return [];
	}

	// Handle both array and single string formats
	let disabledItems: string[] = [];
	if (Array.isArray(cswcDisable)) {
		disabledItems = cswcDisable.filter((item): item is string => typeof item === 'string');
	} else if (typeof cswcDisable === 'string') {
		disabledItems = [cswcDisable];
	}

	// If "all" is present, return all possible exclusion identifiers
	if (disabledItems.includes('all')) {
		return [
			'exclude-windows-paths',
			'exclude-unix-paths',
			'exclude-unc-paths',
			'exclude-environment-paths',
			'exclude-urls',
			'exclude-code-blocks',
			'exclude-inline-code',
			'exclude-comments',
			'exclude-headings',
			'exclude-specific-headings',
			'exclude-words-phrases',
		];
	}

	return disabledItems;
}
