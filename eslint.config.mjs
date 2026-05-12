import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"main.js",
			"node_modules/**",
			"docs/**",
			".github/**",
			"**/*.html",
			"**/*.zip",
		],
	},
	...tseslint.configs.recommended,
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
			},
		},
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
			"@typescript-eslint/ban-ts-comment": "off",
			"no-prototype-builtins": "off",
			"@typescript-eslint/no-empty-function": "off",
		},
	},
	{
		files: ["**/*.mjs"],
		languageOptions: {
			globals: { ...globals.node },
		},
	},
);
