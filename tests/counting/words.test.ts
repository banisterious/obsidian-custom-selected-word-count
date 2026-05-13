import { describe, it, expect } from 'vitest';
import { countSelectedWords } from '../../main';
import { makeSettings } from '../fixtures/settings';

describe('countSelectedWords — baseline', () => {
	it('returns 0 for empty string', () => {
		expect(countSelectedWords('')).toBe(0);
	});

	it('counts simple words', () => {
		expect(countSelectedWords('hello world')).toBe(2);
	});

	it('counts hyphenated words as one', () => {
		expect(countSelectedWords('state-of-the-art design')).toBe(2);
	});

	it('counts contractions with straight apostrophe as one', () => {
		expect(countSelectedWords("don't worry it's fine")).toBe(4);
	});

	it('counts contractions with curly apostrophe as one', () => {
		expect(countSelectedWords('don’t worry it’s fine')).toBe(4);
	});

	it('counts decimal numbers as one word', () => {
		expect(countSelectedWords('Pi is 3.14 approximately')).toBe(4);
	});

	it('strips emojis by default', () => {
		expect(countSelectedWords('hello 🚀 world')).toBe(2);
	});

	it('preserves emojis when stripEmojis is false', () => {
		// Emojis are not letter characters so the regex won't match them
		// either way — strip just removes them from the buffer. Either
		// path produces the same word count for letter-only text.
		expect(countSelectedWords('hello 🚀 world', [], false)).toBe(2);
	});

	it('strips double quotes around quoted text', () => {
		expect(countSelectedWords('She said "hello there".')).toBe(4);
	});
});

describe('countSelectedWords — code exclusion', () => {
	it('excludes fenced code blocks when enabled', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeCodeBlocks: true,
		});
		const text = 'before\n```\nconst x = 1;\n```\nafter';
		expect(countSelectedWords(text, [], true, settings)).toBe(2);
	});

	it('excludes tilde-fenced code blocks when enabled', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeCodeBlocks: true,
		});
		const text = 'before\n~~~\nconst x = 1;\n~~~\nafter';
		expect(countSelectedWords(text, [], true, settings)).toBe(2);
	});

	it('keeps code blocks when excludeCode is off (master toggle)', () => {
		const settings = makeSettings({
			excludeCode: false,
			excludeCodeBlocks: true,
		});
		const text = 'before\n```\nconst x = 1;\n```\nafter';
		// "before", "const", "x", "1", "after" → 5
		expect(countSelectedWords(text, [], true, settings)).toBe(5);
	});

	it('excludes inline code when enabled', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeInlineCode: true,
		});
		expect(countSelectedWords('use `console.log` here', [], true, settings)).toBe(2);
	});

	it('excludes both code blocks and inline code together', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeCodeBlocks: true,
			excludeInlineCode: true,
		});
		const text = 'before `inline` middle\n```\ncode\n```\nafter';
		expect(countSelectedWords(text, [], true, settings)).toBe(3);
	});
});

describe('countSelectedWords — comment exclusion', () => {
	it('excludes Obsidian comment content', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeObsidianComments: true,
			excludeObsidianCommentContent: true,
		});
		expect(countSelectedWords('visible %%hidden text%% more', [], true, settings)).toBe(2);
	});

	it('excludes Obsidian comment markers only (content kept)', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeObsidianComments: true,
			excludeObsidianCommentContent: false,
		});
		expect(countSelectedWords('visible %%hidden text%% more', [], true, settings)).toBe(4);
	});

	it('excludes HTML comment content', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeHtmlComments: true,
			excludeHtmlCommentContent: true,
		});
		expect(countSelectedWords('visible <!-- hidden text --> more', [], true, settings)).toBe(2);
	});

	it('excludes HTML comment markers only (content kept)', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeHtmlComments: true,
			excludeHtmlCommentContent: false,
		});
		expect(countSelectedWords('visible <!-- hidden text --> more', [], true, settings)).toBe(4);
	});
});

describe('countSelectedWords — link exclusion', () => {
	it('excludes non-visible portion of internal aliased links', () => {
		const settings = makeSettings({
			excludeNonVisibleLinkPortions: true,
		});
		// "See [[Long Note Name|alias]] now" → "See alias now" → 3
		expect(countSelectedWords('See [[Long Note Name|alias]] now', [], true, settings)).toBe(3);
	});

	it('keeps internal link text without alias', () => {
		const settings = makeSettings({
			excludeNonVisibleLinkPortions: true,
		});
		// "See [[Note Name]] now" → "See Note Name now" → 4
		expect(countSelectedWords('See [[Note Name]] now', [], true, settings)).toBe(4);
	});

	it('excludes external link URL', () => {
		const settings = makeSettings({
			excludeNonVisibleLinkPortions: true,
		});
		// "Read [the docs](https://example.com) now" → "Read the docs now" → 4
		expect(countSelectedWords('Read [the docs](https://example.com) now', [], true, settings)).toBe(4);
	});
});

