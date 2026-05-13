import { DEFAULT_SETTINGS, type WordCountPluginSettings } from '../../main';

// Returns a fresh copy of DEFAULT_SETTINGS plus any overrides. Tests
// should never mutate DEFAULT_SETTINGS directly; this helper is the
// safe way to express "default settings except for these fields."
export function makeSettings(
	overrides: Partial<WordCountPluginSettings> = {},
): WordCountPluginSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}
