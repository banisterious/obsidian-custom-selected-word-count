import { describe, it, expect } from 'vitest';
import {
	countSelectedWords,
	getDisabledExclusionsFromFrontmatter,
	processTextWithOverrides,
	type WordCountPluginSettings,
} from '../../main';
import { makeSettings } from '../fixtures/settings';

// Build a minimal App-shaped object for `getDisabledExclusionsFromFrontmatter`.
// The function only touches `workspace.getActiveFile()` and
// `metadataCache.getFileCache(file)`. Cast through `unknown` to the App
// parameter type so the call sites stay type-safe without resorting to `any`.
type AppParam = Parameters<typeof getDisabledExclusionsFromFrontmatter>[0];

function makeApp(frontmatter: Record<string, unknown> | null): AppParam {
	const file = frontmatter === null ? null : { path: 'note.md' };
	return {
		workspace: {
			getActiveFile: () => file,
		},
		metadataCache: {
			getFileCache: () => (frontmatter === null ? null : { frontmatter }),
		},
	} as unknown as AppParam;
}

describe('getDisabledExclusionsFromFrontmatter', () => {
	it('returns [] when no active file', () => {
		expect(getDisabledExclusionsFromFrontmatter(makeApp(null))).toEqual([]);
	});

	it('returns [] when file has no frontmatter', () => {
		const app = makeApp({});
		// Frontmatter present but no `cswc-disable` key → []
		expect(getDisabledExclusionsFromFrontmatter(app)).toEqual([]);
	});

	it('returns [] when cswc-disable is missing', () => {
		expect(getDisabledExclusionsFromFrontmatter(makeApp({ title: 'note' }))).toEqual([]);
	});

	it('parses cswc-disable as a single string', () => {
		const app = makeApp({ 'cswc-disable': 'exclude-headings' });
		expect(getDisabledExclusionsFromFrontmatter(app)).toEqual(['exclude-headings']);
	});

	it('parses cswc-disable as an array', () => {
		const app = makeApp({ 'cswc-disable': ['exclude-headings', 'exclude-code-blocks'] });
		expect(getDisabledExclusionsFromFrontmatter(app)).toEqual([
			'exclude-headings',
			'exclude-code-blocks',
		]);
	});

	it('expands cswc-disable: "all" to the full identifier list', () => {
		const app = makeApp({ 'cswc-disable': 'all' });
		const result = getDisabledExclusionsFromFrontmatter(app);
		expect(result).toContain('exclude-windows-paths');
		expect(result).toContain('exclude-unix-paths');
		expect(result).toContain('exclude-unc-paths');
		expect(result).toContain('exclude-environment-paths');
		expect(result).toContain('exclude-urls');
		expect(result).toContain('exclude-code-blocks');
		expect(result).toContain('exclude-inline-code');
		expect(result).toContain('exclude-comments');
		expect(result).toContain('exclude-headings');
		expect(result).toContain('exclude-specific-headings');
		expect(result).toContain('exclude-words-phrases');
	});

	it('expands cswc-disable: ["all"] same as the string form', () => {
		const app = makeApp({ 'cswc-disable': ['all'] });
		expect(getDisabledExclusionsFromFrontmatter(app).length).toBeGreaterThanOrEqual(11);
	});

	it('filters non-string array entries silently', () => {
		const app = makeApp({ 'cswc-disable': ['exclude-headings', 42, null, 'exclude-comments'] });
		expect(getDisabledExclusionsFromFrontmatter(app)).toEqual([
			'exclude-headings',
			'exclude-comments',
		]);
	});
});

describe('disabledExclusions parameter — runtime disable per call', () => {
	const codeOnlySettings: WordCountPluginSettings = makeSettings({
		excludeCode: true,
		excludeCodeBlocks: true,
	});

	it('without override: code blocks are excluded', () => {
		const text = 'visible\n```\nignored code\n```\nmore';
		expect(countSelectedWords(text, [], true, codeOnlySettings, undefined, [])).toBe(2);
	});

	it('disabled exclusion bypasses the code-block toggle for this call', () => {
		const text = 'visible\n```\nignored code\n```\nmore';
		// Now the code block content is kept: "visible ignored code more" → 4
		expect(
			countSelectedWords(text, [], true, codeOnlySettings, undefined, ['exclude-code-blocks']),
		).toBe(4);
	});

	it('multiple disabled exclusions bypass each toggle independently', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeCodeBlocks: true,
			excludeInlineCode: true,
		});
		const text = 'visible `inline` more';
		// Default: inline code excluded → "visible  more" → 2
		expect(countSelectedWords(text, [], true, settings)).toBe(2);
		// With exclude-inline-code disabled, inline kept → "visible inline more" → 3
		expect(
			countSelectedWords(text, [], true, settings, undefined, ['exclude-inline-code']),
		).toBe(3);
	});
});

describe('processTextWithOverrides — inline comment markers', () => {
	it('processes the whole text when no markers are present', () => {
		const seen: string[] = [];
		processTextWithOverrides('plain text', (segment) => {
			seen.push(segment);
			return segment;
		});
		expect(seen).toEqual(['plain text']);
	});

	it('skips processing inside <!-- cswc-disable --> ... <!-- cswc-enable -->', () => {
		const seen: string[] = [];
		processTextWithOverrides(
			'before <!-- cswc-disable --> RAW <!-- cswc-enable --> after',
			(segment) => {
				seen.push(segment);
				return segment;
			},
		);
		// Processor gets the before-segment and the after-segment, but not RAW
		expect(seen).toEqual(['before ', ' after']);
	});

	it('skips processing inside %% cswc-disable %% ... %% cswc-enable %% (Obsidian style)', () => {
		const seen: string[] = [];
		processTextWithOverrides(
			'one %% cswc-disable %% two %% cswc-enable %% three',
			(segment) => {
				seen.push(segment);
				return segment;
			},
		);
		expect(seen).toEqual(['one ', ' three']);
	});

	it('keeps disabled section verbatim in output', () => {
		const result = processTextWithOverrides(
			'A <!-- cswc-disable --> B <!-- cswc-enable --> C',
			(segment) => segment.toUpperCase(),
		);
		// 'A ' → 'A ' (upper), ' B ' → kept verbatim, ' C' → ' C' (upper)
		expect(result).toBe('A  B  C');
	});

	it('disabled section without closing marker extends to end of text', () => {
		const seen: string[] = [];
		processTextWithOverrides(
			'before <!-- cswc-disable --> RAW to end',
			(segment) => {
				seen.push(segment);
				return segment;
			},
		);
		expect(seen).toEqual(['before ']);
	});

	it('countSelectedWords respects inline disable markers (HTML form)', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeInlineCode: true,
		});
		// Without the override, `kept` would be excluded (it's inside backticks).
		// With the override, the inline-code processor never runs inside the
		// disabled region, so `kept` survives.
		const text = 'a <!-- cswc-disable --> `kept` <!-- cswc-enable --> b';
		// Inside disabled region: " `kept` " (kept literally including backticks).
		// Outside: "a " and " b". Joined → "a  `kept`  b".
		// Words (regex matches \w runs): a, kept, b → 3.
		expect(countSelectedWords(text, [], true, settings)).toBe(3);
	});

	it('countSelectedWords respects inline disable markers (Obsidian style)', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeInlineCode: true,
		});
		const text = 'a %% cswc-disable %% `kept` %% cswc-enable %% b';
		expect(countSelectedWords(text, [], true, settings)).toBe(3);
	});
});
