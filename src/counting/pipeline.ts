import type { WordCountPluginSettings } from '../settings/types';
import type { DebugLoggable } from '../utils/debug';
import { processTextWithOverrides } from '../processing/overrides';
import { processCodeBlocks, processInlineCode } from '../processing/code';
import { processObsidianComments, processHtmlComments } from '../processing/comments';
import { processLinks } from '../processing/links';
import { processHeadings } from '../processing/headings';
import { processWordsAndPhrases } from '../processing/words-and-phrases';

// Shared exclusion-pipeline orchestrator. Wraps the per-exclusion
// processing helpers in `processTextWithOverrides` so inline
// `cswc-disable` / `cswc-enable` markers carve out untouched regions,
// then runs each exclusion the user has enabled (in the order the
// original count functions did): code blocks, inline code, Obsidian
// comments, HTML comments, links, headings, words/phrases.
//
// Each step honors:
//   1. The relevant setting toggle being on.
//   2. The exclusion identifier NOT being present in `disabledExclusions`
//      (the per-call disable mechanism used by frontmatter overrides).
//
// Phase 5 extracted this from countSelectedCharacters, countSelectedSentences,
// and countSelectedWords, each of which previously hand-rolled an
// identical copy of the pipeline.
export function applyExclusions(
	text: string,
	settings: WordCountPluginSettings | undefined,
	plugin: DebugLoggable | undefined,
	disabledExclusions: string[],
): string {
	const isDisabled = (id: string): boolean => disabledExclusions.includes(id);

	return processTextWithOverrides(text, (segment) => {
		let result = segment;

		// Process code blocks first (before inline code)
		if (settings?.excludeCode && settings?.excludeCodeBlocks && !isDisabled('exclude-code-blocks')) {
			result = processCodeBlocks(result, true, plugin);
		}

		// Process inline code after code blocks
		if (settings?.excludeCode && settings?.excludeInlineCode && !isDisabled('exclude-inline-code')) {
			result = processInlineCode(result, true, plugin);
		}

		// Process comments
		if (settings?.excludeComments && !isDisabled('exclude-comments')) {
			if (settings.excludeObsidianComments) {
				result = processObsidianComments(result, true, settings.excludeObsidianCommentContent, plugin);
			}
			if (settings.excludeHtmlComments) {
				result = processHtmlComments(result, true, settings.excludeHtmlCommentContent, plugin);
			}
		}

		// Process links (after comments, before headings)
		if (settings?.excludeNonVisibleLinkPortions && !isDisabled('exclude-urls')) {
			result = processLinks(result, true, plugin);
		}

		// Process headings (after links, before words/phrases)
		if (settings?.excludeHeadings && !isDisabled('exclude-headings')) {
			result = processHeadings(
				result,
				true,
				settings.excludeHeadingMarkersOnly,
				settings.excludeEntireHeadingLines,
				settings.excludeHeadingSections,
				plugin,
			);
		}

		// Process words and phrases (last in the pipeline)
		if (settings?.excludeWordsAndPhrases && !isDisabled('exclude-words-phrases')) {
			result = processWordsAndPhrases(
				result,
				true,
				settings.excludedWords,
				settings.excludedPhrases,
				plugin,
			);
		}

		return result;
	}, plugin);
}
