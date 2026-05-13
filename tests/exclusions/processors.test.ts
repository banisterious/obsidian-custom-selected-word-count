import { describe, it, expect } from 'vitest';
import {
	stripFrontmatter,
	processCodeBlocks,
	processInlineCode,
	processObsidianComments,
	processHtmlComments,
	processLinks,
	processHeadings,
	processSelectiveHeadingSections,
	processWordsAndPhrases,
} from '../../main';

describe('stripFrontmatter', () => {
	it('returns text unchanged when it does not start with ---', () => {
		expect(stripFrontmatter('plain body')).toBe('plain body');
	});

	it('strips frontmatter delimited by --- and ---', () => {
		const text = '---\ntitle: Test\n---\nBody here';
		expect(stripFrontmatter(text)).toBe('Body here');
	});

	it('strips frontmatter delimited by --- and ...', () => {
		const text = '---\ntitle: Test\n...\nBody here';
		expect(stripFrontmatter(text)).toBe('Body here');
	});

	it('returns empty string when closing delimiter is missing', () => {
		const text = '---\ntitle: Test\nBody (no close)';
		expect(stripFrontmatter(text)).toBe('');
	});

	it('preserves multiline body', () => {
		const text = '---\nkey: value\n---\nline 1\nline 2\nline 3';
		expect(stripFrontmatter(text)).toBe('line 1\nline 2\nline 3');
	});
});

describe('processCodeBlocks', () => {
	it('returns text unchanged when excludeCodeBlocks is false', () => {
		const text = '```\ncode\n```\nbody';
		expect(processCodeBlocks(text, false)).toBe(text);
	});

	it('removes triple-backtick blocks', () => {
		expect(processCodeBlocks('a\n```\ncode\n```\nb', true)).toBe('a\n\nb');
	});

	it('removes triple-tilde blocks', () => {
		expect(processCodeBlocks('a\n~~~\ncode\n~~~\nb', true)).toBe('a\n\nb');
	});

	it('handles multiple blocks in sequence', () => {
		const text = 'one\n```\nA\n```\ntwo\n```\nB\n```\nthree';
		expect(processCodeBlocks(text, true)).toBe('one\n\ntwo\n\nthree');
	});
});

describe('processInlineCode', () => {
	it('returns text unchanged when excludeInlineCode is false', () => {
		expect(processInlineCode('use `x` here', false)).toBe('use `x` here');
	});

	it('removes single-backtick spans', () => {
		expect(processInlineCode('use `x` here', true)).toBe('use  here');
	});

	it('handles multiple inline spans', () => {
		expect(processInlineCode('`a` and `b` and `c`', true)).toBe(' and  and ');
	});
});

describe('processObsidianComments', () => {
	it('returns text unchanged when excludeComments is false', () => {
		expect(processObsidianComments('a %%b%% c', false, false)).toBe('a %%b%% c');
	});

	it('removes only markers when excludeContent is false', () => {
		expect(processObsidianComments('a %%b%% c', true, false)).toBe('a b c');
	});

	it('removes markers and content when excludeContent is true', () => {
		expect(processObsidianComments('a %%b%% c', true, true)).toBe('a  c');
	});

	it('handles multiline content when excludeContent is true', () => {
		expect(processObsidianComments('a %%multi\nline\ncontent%% z', true, true)).toBe('a  z');
	});
});

describe('processHtmlComments', () => {
	it('returns text unchanged when excludeComments is false', () => {
		expect(processHtmlComments('a <!--b--> c', false, false)).toBe('a <!--b--> c');
	});

	it('removes only markers when excludeContent is false', () => {
		expect(processHtmlComments('a <!--b--> c', true, false)).toBe('a b c');
	});

	it('removes markers and content when excludeContent is true', () => {
		expect(processHtmlComments('a <!--b--> c', true, true)).toBe('a  c');
	});
});

describe('processLinks', () => {
	it('returns text unchanged when excludeNonVisible is false', () => {
		expect(processLinks('[[Note|alias]]', false)).toBe('[[Note|alias]]');
	});

	it('replaces aliased internal links with their alias', () => {
		expect(processLinks('See [[Long Note Name|short]] now', true)).toBe('See short now');
	});

	it('replaces non-aliased internal links with the note name', () => {
		expect(processLinks('See [[Note Name]] now', true)).toBe('See Note Name now');
	});

	it('replaces external links with their link text', () => {
		expect(processLinks('Read [the docs](https://example.com)', true)).toBe('Read the docs');
	});
});

describe('processHeadings', () => {
	it('returns text unchanged when excludeHeadings is false', () => {
		expect(processHeadings('# Title\nbody', false, false, false, [])).toBe('# Title\nbody');
	});

	it('removes entire heading lines when excludeEntireLines is true', () => {
		expect(processHeadings('# Title\nbody', true, false, true, [])).toBe('\nbody');
	});

	it('removes only heading markers when excludeMarkersOnly is true', () => {
		expect(processHeadings('# Title\nbody', true, true, false, [])).toBe('Title\nbody');
	});

	it('removes Setext (underlined) headings entirely', () => {
		const text = 'Title\n=====\nbody';
		expect(processHeadings(text, true, false, true, [])).toBe('\nbody');
	});
});

describe('processSelectiveHeadingSections', () => {
	it('removes the named section and its content', () => {
		const text = '# Keep\nintro\n\n## Skip Me\nbody\n\n## Keep\nend';
		const result = processSelectiveHeadingSections(text, ['## Skip Me']);
		expect(result).toContain('Keep');
		expect(result).toContain('intro');
		expect(result).toContain('end');
		expect(result).not.toContain('Skip Me');
		expect(result).not.toContain('body');
	});

	it('also removes subsections nested under the named section', () => {
		const text = '## Skip\nfoo\n### Sub\nbar\n## Keep\nend';
		const result = processSelectiveHeadingSections(text, ['## Skip']);
		expect(result).not.toContain('foo');
		expect(result).not.toContain('Sub');
		expect(result).not.toContain('bar');
		expect(result).toContain('Keep');
		expect(result).toContain('end');
	});

	it('matching is case-insensitive on the full heading line', () => {
		const text = '## SKIP me\nbody\n## next\nkeep';
		const result = processSelectiveHeadingSections(text, ['## skip me']);
		expect(result).not.toContain('body');
		expect(result).toContain('keep');
	});
});

describe('processWordsAndPhrases', () => {
	it('returns text unchanged when excludeWordsAndPhrases is false', () => {
		expect(processWordsAndPhrases('foo bar', false, 'foo', [])).toBe('foo bar');
	});

	it('removes comma-separated words case-insensitively', () => {
		expect(processWordsAndPhrases('Foo bar BAZ', true, 'foo, baz', [])).toBe(' bar ');
	});

	it('removes only whole words (not substrings)', () => {
		expect(processWordsAndPhrases('food foo footer', true, 'foo', [])).toBe('food  footer');
	});

	it('removes phrases case-insensitively', () => {
		expect(processWordsAndPhrases('See Lorem Ipsum here', true, '', ['lorem ipsum'])).toBe('See  here');
	});

	it('escapes regex special characters in words/phrases', () => {
		expect(processWordsAndPhrases('a (b) c', true, '', ['(b)'])).toBe('a  c');
	});
});
