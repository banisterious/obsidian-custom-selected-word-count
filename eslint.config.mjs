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
			// Non-source files. eslint-plugin-obsidianmd@0.3.0's recommended
			// config applies its first rule entry to every file matched by
			// `eslint .` without a `files:` restriction, and type-aware rules
			// (e.g. `no-plugin-as-component`) blow up trying to read parser
			// services for non-TS files. Explicit ignores keep lint focused on
			// source code.
			"**/*.json",
			"**/*.md",
			"**/*.css",
			"**/*.svg",
			"**/*.yml",
			"**/*.yaml",
			"**/*.lock",
			"**/*.log",
			".nvmrc",
			"LICENSE.md",
		],
	},
	...tseslint.configs.recommended,
	// eslint-plugin-obsidianmd@0.3.0's recommended config has one entry that
	// applies its 61 rules without a `files:` restriction. Some of those rules
	// require typescript-eslint parser services (e.g. `no-plugin-as-component`)
	// and crash on non-TS files like `package.json` and `eslint.config.mjs`.
	// Wrap each unrestricted entry to scope it to TS sources.
	...obsidianmd.configs.recommended.map((cfg) =>
		cfg.rules && !cfg.files
			? { ...cfg, files: ["**/*.ts", "**/*.tsx"] }
			: cfg
	),
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
