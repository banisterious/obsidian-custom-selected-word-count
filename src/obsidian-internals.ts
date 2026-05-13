import type { App } from 'obsidian';

// Obsidian's App has internal members (the settings panel controller,
// the running app version) that are not part of the published type
// definitions but are stable enough that other community plugins
// depend on them. Declaring a typed view lets us reach them without
// `as any` casts.
export interface AppInternals {
	setting: {
		open(): void;
		openTabById(id: string): void;
	};
	appVersion?: string;
}

export type AppWithInternals = App & AppInternals;
