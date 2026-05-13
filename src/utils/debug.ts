// Minimal interface satisfied by the plugin instance. Allowing processing
// and counting modules to type their `plugin?` parameter as DebugLoggable
// instead of the full CustomSelectedWordCountPlugin class keeps those
// modules free of any dependency on src/main.ts (and free of the circular
// import that would otherwise result).
export interface DebugLoggable {
	settings: { enableDebugLogging: boolean };
}

export function debugLog(plugin: DebugLoggable, message: string, ...args: unknown[]): void {
	if (plugin.settings.enableDebugLogging) {
		// eslint-disable-next-line obsidianmd/rule-custom-message -- intentional console.log gated behind the user-enabled enableDebugLogging setting
		console.log(`[Word Count Debug] ${message}`, ...args);
	}
}

// Extracts a human-readable string from an unknown caught error.
// Catch-bound values are typed as `unknown` under
// useUnknownInCatchVariables (the modern default); narrowing through
// `instanceof Error` lets us safely read `.message` while falling back
// to `String(error)` for thrown primitives or non-Error objects.
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
