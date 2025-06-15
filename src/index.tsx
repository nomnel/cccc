import * as React from "react";
import { render, useInput, useApp } from "ink";
import { Menu } from "./Menu.js";
import { useSessionManager } from "./hooks/useSessionManager.js";
import { useEventListeners } from "./hooks/useEventListeners.js";
import { useTerminalController } from "./hooks/useTerminalController.js";
import { MENU_OPTIONS, SCREENS } from "./constants.js";
import { isMenuOption } from "./utils.js";
import type { Session } from "./types.js";

const App: React.FC = () => {
	const {
		sessions,
		currentScreen,
		currentSessionId,
		generateSessionId,
		addSession,
		removeSession,
		findSession,
		switchToMenu,
		switchToSession,
		killAllSessions,
		appendOutput,
	} = useSessionManager();

	const { setListeners, cleanupListeners } = useEventListeners();
	const { clearScreen, createPtyProcess, setupProcessListeners } =
		useTerminalController();
	const { exit } = useApp();

	// Handle Ctrl+Q to return to menu when in claude screen
	useInput((input, key) => {
		if (currentScreen === SCREENS.CLAUDE && key.ctrl && input === "q") {
			cleanupListeners();
			clearScreen();
			switchToMenu();
		}
	});

	const launchNewSession = React.useCallback(() => {
		const args = process.argv.slice(2);
		const sessionId = generateSessionId();

		clearScreen();

		const ptyProcess = createPtyProcess(args);

		const listeners = setupProcessListeners(
			ptyProcess,
			() => {
				removeSession(sessionId);
				clearScreen();
				switchToMenu();
			},
			(data) => {
				appendOutput(sessionId, data);
			},
		);

		setListeners(listeners);
		const newSession: Session = {
			id: sessionId,
			process: ptyProcess,
			outputs: [],
		};
		addSession(newSession);
		switchToSession(sessionId);
	}, [
		generateSessionId,
		clearScreen,
		createPtyProcess,
		setupProcessListeners,
		setListeners,
		addSession,
		removeSession,
		switchToSession,
		switchToMenu,
		appendOutput,
	]);

	const switchToExistingSession = React.useCallback(
		(sessionId: string) => {
			const session = findSession(sessionId);
			if (!session) return;

			clearScreen();

			// Restore the previous outputs
			for (const output of session.outputs) {
				process.stdout.write(output);
			}

			switchToSession(sessionId);

			const listeners = setupProcessListeners(
				session.process,
				undefined,
				(data) => {
					appendOutput(sessionId, data);
				},
			);
			setListeners(listeners);
		},
		[
			findSession,
			clearScreen,
			switchToSession,
			setupProcessListeners,
			setListeners,
			appendOutput,
		],
	);

	const handleSelect = React.useCallback(
		(option: string) => {
			if (option === MENU_OPTIONS.START) {
				launchNewSession();
			} else if (option === MENU_OPTIONS.EXIT) {
				killAllSessions();
				exit();
			} else if (!isMenuOption(option)) {
				// It's a session ID
				switchToExistingSession(option);
			}
		},
		[launchNewSession, killAllSessions, exit, switchToExistingSession],
	);

	// Only render menu when on menu screen
	if (currentScreen === SCREENS.MENU) {
		return <Menu onSelect={handleSelect} sessions={sessions} />;
	}

	// Return null when claude is running
	return null;
};

const app = render(<App />);

process.on("beforeExit", () => {
	if (app) {
		app.unmount();
	}
});

export default App;
