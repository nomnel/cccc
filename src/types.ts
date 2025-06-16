import type pty from "node-pty";

export type Screen = "menu" | "claude" | "worktree" | "branch_input";

export type Session = {
	id: string;
	process: pty.IPty;
	outputs: Buffer[];
	lastUpdated: Date;
	status: "Idle" | "Running" | "Awaiting Input";
	preview: string;
	workingDirectory?: string;
	dataDisposable?: { dispose: () => void };
};

export type MenuOption = "start" | "exit" | string;

export type EventListeners = {
	handleInput?: (data: Buffer) => void;
	handleResize?: () => void;
	dataDisposable?: { dispose: () => void };
};
