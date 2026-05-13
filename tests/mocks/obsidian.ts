// Minimal `obsidian` module mock for vitest.
//
// `main.ts` imports a handful of classes and helpers from `'obsidian'`.
// The count-and-process functions tested in this suite don't actually
// touch them at runtime — they take their inputs as plain strings and
// settings objects. The imports are needed only so the TypeScript module
// graph resolves, so the mock can be no-op stubs.
//
// `getDisabledExclusionsFromFrontmatter` is the one function that
// genuinely reaches into Obsidian — it calls `app.workspace.getActiveFile`
// and `app.metadataCache.getFileCache`. Tests for that function build
// hand-rolled `App`-shaped objects rather than using the mock class.

export class App {}
export class MarkdownView {}
export class Modal {
	constructor(_app?: unknown) {}
	open() {}
	close() {}
}
export class Plugin {
	app: unknown;
	manifest: unknown;
	constructor(app?: unknown, manifest?: unknown) {
		this.app = app;
		this.manifest = manifest;
	}
}
export class PluginSettingTab {
	constructor(_app?: unknown, _plugin?: unknown) {}
}
export class Setting {
	constructor(_containerEl?: unknown) {}
	setName(_name: string) {
		return this;
	}
	setDesc(_desc: string) {
		return this;
	}
	setHeading() {
		return this;
	}
	addToggle(_cb: unknown) {
		return this;
	}
	addText(_cb: unknown) {
		return this;
	}
	addDropdown(_cb: unknown) {
		return this;
	}
	addButton(_cb: unknown) {
		return this;
	}
}
export class Notice {
	constructor(_message?: string, _timeout?: number) {}
}
export class TextComponent {}
export class ToggleComponent {}
export class DropdownComponent {}
export class ButtonComponent {}
export class EditorPosition {}
export class Editor {}
export class TFile {}

export const Platform = {
	isDesktop: true,
	isMobile: false,
	isMacOS: false,
	isWin: false,
	isLinux: true,
	isMobileApp: false,
	isDesktopApp: true,
	isIosApp: false,
	isAndroidApp: false,
};

export function setIcon(_el: unknown, _icon: string) {
	// no-op
}
