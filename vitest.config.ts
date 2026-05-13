import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
	resolve: {
		// Without this, `import { ... } from '../main'` would resolve to
		// the build artifact `main.js` (because `package.json#main` points
		// there). We want tests to run against `main.ts` so the count
		// functions are transformed through vitest's esbuild pipeline and
		// the `obsidian` alias below takes effect.
		extensions: ['.ts', '.tsx', '.mjs', '.js', '.mts', '.cjs', '.cts', '.json'],
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		alias: {
			// `main.ts` imports from `'obsidian'`. In tests, redirect that
			// to a hand-rolled mock that exposes only the surface the
			// counting code touches (which is effectively nothing — the
			// classes are imported for type-level use only).
			obsidian: resolve(__dirname, 'tests/mocks/obsidian.ts'),
		},
	},
});
