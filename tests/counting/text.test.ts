import { describe, it, expect } from 'vitest';
import { countSelectedText } from '../../main';
import { makeSettings } from '../fixtures/settings';

describe('countSelectedText — aggregator', () => {
	it('returns zero counts for empty input', () => {
		expect(countSelectedText('')).toEqual({ words: 0, characters: 0, sentences: 0 });
	});

	it('returns word, character, and sentence counts together', () => {
		const result = countSelectedText('Hello world. Goodbye.');
		expect(result).toEqual({ words: 3, characters: 21, sentences: 2 });
	});

	it('respects characterCountMode from settings', () => {
		const settings = makeSettings({ characterCountMode: 'no-spaces' });
		const result = countSelectedText('Hello world.', [], true, settings);
		// "Hello world." → no spaces → 11 chars
		expect(result.characters).toBe(11);
	});

	it('returns letters-only when configured', () => {
		const settings = makeSettings({ characterCountMode: 'letters-only' });
		const result = countSelectedText('Hello, world! 123', [], true, settings);
		// Letters only: "Hello" (5) + "world" (5) = 10
		expect(result.characters).toBe(10);
	});

	it('applies excludedExtensions to the word count only', () => {
		// Files-with-extension exclusion is part of word counting, not
		// character or sentence counting.
		const result = countSelectedText('cat photo.jpg dog', ['.jpg']);
		expect(result.words).toBe(2);
		// Characters and sentences are still computed on the original text
		expect(result.characters).toBe('cat photo.jpg dog'.length);
	});
});
