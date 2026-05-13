export interface WordCountPluginSettings {
	setting: string;
	showDateTimeInHistory: boolean;
	history?: { count: number; characterCount?: number; sentenceCount?: number; date: string }[]; // Persisted as ISO strings
	exclusionList: string; // Comma-separated list of file extensions
	// Path exclusion settings
	excludePaths: boolean;           // Master toggle for path exclusion
	excludeWindowsPaths: boolean;    // Toggle for Windows paths (C:\)
	excludeUnixPaths: boolean;       // Toggle for Unix paths (/)
	excludeUNCPaths: boolean;        // Toggle for UNC paths (\\server)
	excludeEnvironmentPaths: boolean; // Toggle for environment variables (%PATH%, $HOME)
	// Status bar settings
	showStatusBar: boolean;          // Toggle for status bar visibility
	enableLiveCount: boolean;        // Toggle for live word count updates
	statusBarLabel: string;          // Custom label for status bar
	hideCoreWordCount: boolean;      // Toggle for hiding core word count
	// Character count settings
	showCharacterCount: boolean;     // Toggle for showing character count
	characterCountMode: 'all' | 'no-spaces' | 'letters-only'; // Character counting mode
	statusBarDisplayMode: 'words-only' | 'chars-only' | 'both'; // What to show in status bar
	// Sentence count settings
	showSentenceCount: boolean;      // Toggle for showing sentence count
	// Link exclusion settings
	excludeNonVisibleLinkPortions: boolean; // Toggle for excluding non-visible portions of links
	// Code exclusion settings
	excludeCode: boolean;            // Master toggle for code exclusion
	excludeCodeBlocks: boolean;      // Toggle for excluding code blocks
	excludeInlineCode: boolean;      // Toggle for excluding inline code
	// Comment exclusion settings
	excludeComments: boolean;        // Master toggle for comment exclusion
	excludeObsidianComments: boolean; // Toggle for Obsidian comments (%% %%)
	excludeObsidianCommentContent: boolean; // Toggle for Obsidian comment content
	excludeHtmlComments: boolean;    // Toggle for HTML comments (<!-- -->)
	excludeHtmlCommentContent: boolean; // Toggle for HTML comment content
	// Heading exclusion settings
	excludeHeadings: boolean;        // Master toggle for heading exclusion
	excludeHeadingMarkersOnly: boolean; // Toggle for excluding only markers
	excludeEntireHeadingLines: boolean; // Toggle for excluding entire lines
	excludeHeadingSections: string[]; // Array of specific heading sections to exclude
	// Words and phrases exclusion settings
	excludeWordsAndPhrases: boolean; // Master toggle for words/phrases exclusion
	excludedWords: string;           // Comma-separated list of words
	excludedPhrases: string[];       // Array of phrases to exclude

	enableDebugLogging: boolean;     // Toggle for debug logging
	// Advanced Regex
	enableAdvancedRegex?: boolean;   // Toggle for advanced regex (default: false)
	customWordRegex?: string;        // User-defined regex pattern
}

export const DEFAULT_EXCLUSION_LIST = '.jpg, .jpeg, .png, .gif, .svg, .md, .pdf, .docx, .xlsx, .pptx, .zip, .mp3, .mp4, .wav, .ogg, .webm, .mov, .avi, .exe, .dll, .bat, .sh, .ps1, .js, .ts, .json, .csv, .yml, .yaml, .html, .css, .scss, .xml, .ini, .log, .tmp, .bak, .db, .sqlite, .7z, .rar, .tar, .gz, .bz2, .iso, .img, .bin, .apk, .app, .dmg, .pkg, .deb, .rpm, .msi, .sys, .dat, .sav, .bak, .old, .swp, .lock, .cache, .part, .crdownload, .torrent, .ics, .eml, .msg, .vcf, .txt';

export const DEFAULT_WORD_REGEX = '[A-Za-z0-9]+(?:[\\u2018\\u2019\'-_][A-Za-z0-9]+)*';

export const DEFAULT_SETTINGS: WordCountPluginSettings = {
	setting: 'default',
	showDateTimeInHistory: true,
	history: [],
	exclusionList: DEFAULT_EXCLUSION_LIST,
	// Path exclusion defaults
	excludePaths: false,           // Master toggle for path exclusion (disabled)
	excludeWindowsPaths: false,    // Disabled by default
	excludeUnixPaths: false,       // Disabled by default
	excludeUNCPaths: false,        // Disabled by default
	excludeEnvironmentPaths: false, // Disabled by default
	// Status bar defaults
	showStatusBar: false,            // Status bar hidden by default
	enableLiveCount: false,          // Live updates disabled by default
	statusBarLabel: 'Selected: ',    // Default label
	hideCoreWordCount: false,        // Don't hide core word count by default
	// Character count defaults
	showCharacterCount: false,       // Character count hidden by default
	characterCountMode: 'all',       // Count all characters by default
	statusBarDisplayMode: 'words-only', // Show only words in status bar by default
	// Sentence count defaults
	showSentenceCount: false,        // Sentence count hidden by default
	// Link exclusion defaults
	excludeNonVisibleLinkPortions: false, // Link exclusion disabled by default
	// Code exclusion defaults
	excludeCode: false,              // Code exclusion disabled by default
	excludeCodeBlocks: false,        // Code block exclusion disabled by default
	excludeInlineCode: false,        // Inline code exclusion disabled by default
	// Comment exclusion defaults
	excludeComments: false,          // Comment exclusion disabled by default
	excludeObsidianComments: false,  // Obsidian comment exclusion disabled by default
	excludeObsidianCommentContent: false, // Obsidian comment content exclusion disabled by default
	excludeHtmlComments: false,      // HTML comment exclusion disabled by default
	excludeHtmlCommentContent: false, // HTML comment content exclusion disabled by default
	// Heading exclusion defaults
	excludeHeadings: false,          // Heading exclusion disabled by default
	excludeHeadingMarkersOnly: false, // Markers-only exclusion disabled by default
	excludeEntireHeadingLines: false, // Entire lines exclusion disabled by default
	excludeHeadingSections: [],      // Empty heading sections list by default
	// Words and phrases exclusion defaults
	excludeWordsAndPhrases: false,   // Words/phrases exclusion disabled by default
	excludedWords: '',               // Empty word list by default
	excludedPhrases: [],             // Empty phrase list by default

	enableDebugLogging: false,       // Debug logging disabled by default
	// Advanced Regex
	enableAdvancedRegex: false,
	customWordRegex: '',
};
