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
			// Brands preserve proper-noun capitalization in setting names
			// and descriptions. Note: when one of these (e.g. "Windows") also
			// appears inside our lowercase exclusion identifier text in a
			// description (`exclude-windows-paths`), the rule will try to
			// capitalize it inside the identifier too. Those few lines carry
			// targeted `eslint-disable-next-line` comments so the identifier
			// stays parseable by the runtime cswc-disable lookup.
			"obsidianmd/ui/sentence-case": [
				"error",
				{
					brands: ["Markdown", "Obsidian", "Unix", "Windows", "macOS", "Linux", "iOS", "Android"],
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
