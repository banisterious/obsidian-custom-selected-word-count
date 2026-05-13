import { DEFAULT_WORD_REGEX, type WordCountPluginSettings } from '../settings/types';
import { debugLog, type DebugLoggable } from '../utils/debug';
import { applyExclusions } from './pipeline';

// Counts words in the selected text. After the shared exclusion
// pipeline runs, word counting layers on its own path / file-extension
// handling (since paths and filenames are word-level concerns, not
// general exclusions):
//
//   1. `file:///` URLs are stripped first.
//   2. The text is split on whitespace into raw segments.
//   3. Each segment is classified: decimal number (kept), path-start
//      (buffered), or normal word (kept).
//   4. Path buffers grow greedily until a `looksLikePath` re-check
//      fails. (See Phase 4 finding #1: this is the source of the
//      "path swallows trailing words" quirk; locked behavior.)
//   5. Excluded-extension filenames are dropped from the surviving
//      word list.
//   6. The remaining segments are joined and run through a final word
//      regex — the user's custom regex if `enableAdvancedRegex` is on
//      and parses, otherwise the default smart-quote-aware fallback.
export function countSelectedWords(
	selectedText: string,
	excludedExtensions: string[] = [],
	stripEmojis: boolean = true,
	settings?: WordCountPluginSettings,
	plugin?: DebugLoggable,
	disabledExclusions: string[] = [],
): number {
	if (!selectedText) return 0;

	if (plugin) debugLog(plugin, 'Initial text:', selectedText);

	const isExclusionDisabled = (exclusionId: string): boolean => disabledExclusions.includes(exclusionId);

	selectedText = applyExclusions(selectedText, settings, plugin, disabledExclusions);

	// Function to normalize path separators
	const normalizePath = (str: string): string => str.replace(/[/\\]+/g, '/');

	// Function to check if a string looks like a path
	const looksLikePath = (str: string): boolean => {
		if (!settings?.excludePaths) return false;

		if (plugin) debugLog(plugin, 'Checking path:', str);

		// Windows drive letter paths (C:\ or C:/)
		if (/^[A-Za-z]:[/\\]/.test(str)) {
			if (settings.excludeWindowsPaths && !isExclusionDisabled('exclude-windows-paths')) {
				if (plugin) debugLog(plugin, 'Matched Windows drive path');
				return true;
			}
			if (plugin) debugLog(plugin, 'Windows path detected but exclusion disabled');
			return false;
		}

		// Environment variables - check original string
		if (/^(?:%[^%]+%|\$[A-Za-z_][A-Za-z0-9_]*)/.test(str)) {
			// Check if this is a Windows path with an environment variable
			if (/^%[^%]+%[/\\]/.test(str)) {
				if (settings.excludeWindowsPaths && !isExclusionDisabled('exclude-windows-paths')) {
					if (plugin) debugLog(plugin, 'Matched Windows path with environment variable');
					return true;
				}
				if (plugin) debugLog(plugin, 'Windows path with environment variable detected but exclusion disabled');
				return false;
			}

			if (settings.excludeEnvironmentPaths && !isExclusionDisabled('exclude-environment-paths')) {
				if (plugin) debugLog(plugin, 'Matched environment variable');
				return true;
			}
			if (plugin) debugLog(plugin, 'Environment variable detected but exclusion disabled');
			return false;
		}

		// UNC paths (\\server\share) - check original string
		if (/^\\\\[^\\]+\\[^\\]+/.test(str)) {
			if (settings.excludeUNCPaths && !isExclusionDisabled('exclude-unc-paths')) {
				if (plugin) debugLog(plugin, 'Matched UNC path');
				return true;
			}
			if (plugin) debugLog(plugin, 'UNC path detected but exclusion disabled');
			return false;
		}

		// Now normalize for other checks
		const normalizedStr = normalizePath(str);

		// file:/// protocol
		if (/^file:\/\/\//.test(normalizedStr)) {
			if (plugin) debugLog(plugin, 'Matched file:/// protocol');
			return true;
		}

		// Unix paths (/usr/local)
		if (/^\/[^/]/.test(normalizedStr)) {
			if (settings.excludeUnixPaths && !isExclusionDisabled('exclude-unix-paths')) {
				if (plugin) debugLog(plugin, 'Matched Unix path');
				return true;
			}
			if (plugin) debugLog(plugin, 'Unix path detected but exclusion disabled');
			return false;
		}

		return false;
	};

	// Function to check if a string ends with any of the excluded extensions
	const hasExcludedExtension = (str: string): boolean => {
		if (!excludedExtensions.length) return false;

		// Don't treat decimal numbers as having extensions
		if (/^\d+\.\d+$/.test(str)) {
			return false;
		}

		str = str.toLowerCase(); // normalize to lowercase
		const filename = str.split(/[/\\]/).pop() || '';

		if (!filename.includes('.')) {
			return false;
		}

		const result = excludedExtensions.some((ext) => {
			const pattern = new RegExp('\\.' + ext.replace(/^\./, '') + '$', 'i');
			return pattern.test(filename);
		});

		return result;
	};

	// First handle file:/// protocol paths
	if (settings?.excludePaths) {
		const fileProtocolPattern = /file:\/\/\/[^\s]+/g;
		selectedText = selectedText.replace(fileProtocolPattern, ' ');
	}

	// Split text into segments while preserving decimal numbers and handling paths
	const segments: string[] = [];
	let buffer = '';
	let inPath = false;

	// Split into words but preserve decimal points in numbers
	const rawSegments = selectedText.split(/\s+/);
	if (plugin) debugLog(plugin, 'Raw segments:', rawSegments);

	for (let i = 0; i < rawSegments.length; i++) {
		const segment = rawSegments[i];
		if (!segment) continue;

		// Check if this segment is a decimal number
		if (/^\d+\.\d+$/.test(segment)) {
			segments.push(segment);
			continue;
		}

		// Check if this segment starts a path
		const isPathStart = looksLikePath(segment);

		if (settings?.excludePaths && isPathStart) {
			inPath = true;
			buffer = segment;
		}
		// Check if this segment continues a path
		else if (inPath) {
			buffer += ' ' + segment;
			// Check if the complete buffer is a path after each addition
			const isValidPath = looksLikePath(buffer);

			if (isValidPath) {
				if (plugin) debugLog(plugin, 'Path continues with:', segment);
			} else {
				if (plugin) debugLog(plugin, 'Path continuation check failed, reverting');
				segments.push(...buffer.split(/\s+/));
				inPath = false;
				buffer = '';
			}
		}
		// Normal word (not part of a path)
		else {
			segments.push(segment);
		}
	}

	// Handle any remaining buffer
	if (buffer) {
		const isValidPath = looksLikePath(buffer);

		if (inPath && isValidPath) {
			if (plugin) debugLog(plugin, 'Excluding final path:', buffer);
		} else {
			segments.push(...buffer.split(/\s+/));
		}
	}

	if (plugin) debugLog(plugin, 'Processed segments:', segments);

	// Filter out paths and handle extensions
	const filteredWords = segments.filter((word) => {
		if (!word.trim()) return false;

		// Always keep decimal numbers
		if (/^\d+\.\d+$/.test(word)) return true;

		if (hasExcludedExtension(word)) return false;
		if (settings?.excludePaths && looksLikePath(word)) return false;

		return true;
	});

	if (plugin) debugLog(plugin, 'Filtered words:', filteredWords);
	selectedText = filteredWords.join(' ');

	// Strip double quotes only (preserve all apostrophes for contractions) and emojis
	selectedText = selectedText.replace(/["""]/g, '');
	if (stripEmojis) {
		selectedText = selectedText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
	}

	// Use advanced regex if enabled and valid
	let wordRegex: RegExp;
	if (settings?.enableAdvancedRegex && settings.customWordRegex && settings.customWordRegex.trim()) {
		try {
			wordRegex = new RegExp(settings.customWordRegex, 'giu');
		} catch (e) {
			if (plugin) debugLog(plugin, 'Invalid custom regex, falling back to default:', e);
			wordRegex = new RegExp(DEFAULT_WORD_REGEX, 'giu');
		}
	} else {
		wordRegex = new RegExp(DEFAULT_WORD_REGEX, 'giu');
	}

	if (plugin) debugLog(plugin, 'Final text before regex matching:', selectedText);
	if (plugin) debugLog(plugin, 'Using word regex pattern:', wordRegex.source);

	// Test for smart quotes specifically
	if (plugin && /[‘’']/.test(selectedText)) {
		debugLog(plugin, 'Smart quotes detected in text');
		const smartQuoteMatches = selectedText.match(/[‘’']/g);
		if (smartQuoteMatches) {
			debugLog(plugin, 'Smart quote characters found:', smartQuoteMatches.map((char) =>
				`'${char}' (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`,
			));
		}
	}

	const matches = selectedText.match(wordRegex);
	if (plugin) debugLog(plugin, 'Regex matches found:', matches);
	return matches ? matches.length : 0;
}
