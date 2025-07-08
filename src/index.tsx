import path from "node:path";
import { render, useApp, useInput } from "ink";
import * as React from "react";
import { ExitConfirmation } from "./components/ExitConfirmation.js";
import { Menu } from "./components/Menu.js";
import { SessionSelector } from "./components/SessionSelector.js";
import { SettingsSelector } from "./components/SettingsSelector.js";
import { WorktreeManager } from "./components/WorktreeManager.js";
import { WorktreeMenu } from "./components/WorktreeMenu.js";
import { MENU_OPTIONS, SCREENS, SESSION_PREFIX } from "./constants.js";
import { useEventListeners } from "./hooks/useEventListeners.js";
import { useSessionManager } from "./hooks/useSessionManager.js";
import { useTerminalController } from "./hooks/useTerminalController.js";
import type { Session } from "./types.js";
import { isMenuOption } from "./utils.js";
import { cleanupOrphanedSessions, hasCommandExited, isSessionRunning } from "./utils/tmuxUtils.js";
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
	// Clean up any orphaned sessions from previous runs on mount
	React.useEffect(() => {
		cleanupOrphanedSessions(SESSION_PREFIX);
	}, []);

	const {
		sessions,
		currentScreen,
		currentSessionId,
		error,
		setError,
		generateSessionId,
		addSession,
		removeSession,
		findSession,
		switchToMenu,
		switchToSession,
		switchToWorktree,
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
		createTmuxProcess,
		setupPersistentDataListener,
		setupActiveSessionListeners,
	} = useTerminalController();
	const { exit } = useApp();
	
	// Use refs to get the latest values in callbacks
	const screenRef = React.useRef(currentScreen);
	const sessionIdRef = React.useRef(currentSessionId);
	
	React.useEffect(() => {
		screenRef.current = currentScreen;
	}, [currentScreen]);
	
	React.useEffect(() => {
		sessionIdRef.current = currentSessionId;
	}, [currentSessionId]);

	// State for pending worktree and settings selection
	const [pendingWorktree, setPendingWorktree] = React.useState<string | null>(
		null,
	);
	const [pendingBranch, setPendingBranch] = React.useState<string | null>(null);
	const [pendingBaseBranch, setPendingBaseBranch] = React.useState<
		string | null
	>(null);
	const [pendingRepository, setPendingRepository] = React.useState<
		string | null
	>(null);
	const [settingsFiles, setSettingsFiles] = React.useState<SettingsFile[]>([]);
	const [showExitConfirmation, setShowExitConfirmation] = React.useState(false);

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

			try {
				// Create environment with settings path if provided
				const env = settingsPath
					? { CLAUDE_SETTINGS_PATH: settingsPath }
					: undefined;
				const tmuxSession = createTmuxProcess(sessionId, args, workingDirectory, env);

			// Set up persistent data listener that always captures output
			const dataDisposable = setupPersistentDataListener(
				tmuxSession,
				(data) => {
					appendOutput(sessionId, Buffer.from(data));
				},
				() => {
					const isActive = screenRef.current === SCREENS.CLAUDE && sessionIdRef.current === sessionId;
					return isActive;
				},
			);

			// Set up exit handler by polling tmux session status
			const checkExitInterval = setInterval(() => {
				if (!isSessionRunning(tmuxSession) || hasCommandExited(tmuxSession)) {
					clearInterval(checkExitInterval);
					dataDisposable.dispose();
					removeSession(sessionId);
					clearScreen();
					switchToMenu();
				}
			}, 1000);

			// Set up active session listeners
			const listeners = setupActiveSessionListeners(tmuxSession);
			setListeners(listeners);

			// Get the current branch and repository name for this session
			const branch = getCurrentBranch(workingDirectory);
			const repoName = getRepositoryName(workingDirectory);

			const newSession: Session = {
				id: sessionId,
				tmuxSession,
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
				exitCheckInterval: checkExitInterval,
			};
			addSession(newSession);
			switchToSession(sessionId);
			} catch (error) {
				// Display error to user and return to menu
				const errorMessage = error instanceof Error ? error.message : String(error);
				setError(errorMessage);
				clearScreen();
				switchToMenu();
			}
		},
		[
			generateSessionId,
			clearScreen,
			createTmuxProcess,
			setupPersistentDataListener,
			setupActiveSessionListeners,
			setListeners,
			addSession,
			removeSession,
			switchToSession,
			switchToMenu,
			appendOutput,
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
			const listeners = setupActiveSessionListeners(session.tmuxSession);
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
				if (sessions.length > 0) {
					// Show confirmation dialog if there are active sessions
					setShowExitConfirmation(true);
				} else {
					// No sessions, exit directly
					exit();
				}
			} else if (!isMenuOption(option)) {
				// It's a session ID
				switchToExistingSession(option);
			}
		},
		[
			switchToSessionSelector,
			switchToWorktreeManager,
			exit,
			switchToExistingSession,
			sessions,
		],
	);

	const handleWorktreeSelect = React.useCallback(
		(worktreePath: string) => {
			// Check for settings files in ~/.claude/ and ./.claude/
			const settings = findSettingsFiles(worktreePath);

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

	// Handler for SessionSelector which provides repository path
	const handleBranchSubmitWithRepo = React.useCallback(
		(branchName: string, repositoryPath: string) => {
			// Check if the selected path is a git repository
			if (!isGitRepo(repositoryPath)) {
				console.error("Not in a git repository");
				switchToMenu();
				return;
			}

			// Store the branch name and repository for later use
			setPendingBranch(branchName);
			setPendingRepository(repositoryPath);

			// Check for settings files in ~/.claude/ and ./.claude/
			const settings = findSettingsFiles(repositoryPath);

			if (settings.length > 0) {
				// Settings found, show selector
				setSettingsFiles(settings);
				switchToSettingsSelect();
			} else {
				// No settings files, create worktree and launch directly
				try {
					const worktreePath = createWorktree(branchName, repositoryPath);
					launchNewSession(worktreePath);
				} catch (error) {
					console.error("Failed to create worktree:", error);
					switchToMenu();
				}
			}
		},
		[launchNewSession, switchToMenu, switchToSettingsSelect],
	);

	// Handler for SessionSelector which provides repository path
	const handleBranchFromRefSubmitWithRepo = React.useCallback(
		(branchName: string, baseBranch: string, repositoryPath: string) => {
			// Check if the selected path is a git repository
			if (!isGitRepo(repositoryPath)) {
				console.error("Not in a git repository");
				switchToMenu();
				return;
			}

			// Store the branch names and repository for later use
			setPendingBranch(branchName);
			setPendingBaseBranch(baseBranch);
			setPendingRepository(repositoryPath);

			// Check for settings files in ~/.claude/ and ./.claude/
			const settings = findSettingsFiles(repositoryPath);

			if (settings.length > 0) {
				// Settings found, show selector
				setSettingsFiles(settings);
				switchToSettingsSelect();
			} else {
				// No settings files, create worktree and launch directly
				try {
					const worktreePath = createWorktreeFromRef(
						branchName,
						baseBranch,
						repositoryPath,
					);
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
			const repoPath = pendingRepository || process.cwd();

			// If we have a pending branch, create the worktree now
			if (pendingBranch && pendingBaseBranch) {
				try {
					worktreePath = createWorktreeFromRef(
						pendingBranch,
						pendingBaseBranch,
						repoPath,
					);
				} catch (error) {
					console.error("Failed to create worktree:", error);
					switchToMenu();
					return;
				}
			} else if (pendingBranch) {
				try {
					worktreePath = createWorktree(pendingBranch, repoPath);
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
				setPendingRepository(null);
				setSettingsFiles([]);
			}
		},
		[
			pendingWorktree,
			pendingBranch,
			pendingBaseBranch,
			pendingRepository,
			launchNewSession,
			switchToMenu,
		],
	);

	const handleSettingsBack = React.useCallback(() => {
		setPendingWorktree(null);
		setPendingBranch(null);
		setPendingBaseBranch(null);
		setPendingRepository(null);
		setSettingsFiles([]);

		// Go back to appropriate screen
		switchToWorktree();
	}, [switchToWorktree]);

	const handleExitConfirm = React.useCallback(() => {
		killAllSessions();
		exit();
	}, [killAllSessions, exit]);

	const handleExitCancel = React.useCallback(() => {
		setShowExitConfirmation(false);
	}, []);

	// Render appropriate screen based on current state
	if (showExitConfirmation) {
		return (
			<ExitConfirmation
				sessionCount={sessions.length}
				onConfirm={handleExitConfirm}
				onCancel={handleExitCancel}
			/>
		);
	}

	if (currentScreen === SCREENS.MENU) {
		return <Menu onSelect={handleSelect} sessions={sessions} error={error} />;
	}

	if (currentScreen === SCREENS.WORKTREE) {
		return (
			<WorktreeMenu
				onSelect={handleWorktreeSelect}
				onBack={handleWorktreeBack}
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
				onSelectNewBranch={handleBranchSubmitWithRepo}
				onSelectNewBranchFromRef={handleBranchFromRefSubmitWithRepo}
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
