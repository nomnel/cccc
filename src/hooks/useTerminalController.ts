import * as React from "react";
import { TERMINAL_CONFIG } from "../constants.js";
import type { EventListeners } from "../types.js";
import {
	createOutputMonitor,
	createTmuxSession,
	getCurrentTerminalDimensions,
	resizePane,
	sendInput,
	type TmuxSession,
} from "../utils/tmuxUtils.js";

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

	const createTmuxProcess = React.useCallback(
		(
			sessionId: string,
			args: string[] = [],
			cwd?: string,
			env?: Record<string, string>,
		) => {
			const command =
				args.length > 0
					? `${TERMINAL_CONFIG.PROCESS_NAME} ${args.join(" ")}`
					: TERMINAL_CONFIG.PROCESS_NAME;

			// Get current terminal dimensions to pass to tmux
			const dimensions = getCurrentTerminalDimensions();

			const tmuxSession = createTmuxSession(
				sessionId,
				command,
				cwd || process.cwd(),
				{ ...process.env, ...env } as Record<string, string>,
				dimensions,
			);

			return tmuxSession;
		},
		[],
	);

	// Set up persistent data listener that always captures output
	const setupPersistentDataListener = React.useCallback(
		(
			tmuxSession: TmuxSession,
			onData: (data: string) => void,
			isActive: () => boolean,
		) => {
			const outputMonitor = createOutputMonitor(tmuxSession, (data) => {
				// Always capture data
				onData(data);
				// Only write to stdout if this session is active
				if (isActive()) {
					process.stdout.write(data);
				}
			});

			// Store the monitor in the session for cleanup
			tmuxSession.outputMonitor = outputMonitor;

			return {
				dispose: () => {
					if (outputMonitor && !outputMonitor.killed) {
						outputMonitor.kill();
					}
				},
			};
		},
		[],
	);

	// Set up input and resize listeners for active session
	const setupActiveSessionListeners = React.useCallback(
		(tmuxSession: TmuxSession): EventListeners => {
			// Handle input
			const handleInput = (data: Buffer) => {
				sendInput(tmuxSession, data.toString());
			};

			setupRawMode();
			process.stdin.on("data", handleInput);

			// Handle terminal resize
			const handleResize = () => {
				if (process.stdout.columns && process.stdout.rows) {
					resizePane(tmuxSession, {
						cols: process.stdout.columns,
						rows: process.stdout.rows,
					});
				}
			};
			process.on("SIGWINCH", handleResize);

			// Note: Data forwarding is handled by the persistent listener
			// No additional disposable needed here

			return { handleInput, handleResize };
		},
		[setupRawMode],
	);

	return {
		clearScreen,
		createTmuxProcess,
		setupPersistentDataListener,
		setupActiveSessionListeners,
	};
};
