import path from "node:path";
import { render, useApp, useInput } from "ink";
import * as React from "react";
import { BranchInput } from "./components/BranchInput.js";
import { Menu } from "./components/Menu.js";
import { SessionSelector } from "./components/SessionSelector.js";
import { SettingsSelector } from "./components/SettingsSelector.js";
import { WorktreeManager } from "./components/WorktreeManager.js";
import { WorktreeMenu } from "./components/WorktreeMenu.js";
import { MENU_OPTIONS, SCREENS } from "./constants.js";
import { useEventListeners } from "./hooks/useEventListeners.js";
import { useSessionManager } from "./hooks/useSessionManager.js";
import { useTerminalController } from "./hooks/useTerminalController.js";
import type { Session } from "./types.js";
import { isMenuOption } from "./utils.js";
import {
	createWorktree,
	createWorktreeFromRef,
	getCurrentBranch,
	getRepositoryName,
	isGitRepo,
} from "./utils/gitUtils.js";
import {
	type SettingsFile,
	copySettingsToWorktree,
	findSettingsFiles,
} from "./utils/settingsUtils.js";

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
		switchToWorktreeManager,
		switchToSessionSelector,
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
	const [pendingBranch, setPendingBranch] = React.useState<string | null>(null);
	const [pendingBaseBranch, setPendingBaseBranch] = React.useState<
		string | null
	>(null);
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

			// Get the current branch and repository name for this session
			const branch = getCurrentBranch(workingDirectory);
			const repoName = getRepositoryName(workingDirectory);

			const newSession: Session = {
				id: sessionId,
				process: ptyProcess,
				outputs: [],
				lastUpdated: new Date(),
				status: "Idle",
				preview: "",
				workingDirectory,
				branch: branch || undefined,
				repoName: repoName || undefined,
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
			if (option === MENU_OPTIONS.START_NEW_SESSION) {
				switchToSessionSelector();
			} else if (option === MENU_OPTIONS.MANAGE_WORKTREES) {
				switchToWorktreeManager();
			} else if (option === MENU_OPTIONS.EXIT) {
				killAllSessions();
				exit();
			} else if (!isMenuOption(option)) {
				// It's a session ID
				switchToExistingSession(option);
			}
		},
		[
			switchToSessionSelector,
			switchToWorktreeManager,
			killAllSessions,
			exit,
			switchToExistingSession,
		],
	);

	const handleWorktreeSelect = React.useCallback(
		(worktreePath: string) => {
			// Check for settings files in ~/.claude/ and ./.claude/
			const settings = findSettingsFiles();

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
			// Check if we're in a git repository
			if (!isGitRepo()) {
				console.error("Not in a git repository");
				switchToMenu();
				return;
			}

			// Store the branch name for later use
			setPendingBranch(branchName);

			// Check for settings files in ~/.claude/ and ./.claude/
			const settings = findSettingsFiles();

			if (settings.length > 0) {
				// Settings found, show selector
				setSettingsFiles(settings);
				switchToSettingsSelect();
			} else {
				// No settings files, create worktree and launch directly
				try {
					const worktreePath = createWorktree(branchName);
					launchNewSession(worktreePath);
				} catch (error) {
					console.error("Failed to create worktree:", error);
					switchToMenu();
				}
			}
		},
		[launchNewSession, switchToMenu, switchToSettingsSelect],
	);

	const handleBranchInputBack = React.useCallback(() => {
		switchToMenu();
	}, [switchToMenu]);

	const handleBranchFromRefSubmit = React.useCallback(
		(branchName: string, baseBranch: string) => {
			// Check if we're in a git repository
			if (!isGitRepo()) {
				console.error("Not in a git repository");
				switchToMenu();
				return;
			}

			// Store the branch names for later use
			setPendingBranch(branchName);
			setPendingBaseBranch(baseBranch);

			// Check for settings files in ~/.claude/ and ./.claude/
			const settings = findSettingsFiles();

			if (settings.length > 0) {
				// Settings found, show selector
				setSettingsFiles(settings);
				switchToSettingsSelect();
			} else {
				// No settings files, create worktree and launch directly
				try {
					const worktreePath = createWorktreeFromRef(branchName, baseBranch);
					launchNewSession(worktreePath);
				} catch (error) {
					console.error("Failed to create worktree:", error);
					switchToMenu();
				}
			}
		},
		[launchNewSession, switchToMenu, switchToSettingsSelect],
	);

	const handleSettingsSelect = React.useCallback(
		(settingsPath: string | null, settingsName?: string) => {
			let worktreePath: string | undefined;

			// If we have a pending branch, create the worktree now
			if (pendingBranch && pendingBaseBranch) {
				try {
					worktreePath = createWorktreeFromRef(
						pendingBranch,
						pendingBaseBranch,
					);
				} catch (error) {
					console.error("Failed to create worktree:", error);
					switchToMenu();
					return;
				}
			} else if (pendingBranch) {
				try {
					worktreePath = createWorktree(pendingBranch);
				} catch (error) {
					console.error("Failed to create worktree:", error);
					switchToMenu();
					return;
				}
			} else if (pendingWorktree) {
				// Use existing worktree
				worktreePath = pendingWorktree;
			}

			if (worktreePath) {
				let localSettingsPath: string | undefined;
				if (settingsPath) {
					try {
						// Copy the settings file to the worktree
						localSettingsPath = copySettingsToWorktree(
							settingsPath,
							worktreePath,
						);
					} catch (error) {
						console.error("Failed to copy settings file:", error);
					}
				}
				launchNewSession(worktreePath, localSettingsPath, settingsName);
				setPendingWorktree(null);
				setPendingBranch(null);
				setPendingBaseBranch(null);
				setSettingsFiles([]);
			}
		},
		[
			pendingWorktree,
			pendingBranch,
			pendingBaseBranch,
			launchNewSession,
			switchToMenu,
		],
	);

	const handleSettingsBack = React.useCallback(() => {
		setPendingWorktree(null);
		setPendingBranch(null);
		setPendingBaseBranch(null);
		setSettingsFiles([]);

		// Go back to appropriate screen
		if (pendingBranch) {
			switchToBranchInput();
		} else {
			switchToWorktree();
		}
	}, [pendingBranch, switchToBranchInput, switchToWorktree]);

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

	if (
		currentScreen === SCREENS.SETTINGS_SELECT &&
		(pendingWorktree || pendingBranch)
	) {
		return (
			<SettingsSelector
				settingsFiles={settingsFiles}
				workingDirectory={pendingWorktree || `[new worktree: ${pendingBranch}]`}
				onSelect={handleSettingsSelect}
				onBack={handleSettingsBack}
			/>
		);
	}

	if (currentScreen === SCREENS.WORKTREE_MANAGER) {
		return <WorktreeManager onBack={switchToMenu} />;
	}

	if (currentScreen === SCREENS.SESSION_SELECTOR) {
		return (
			<SessionSelector
				onSelectNewBranch={handleBranchSubmit}
				onSelectNewBranchFromRef={handleBranchFromRefSubmit}
				onSelectWorktree={handleWorktreeSelect}
				onBack={switchToMenu}
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
