import type pty from "node-pty";

export type Screen =
	| "menu"
	| "claude"
	| "worktree"
	| "branch_input"
	| "settings_select"
	| "worktree_manager"
	| "session_selector";

export type Session = {
	id: string;
	process: pty.IPty;
	outputs: Buffer[];
	lastUpdated: Date;
	status: "Idle" | "Running" | "Awaiting Input";
	preview: string;
	workingDirectory?: string;
	branch?: string; // The git branch name for this session
	repoName?: string; // The repository name for this session
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
