import * as React from "react";
import pty from "node-pty";
import { TERMINAL_CONFIG } from "../constants.js";
import type { EventListeners } from "../types.js";

export const useTerminalController = () => {
	const clearScreen = React.useCallback(() => {
		process.stdout.write(TERMINAL_CONFIG.CLEAR_SCREEN_SEQUENCE);
	}, []);

	const setupRawMode = React.useCallback(() => {
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
		process.stdin.resume();
	}, []);

	const createPtyProcess = React.useCallback(
		(args: string[] = [], cwd?: string, env?: Record<string, string>) => {
			return pty.spawn(TERMINAL_CONFIG.PROCESS_NAME, args, {
				name: TERMINAL_CONFIG.XTERM_NAME,
				cols: process.stdout.columns || TERMINAL_CONFIG.DEFAULT_COLS,
				rows: process.stdout.rows || TERMINAL_CONFIG.DEFAULT_ROWS,
				cwd: cwd || process.cwd(),
				env: { ...process.env, ...env },
			});
		},
		[],
	);

	// Set up persistent data listener that always captures output
	const setupPersistentDataListener = React.useCallback(
		(
			ptyProcess: pty.IPty,
			onData: (data: string) => void,
			isActive: () => boolean,
		) => {
			return ptyProcess.onData((data) => {
				// Always capture data
				onData(data);
				// Only write to stdout if this session is active
				if (isActive()) {
					process.stdout.write(data);
				}
			});
		},
		[],
	);

	// Set up input and resize listeners for active session
	const setupActiveSessionListeners = React.useCallback(
		(ptyProcess: pty.IPty): EventListeners => {
			// Handle input
			const handleInput = (data: Buffer) => {
				ptyProcess.write(data.toString());
			};

			setupRawMode();
			process.stdin.on("data", handleInput);

			// Handle terminal resize
			const handleResize = () => {
				if (process.stdout.columns && process.stdout.rows) {
					ptyProcess.resize(process.stdout.columns, process.stdout.rows);
				}
			};
			process.on("SIGWINCH", handleResize);

			// Set up data forwarder for active session
			const dataDisposable = ptyProcess.onData((data) => {
				process.stdout.write(data);
			});

			return { handleInput, handleResize, dataDisposable };
		},
		[setupRawMode],
	);

	return {
		clearScreen,
		createPtyProcess,
		setupPersistentDataListener,
		setupActiveSessionListeners,
	};
};
