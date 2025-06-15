import type pty from "node-pty";

export type Screen = "menu" | "claude";

export type Session = {
	id: string;
	process: pty.IPty;
	outputs: Buffer[];
};

export type MenuOption = "start" | "exit" | string;

export type EventListeners = {
	handleInput?: (data: Buffer) => void;
	handleResize?: () => void;
	dataDisposable?: { dispose: () => void };
};
