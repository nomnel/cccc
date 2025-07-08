import type { TmuxSession } from "./utils/tmuxUtils.js";

export type Screen =
	| "menu"
	| "claude"
	| "worktree"
	| "settings_select"
	| "worktree_manager"
	| "session_selector";

export type Session = {
	id: string;
	tmuxSession: TmuxSession;
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
	exitCheckInterval?: NodeJS.Timeout;
};

export type MenuOption = "start" | "exit" | string;

export type EventListeners = {
	handleInput?: (data: Buffer) => void;
	handleResize?: () => void;
	dataDisposable?: { dispose: () => void };
};