describe('countSelectedWords — heading exclusion', () => {
	it('excludes entire heading lines when enabled', () => {
		const settings = makeSettings({
			excludeHeadings: true,
			excludeEntireHeadingLines: true,
		});
		const text = '# Title here\n\nBody text follows';
		expect(countSelectedWords(text, [], true, settings)).toBe(3);
	});

	it('excludes heading markers only, keeping text', () => {
		const settings = makeSettings({
			excludeHeadings: true,
			excludeHeadingMarkersOnly: true,
		});
		const text = '# Title here\n\nBody text follows';
		expect(countSelectedWords(text, [], true, settings)).toBe(5);
	});

	it('excludes only specifically-named heading sections', () => {
		const settings = makeSettings({
			excludeHeadings: true,
			excludeHeadingSections: ['## Skip Me'],
		});
		const text =
			'# Keep\n\nIntro paragraph.\n\n## Skip Me\n\nThis goes away.\n\n## Keep Too\n\nThis stays.';
		// kept: "Keep" + "Intro paragraph" + "Keep Too" + "This stays" → 7
		expect(countSelectedWords(text, [], true, settings)).toBe(7);
	});
});

describe('countSelectedWords — words and phrases exclusion', () => {
	it('excludes a list of comma-separated words case-insensitively', () => {
		const settings = makeSettings({
			excludeWordsAndPhrases: true,
			excludedWords: 'the, a, an',
		});
		expect(countSelectedWords('The cat sat on a mat under an arch', [], true, settings)).toBe(6);
	});

	it('excludes phrases case-insensitively', () => {
		const settings = makeSettings({
			excludeWordsAndPhrases: true,
			excludedPhrases: ['lorem ipsum'],
		});
		expect(countSelectedWords('Header Lorem Ipsum footer', [], true, settings)).toBe(2);
	});
});

describe('countSelectedWords — file extension exclusion', () => {
	it('excludes filenames with extensions in the excludedExtensions list', () => {
		// "photo.jpg" → excluded; "notes.md" → excluded; "cat" → kept
		expect(countSelectedWords('cat photo.jpg notes.md dog', ['.jpg', '.md'])).toBe(2);
	});

	it('keeps decimal numbers even when extensions look similar', () => {
		expect(countSelectedWords('Pi is 3.14 today', ['.14'])).toBe(4);
	});
});

describe('countSelectedWords — path exclusion', () => {
	// FINDING: the path-detection algorithm in main.ts is greedy. Once a
	// segment matches a path-start regex (Windows drive, Unix, UNC, env
	// var), every subsequent segment gets appended to the buffer and the
	// buffer is re-checked with the same `^pattern` regex. Because the
	// regex only requires the buffer to *start* with the path pattern,
	// the check keeps succeeding and the path keeps growing — swallowing
	// all words to end of input. These tests lock that current behavior.
	// Phase 5 (or a later phase) decides whether to tighten the algorithm
	// to terminate path-consumption at whitespace boundaries.

	it('Windows drive path swallows trailing words (greedy behavior)', () => {
		const settings = makeSettings({
			excludePaths: true,
			excludeWindowsPaths: true,
		});
		// "Open C:\Users\foo and resume" → only "Open" survives because
		// the algorithm extends the C:\ path through all later segments.
		expect(countSelectedWords('Open C:\\Users\\foo and resume', [], true, settings)).toBe(1);
	});

	it('Unix path swallows trailing words (greedy behavior)', () => {
		const settings = makeSettings({
			excludePaths: true,
			excludeUnixPaths: true,
		});
		expect(countSelectedWords('check /usr/local/bin for tools', [], true, settings)).toBe(1);
	});

	it('UNC path swallows trailing words (greedy behavior)', () => {
		const settings = makeSettings({
			excludePaths: true,
			excludeUNCPaths: true,
		});
		expect(countSelectedWords('share \\\\server\\public is open', [], true, settings)).toBe(1);
	});

	it('environment-variable path swallows trailing words (greedy behavior)', () => {
		const settings = makeSettings({
			excludePaths: true,
			excludeEnvironmentPaths: true,
		});
		expect(countSelectedWords('set $HOME for context', [], true, settings)).toBe(1);
	});

	it('isolated path at end of selection is excluded cleanly', () => {
		const settings = makeSettings({
			excludePaths: true,
			excludeUnixPaths: true,
		});
		// No trailing words means the greedy extension doesn't kick in.
		expect(countSelectedWords('check /usr/local/bin', [], true, settings)).toBe(1);
	});

	it('keeps path when its specific type toggle is off', () => {
		const settings = makeSettings({
			excludePaths: true,
			excludeUnixPaths: false,
			excludeWindowsPaths: true,
		});
		expect(countSelectedWords('check /usr/local/bin', [], true, settings)).toBe(2);
	});
});

describe('countSelectedWords — advanced regex', () => {
	it('falls back to default regex when custom regex is invalid', () => {
		const settings = makeSettings({
			enableAdvancedRegex: true,
			customWordRegex: '[unclosed', // syntactically invalid
		});
		expect(countSelectedWords('hello world', [], true, settings)).toBe(2);
	});

	it('uses custom regex when provided and valid', () => {
		const settings = makeSettings({
			enableAdvancedRegex: true,
			customWordRegex: '\\d+', // count digit runs only
		});
		// "abc 123 def 45" → digit runs: "123", "45" → 2
		expect(countSelectedWords('abc 123 def 45', [], true, settings)).toBe(2);
	});
});

describe('countSelectedWords — combination cases', () => {
	it('applies code + heading + words/phrases together', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeCodeBlocks: true,
			excludeHeadings: true,
			excludeEntireHeadingLines: true,
			excludeWordsAndPhrases: true,
			excludedWords: 'foo',
		});
		const text = '# Heading line\n\nbody foo body\n\n```\nignored code\n```\nend';
		// after heading removal: body foo body / ignored code / end
		// after code-block removal: body foo body / / end
		// after word exclusion: body body end → 3
		expect(countSelectedWords(text, [], true, settings)).toBe(3);
	});
});
