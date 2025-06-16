import * as React from "react";
import { render, useInput, useApp } from "ink";
import { Menu } from "./components/Menu.js";
import { WorktreeMenu } from "./components/WorktreeMenu.js";
import { BranchInput } from "./components/BranchInput.js";
import { SettingsSelector } from "./components/SettingsSelector.js";
import { useSessionManager } from "./hooks/useSessionManager.js";
import { useEventListeners } from "./hooks/useEventListeners.js";
import { useTerminalController } from "./hooks/useTerminalController.js";
import { MENU_OPTIONS, SCREENS } from "./constants.js";
import { isMenuOption } from "./utils.js";
import { createWorktree, isGitRepo } from "./utils/gitUtils.js";
import {
	findHomeSettingsFiles,
	copySettingsToWorktree,
	type SettingsFile,
} from "./utils/settingsUtils.js";
import type { Session } from "./types.js";
import path from "node:path";

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
		switchToWorktree,
		switchToBranchInput,
		switchToSettingsSelect,
		killAllSessions,
		appendOutput,
	} = useSessionManager();

	const { setListeners, cleanupListeners, activeListeners } =
		useEventListeners();
	const {
		clearScreen,
		createPtyProcess,
		setupPersistentDataListener,
		setupActiveSessionListeners,
	} = useTerminalController();
	const { exit } = useApp();

	// State for pending worktree and settings selection
	const [pendingWorktree, setPendingWorktree] = React.useState<string | null>(
		null,
	);
	const [settingsFiles, setSettingsFiles] = React.useState<SettingsFile[]>([]);

	// Handle Ctrl+Q to return to menu when in claude screen
	useInput((input, key) => {
		if (currentScreen === SCREENS.CLAUDE && key.ctrl && input === "q") {
			// Only cleanup input/resize listeners, keep data listener active
			if (activeListeners.handleInput) {
				process.stdin.removeListener("data", activeListeners.handleInput);
			}
			if (activeListeners.handleResize) {
				process.removeListener("SIGWINCH", activeListeners.handleResize);
			}
			// Don't dispose data listener - it's managed by the session
			setListeners({});
			clearScreen();
			switchToMenu();
		}
	});

	const launchNewSession = React.useCallback(
		(
			workingDirectory?: string,
			settingsPath?: string,
			settingsName?: string,
		) => {
			const args = process.argv.slice(2);
			const sessionId = generateSessionId();

			clearScreen();

			// Create environment with settings path if provided
			const env = settingsPath
				? { CLAUDE_SETTINGS_PATH: settingsPath }
				: undefined;
			const ptyProcess = createPtyProcess(args, workingDirectory, env);

			// Set up persistent data listener that always captures output
			const dataDisposable = setupPersistentDataListener(
				ptyProcess,
				(data) => appendOutput(sessionId, Buffer.from(data)),
				() =>
					currentScreen === SCREENS.CLAUDE && currentSessionId === sessionId,
			);

			// Set up exit handler
			ptyProcess.onExit(() => {
				dataDisposable.dispose();
				removeSession(sessionId);
				clearScreen();
				switchToMenu();
			});

			// Set up active session listeners
			const listeners = setupActiveSessionListeners(ptyProcess);
			setListeners(listeners);
			const newSession: Session = {
				id: sessionId,
				process: ptyProcess,
				outputs: [],
				lastUpdated: new Date(),
				status: "Idle",
				preview: "",
				workingDirectory,
				settingsPath,
				settingsName,
				dataDisposable,
			};
			addSession(newSession);
			switchToSession(sessionId);
		},
		[
			generateSessionId,
			clearScreen,
			createPtyProcess,
			setupPersistentDataListener,
			setupActiveSessionListeners,
			setListeners,
			addSession,
			removeSession,
			switchToSession,
			switchToMenu,
			appendOutput,
			currentScreen,
			currentSessionId,
		],
	);

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

			// Set up active session listeners only (data listener is already active)
			const listeners = setupActiveSessionListeners(session.process);
			setListeners(listeners);
		},
		[
			findSession,
			clearScreen,
			switchToSession,
			setupActiveSessionListeners,
			setListeners,
		],
	);

	const handleSelect = React.useCallback(
		(option: string) => {
			if (option === MENU_OPTIONS.START) {
				switchToBranchInput();
			} else if (option === MENU_OPTIONS.WORKTREE) {
				switchToWorktree();
			} else if (option === MENU_OPTIONS.EXIT) {
				killAllSessions();
				exit();
			} else if (!isMenuOption(option)) {
				// It's a session ID
				switchToExistingSession(option);
			}
		},
		[
			switchToBranchInput,
			switchToWorktree,
			killAllSessions,
			exit,
			switchToExistingSession,
		],
	);

	const handleWorktreeSelect = React.useCallback(
		(worktreePath: string) => {
			// Check for settings files in ~/.claude/
			const settings = findHomeSettingsFiles();

			if (settings.length > 0) {
				// Settings found, show selector
				setPendingWorktree(worktreePath);
				setSettingsFiles(settings);
				switchToSettingsSelect();
			} else {
				// No settings files
				launchNewSession(worktreePath);
			}
		},
		[launchNewSession, switchToSettingsSelect],
	);

	const handleWorktreeBack = React.useCallback(() => {
		switchToMenu();
	}, [switchToMenu]);

	const handleBranchSubmit = React.useCallback(
		(branchName: string) => {
			try {
				// Check if we're in a git repository
				if (!isGitRepo()) {
					throw new Error("Not in a git repository");
				}

				// Create the worktree with the provided branch name
				const worktreePath = createWorktree(branchName);

				// Check for settings files in ~/.claude/
				const settings = findHomeSettingsFiles();

				if (settings.length > 0) {
					// Settings found, show selector
					setPendingWorktree(worktreePath);
					setSettingsFiles(settings);
					switchToSettingsSelect();
				} else {
					// No settings files
					launchNewSession(worktreePath);
				}
			} catch (error) {
				// For now, just log the error and return to menu
				console.error("Failed to create worktree:", error);
				switchToMenu();
			}
		},
		[launchNewSession, switchToMenu, switchToSettingsSelect],
	);

	const handleBranchInputBack = React.useCallback(() => {
		switchToMenu();
	}, [switchToMenu]);

	const handleSettingsSelect = React.useCallback(
		(settingsPath: string | null, settingsName?: string) => {
			if (pendingWorktree) {
				let localSettingsPath: string | undefined;
				if (settingsPath) {
					try {
						// Copy the settings file to the worktree
						localSettingsPath = copySettingsToWorktree(
							settingsPath,
							pendingWorktree,
						);
					} catch (error) {
						console.error("Failed to copy settings file:", error);
					}
				}
				launchNewSession(pendingWorktree, localSettingsPath, settingsName);
				setPendingWorktree(null);
				setSettingsFiles([]);
			}
		},
		[pendingWorktree, launchNewSession],
	);

	const handleSettingsBack = React.useCallback(() => {
		setPendingWorktree(null);
		setSettingsFiles([]);
		switchToWorktree();
	}, [switchToWorktree]);

	// Render appropriate screen based on current state
	if (currentScreen === SCREENS.MENU) {
		return <Menu onSelect={handleSelect} sessions={sessions} />;
	}

	if (currentScreen === SCREENS.WORKTREE) {
		return (
			<WorktreeMenu
				onSelect={handleWorktreeSelect}
				onBack={handleWorktreeBack}
			/>
		);
	}

	if (currentScreen === SCREENS.BRANCH_INPUT) {
		return (
			<BranchInput
				onSubmit={handleBranchSubmit}
				onBack={handleBranchInputBack}
			/>
		);
	}

	if (currentScreen === SCREENS.SETTINGS_SELECT && pendingWorktree) {
		return (
			<SettingsSelector
				settingsFiles={settingsFiles}
				workingDirectory={pendingWorktree}
				onSelect={handleSettingsSelect}
				onBack={handleSettingsBack}
			/>
		);
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
