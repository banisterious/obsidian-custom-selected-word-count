import { describe, it, expect } from 'vitest';
import { countSelectedCharacters } from '../../main';
import { makeSettings } from '../fixtures/settings';

describe('countSelectedCharacters — mode: all', () => {
	it('returns 0 for empty string', () => {
		expect(countSelectedCharacters('', 'all')).toBe(0);
	});

	it('counts every character including spaces and punctuation', () => {
		expect(countSelectedCharacters('Hi, world!', 'all')).toBe(10);
	});

	it('counts newlines and tabs as characters', () => {
		expect(countSelectedCharacters('a\nb\tc', 'all')).toBe(5);
	});

	it('counts unicode characters as single units', () => {
		// Smart quotes are single code units in the BMP
		expect(countSelectedCharacters('don’t', 'all')).toBe(5);
	});
});

describe('countSelectedCharacters — mode: no-spaces', () => {
	it('excludes spaces, tabs, and newlines', () => {
		expect(countSelectedCharacters('a b\tc\nd', 'no-spaces')).toBe(4);
	});

	it('keeps punctuation', () => {
		expect(countSelectedCharacters('hi, world!', 'no-spaces')).toBe(9);
	});
});

describe('countSelectedCharacters — mode: letters-only', () => {
	it('counts only A-Z and a-z characters', () => {
		expect(countSelectedCharacters('Hi, world!', 'letters-only')).toBe(7);
	});

	it('excludes digits', () => {
		expect(countSelectedCharacters('abc123', 'letters-only')).toBe(3);
	});

	it('excludes all whitespace, punctuation, and symbols', () => {
		expect(countSelectedCharacters('a! b? c. d, e', 'letters-only')).toBe(5);
	});

	it('returns 0 when no letters are present', () => {
		expect(countSelectedCharacters('123!@# 456', 'letters-only')).toBe(0);
	});
});

describe('countSelectedCharacters — exclusions', () => {
	it('excludes code blocks when enabled', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeCodeBlocks: true,
		});
		const text = 'AB\n```\nXYZ\n```\nCD';
		// Removed: "```\nXYZ\n```" → remaining: "AB\n\nCD" → 6 chars
		expect(countSelectedCharacters(text, 'all', settings)).toBe(6);
	});

	it('excludes inline code when enabled', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeInlineCode: true,
		});
		// "use `x` here" → "use  here" → 9 chars
		expect(countSelectedCharacters('use `x` here', 'all', settings)).toBe(9);
	});

	it('excludes Obsidian comment content', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeObsidianComments: true,
			excludeObsidianCommentContent: true,
		});
		// "AB %%xy%% CD" → "AB  CD" → 6
		expect(countSelectedCharacters('AB %%xy%% CD', 'all', settings)).toBe(6);
	});

	it('excludes HTML comment content', () => {
		const settings = makeSettings({
			excludeComments: true,
			excludeHtmlComments: true,
			excludeHtmlCommentContent: true,
		});
		// "AB <!--xy--> CD" → "AB  CD" → 6
		expect(countSelectedCharacters('AB <!--xy--> CD', 'all', settings)).toBe(6);
	});

	it('excludes link non-visible portions', () => {
		const settings = makeSettings({
			excludeNonVisibleLinkPortions: true,
		});
		// "[[Note|alias]]" → "alias" → 5
		expect(countSelectedCharacters('[[Note|alias]]', 'all', settings)).toBe(5);
	});

	it('excludes entire heading lines', () => {
		const settings = makeSettings({
			excludeHeadings: true,
			excludeEntireHeadingLines: true,
		});
		// "# Title\nbody" → "\nbody" → 5 chars (newline + body)
		expect(countSelectedCharacters('# Title\nbody', 'all', settings)).toBe(5);
	});

	it('excludes words/phrases', () => {
		const settings = makeSettings({
			excludeWordsAndPhrases: true,
			excludedWords: 'foo',
		});
		// "foo bar foo" → " bar " → 5
		expect(countSelectedCharacters('foo bar foo', 'all', settings)).toBe(5);
	});

	it('combines code and comment exclusions', () => {
		const settings = makeSettings({
			excludeCode: true,
			excludeInlineCode: true,
			excludeComments: true,
			excludeObsidianComments: true,
			excludeObsidianCommentContent: true,
		});
		// "X `c` %%h%% Y" → "X   Y" → 5
		expect(countSelectedCharacters('X `c` %%h%% Y', 'all', settings)).toBe(5);
	});
});
