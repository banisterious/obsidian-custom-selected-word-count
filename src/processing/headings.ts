import { debugLog, type DebugLoggable } from '../utils/debug';

// Processes headings according to settings. Order of operations:
//   1. If excludeHeadingSections is non-empty, run the selective pass
//      first to drop named sections and any nested content.
//   2. If excludeEntireLines: drop every heading line (ATX + Setext).
//      Else if excludeMarkersOnly: strip the `#` markers / underline,
//      keeping the heading text inline.
export function processHeadings(
	text: string,
	excludeHeadings: boolean,
	excludeMarkersOnly: boolean,
	excludeEntireLines: boolean,
	excludeHeadingSections: string[],
	plugin?: DebugLoggable,
): string {
	if (!excludeHeadings) {
		return text;
	}

	if (plugin) debugLog(plugin, 'Processing headings, markers only:', excludeMarkersOnly, 'entire lines:', excludeEntireLines, 'specific sections:', excludeHeadingSections);

	let processedText = text;

	// First, handle selective heading section exclusion
	if (excludeHeadingSections && excludeHeadingSections.length > 0) {
		processedText = processSelectiveHeadingSections(text, excludeHeadingSections, plugin);
	}

	// Then apply other heading processing modes
	if (excludeEntireLines) {
		// Remove entire heading lines (both ATX and Setext)
		// ATX headings: # ## ### etc.
		processedText = processedText.replace(/^#{1,6}\s+.*$/gm, '');
		// Setext headings: underlined with = or -
		processedText = processedText.replace(/^.+\n[=-]+\s*$/gm, '');
	} else if (excludeMarkersOnly) {
		// Remove only the heading markers, keep the text
		// ATX headings: remove # symbols and leading space
		processedText = processedText.replace(/^#{1,6}\s+/gm, '');
		// Setext headings: remove the underline, keep the heading text
		processedText = processedText.replace(/^(.+)\n[=-]+\s*$/gm, '$1');
	}

	if (plugin) debugLog(plugin, 'Text after heading processing:', processedText);

	return processedText;
}

// Removes specifically-named heading sections (case-insensitive full-line
// match against excludeHeadingSections) and any nested subsections. A
// heading of equal or higher level (smaller `#` count) ends the skip.
export function processSelectiveHeadingSections(
	selectedText: string,
	excludeHeadingSections: string[],
	plugin?: DebugLoggable,
): string {
	if (plugin) debugLog(plugin, 'Processing selective heading sections for:', excludeHeadingSections);

	// Split the selected text into lines for processing
	const lines = selectedText.split('\n');
	const processedLines: string[] = [];
	let skipUntilNextHeading = false;
	let currentSkippingHeadingLevel = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);

		if (headingMatch) {
			// This is a heading line
			const headingLevel = headingMatch[1].length;
			const fullHeading = line.trim(); // Full heading including markers

			// Check if this heading should be excluded
			const shouldExclude = excludeHeadingSections.some((excludedHeading) =>
				excludedHeading.toLowerCase() === fullHeading.toLowerCase(),
			);

			if (shouldExclude) {
				// Start skipping this heading and its content
				skipUntilNextHeading = true;
				currentSkippingHeadingLevel = headingLevel;
				if (plugin) debugLog(plugin, `Excluding heading section: ${fullHeading}`);
				continue; // Skip this heading line
			} else if (skipUntilNextHeading) {
				// We're currently skipping content, check if this heading ends the section
				if (headingLevel <= currentSkippingHeadingLevel) {
					// This is a same or higher level heading, stop skipping
					skipUntilNextHeading = false;
					currentSkippingHeadingLevel = 0;
					if (plugin) debugLog(plugin, `Ending exclusion at heading: ${fullHeading}`);
				} else {
					// This is a subsection of the excluded heading, continue skipping
					if (plugin) debugLog(plugin, `Skipping subsection: ${fullHeading}`);
					continue;
				}
			}

			// If we reach here, this heading should be kept
			if (!skipUntilNextHeading) {
				processedLines.push(line);
			}
		} else {
			// This is not a heading line
			if (!skipUntilNextHeading) {
				// Keep this line
				processedLines.push(line);
			} else {
				// We're skipping content under an excluded heading
				if (plugin) debugLog(plugin, 'Skipping content line:', line);
			}
		}
	}

	const result = processedLines.join('\n');
	if (plugin) debugLog(plugin, 'Text after selective heading sections processing:', result);
	return result;
}
