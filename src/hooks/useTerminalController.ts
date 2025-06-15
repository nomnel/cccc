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

	const createPtyProcess = React.useCallback((args: string[] = []) => {
		return pty.spawn(TERMINAL_CONFIG.PROCESS_NAME, args, {
			name: TERMINAL_CONFIG.XTERM_NAME,
			cols: process.stdout.columns || TERMINAL_CONFIG.DEFAULT_COLS,
			rows: process.stdout.rows || TERMINAL_CONFIG.DEFAULT_ROWS,
			cwd: process.cwd(),
			env: process.env,
		});
	}, []);

	const setupProcessListeners = React.useCallback(
		(
			ptyProcess: pty.IPty,
			onExit?: () => void,
			onData?: (data: string) => void,
		): EventListeners => {
			// Handle output
			const dataDisposable = ptyProcess.onData((data) => {
				process.stdout.write(data);
				// Call the onData callback if provided
				if (onData) {
					onData(data);
				}
			});

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

			// Setup exit handler
			if (onExit) {
				ptyProcess.onExit(() => {
					process.stdin.removeListener("data", handleInput);
					process.removeListener("SIGWINCH", handleResize);
					onExit();
				});
			}

			return { handleInput, handleResize, dataDisposable };
		},
		[setupRawMode],
	);

	return {
		clearScreen,
		createPtyProcess,
		setupProcessListeners,
	};
};
