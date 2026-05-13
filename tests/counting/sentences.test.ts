import { describe, it, expect } from 'vitest';
import { countSelectedSentences } from '../../main';
import { makeSettings } from '../fixtures/settings';

describe('countSelectedSentences — baseline', () => {
	it('returns 0 for empty string', () => {
		expect(countSelectedSentences('')).toBe(0);
	});

	it('counts a single sentence ending with period', () => {
		expect(countSelectedSentences('Hello world.')).toBe(1);
	});

	it('counts two sentences with two periods', () => {
		expect(countSelectedSentences('Hello world. Goodbye world.')).toBe(2);
	});

	it('counts question marks as sentence endings', () => {
		expect(countSelectedSentences('Are you ok? I am fine.')).toBe(2);
	});

	it('counts exclamation marks as sentence endings', () => {
		expect(countSelectedSentences('Watch out! That was close.')).toBe(2);
	});

	it('treats sentence ending followed by quote correctly', () => {
		expect(countSelectedSentences('She said "hi." Then she left.')).toBe(2);
	});
});

describe('countSelectedSentences — false-positive guards', () => {
	// FINDING: the abbreviation guard inside countSelectedSentences uses
	// `/\b(?:Mr|Mrs|Dr|...|etc|...)\./i` to skip sentence parts that end
	// with an abbreviation. But the regex requires a literal period (`\.`)
	// in the part, and the sentence-split regex consumes that period
	// *before* the guard runs. The guard never matches on real input, so
	// "Mr.", "Dr.", "etc." etc. produce false sentence splits today. Locked
	// here as current behavior; a future phase can repair the guard.

	it('LOCKED quirk: splits on "Mr." and "Dr." (abbreviation guard does not fire)', () => {
		expect(countSelectedSentences('Mr. Smith and Dr. Jones met today.')).toBe(3);
	});

	it('LOCKED quirk: splits on "etc." (abbreviation guard does not fire)', () => {
		expect(countSelectedSentences('We brought apples, oranges, etc. to share.')).toBe(2);
	});

	it('does not split on decimal numbers (no period in inter-digit position)', () => {
		expect(countSelectedSentences('Pi is approximately 3.14 today.')).toBe(1);
	});

	it('does not split on URLs (URLs are stripped before sentence detection)', () => {
		expect(countSelectedSentences('See https://example.com for details.')).toBe(1);
	});

	it('does not split on Windows file paths (paths are stripped before detection)', () => {
		expect(countSelectedSentences('Open C:\\Users\\foo\\file.txt now.')).toBe(1);
	});

	it('LOCKED quirk: file-extension guard suppresses entire sentence ending in "name.ext"', () => {
		// "Read the file.txt." → after split, part "Read the file.txt" ends
		// with \w+\.\w+ (length < 20) and trips the file-extension guard,
		// which throws away the whole sentence instead of just preserving
		// the period inside the filename. Net result: 1 sentence, not 2.
		expect(countSelectedSentences('Read the file.txt. It contains data.')).toBe(1);
	});

	it('counts ellipsis as separate splits (no special handling)', () => {
		expect(countSelectedSentences('Wait... I forgot.')).toBe(2);
	});

	it('requires at least one letter to count as a sentence', () => {
		expect(countSelectedSentences('!!!')).toBe(0);
	});

	it('numeric-only fragments do not count', () => {
		expect(countSelectedSentences('123. 456.')).toBe(0);
	});
});

describe('countSelectedSentences — code and headings', () => {
	it('strips fenced code blocks before counting', () => {
		const text = 'First sentence.\n```\nconst x = 1.\n```\nSecond sentence.';
		// The inner "const x = 1." should not be counted as a sentence
		expect(countSelectedSentences(text)).toBe(2);
	});

	it('strips inline code before counting', () => {
		// Inline code with periods inside it shouldn't add sentence endings
		expect(countSelectedSentences('Run `npm i.` and you are done.')).toBe(1);
	});

	it('strips ATX heading lines before counting', () => {
		// Heading line "# Title." should not be a sentence
		expect(countSelectedSentences('# Title.\nBody sentence.')).toBe(1);
	});
});

describe('countSelectedSentences — exclusions via settings', () => {
	it('settings-based heading exclusion removes heading text entirely', () => {
		const settings = makeSettings({
			excludeHeadings: true,
			excludeEntireHeadingLines: true,
		});
		expect(countSelectedSentences('# Title\nBody. Another.', settings)).toBe(2);
	});

	it('settings-based comment exclusion removes commented content', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeObsidianComments: true,
			excludeObsidianCommentContent: true,
		});
		// "Body. %%Note one. Note two.%% End." → "Body.  End." → 2
		expect(countSelectedSentences('Body. %%Note one. Note two.%% End.', settings)).toBe(2);
	});

	it('settings-based word exclusion can remove sentence-letter content', () => {
		const settings = makeSettings({
			excludeWordsAndPhrases: true,
			excludedWords: 'foo, bar',
		});
		expect(countSelectedSentences('foo bar. baz qux.', settings)).toBe(1);
	});
});
