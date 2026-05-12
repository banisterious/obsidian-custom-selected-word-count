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
			// UI strings that contain plugin identifiers like
			// `exclude-windows-paths` must keep the identifier lowercase to
			// match how it's parsed at runtime. Adding "Windows" / "Unix" to
			// brands would capitalize them inside the identifier text too,
			// breaking copy-paste from settings descriptions. Keep brands
			// limited to terms that don't appear inside our identifiers.
			"obsidianmd/ui/sentence-case": [
				"error",
				{
					brands: ["Markdown", "Obsidian"],
					acronyms: ["HTML", "URL", "UNC", "JSON", "CSS", "OS", "UI", "USERPROFILE", "HOME"],
				},
			],
		},
	},
	{
		files: ["**/*.mjs"],
		languageOptions: {
			globals: { ...globals.node },
		},
	},
);
