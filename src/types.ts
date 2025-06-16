import type pty from "node-pty";

export type Screen =
	| "menu"
	| "claude"
	| "worktree"
	| "branch_input"
	| "settings_select";

export type Session = {
	id: string;
	process: pty.IPty;
	outputs: Buffer[];
	lastUpdated: Date;
	status: "Idle" | "Running" | "Awaiting Input";
	preview: string;
	workingDirectory?: string;
	settingsPath?: string;
	settingsName?: string; // Name of the settings file used (e.g., "foo" from "settings.foo.json")
	dataDisposable?: { dispose: () => void };
};

export type MenuOption = "start" | "exit" | string;

export type EventListeners = {
	handleInput?: (data: Buffer) => void;
	handleResize?: () => void;
	dataDisposable?: { dispose: () => void };
};
