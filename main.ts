// Top-level entry. The esbuild config bundles this into `main.js`,
// which Obsidian loads as the plugin entry point. The Plugin class
// itself lives at src/main.ts; here we only re-export the default
// (for Obsidian) and the named declarations the test suite imports
// against (so `tests/.../something.test.ts` keeps resolving
// `from '../../main'` after Phase 5's split).
export { default } from './src/main';
export { DEFAULT_EXCLUSION_LIST, DEFAULT_SETTINGS, type WordCountPluginSettings } from './src/settings/types';
export { type CountResult } from './src/types';
export { stripFrontmatter, getDisabledExclusionsFromFrontmatter } from './src/processing/frontmatter';
export { processTextWithOverrides } from './src/processing/overrides';
export { processCodeBlocks, processInlineCode } from './src/processing/code';
export { processObsidianComments, processHtmlComments } from './src/processing/comments';
export { processLinks } from './src/processing/links';
export { processHeadings, processSelectiveHeadingSections } from './src/processing/headings';
export { processWordsAndPhrases } from './src/processing/words-and-phrases';
export { countSelectedCharacters } from './src/counting/characters';
export { countSelectedSentences } from './src/counting/sentences';
export { countSelectedWords } from './src/counting/words';
export { countSelectedText } from './src/counting/index';
