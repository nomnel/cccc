import * as React from "react";
import { render, useInput, useApp } from "ink";
import pty from "node-pty";
import * as os from "node:os";
import { Menu } from "./Menu.js";

const shell =
	os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

type Screen = "menu" | "claude";
type Session = { id: string; process: pty.IPty };

const App: React.FC = () => {
	const [currentScreen, setCurrentScreen] = React.useState<Screen>("menu");
	const [sessions, setSessions] = React.useState<Session[]>([]);
	const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(
		null,
	);
	const { exit } = useApp();
	const sessionCounter = React.useRef(0);
	const activeListeners = React.useRef<{
		handleInput?: (data: Buffer) => void;
		handleResize?: () => void;
		dataDisposable?: { dispose: () => void };
	}>({});

	// Handle Ctrl+Q to return to menu when in claude screen
	useInput((input, key) => {
		if (currentScreen === "claude" && key.ctrl && input === "q") {
			// Clean up event listeners
			if (activeListeners.current.handleInput) {
				process.stdin.removeListener("data", activeListeners.current.handleInput);
			}
			if (activeListeners.current.handleResize) {
				process.removeListener("SIGWINCH", activeListeners.current.handleResize);
			}
			if (activeListeners.current.dataDisposable) {
				activeListeners.current.dataDisposable.dispose();
			}
			
			// Return to menu without killing the session
			// Clear screen and return to menu
			process.stdout.write("\x1b[2J\x1b[H");
			setCurrentScreen("menu");
			setCurrentSessionId(null);
			activeListeners.current = {};
		}
	});

	const launchClaude = React.useCallback((sessionId: string) => {
		const args = process.argv.slice(2);

		// Clear the screen before launching claude
		process.stdout.write("\x1b[2J\x1b[H");

		const ptyProcess = pty.spawn("claude", args, {
			name: "xterm-color",
			cols: process.stdout.columns || 80,
			rows: process.stdout.rows || 24,
			cwd: process.cwd(),
			env: process.env,
		});

		// Handle output from claude
		const dataDisposable = ptyProcess.onData((data) => {
			process.stdout.write(data);
		});

		// Handle input to claude
		const handleInput = (data: Buffer) => {
			ptyProcess.write(data.toString());
		};

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
		process.stdin.resume();
		process.stdin.on("data", handleInput);

		// Handle terminal resize
		const handleResize = () => {
			if (process.stdout.columns && process.stdout.rows) {
				ptyProcess.resize(process.stdout.columns, process.stdout.rows);
			}
		};
		process.on("SIGWINCH", handleResize);

		// Store listeners for cleanup
		activeListeners.current = { handleInput, handleResize, dataDisposable };

		// Clean up on exit
		ptyProcess.onExit(({ exitCode }) => {
			// Remove event listeners
			process.stdin.removeListener("data", handleInput);
			process.removeListener("SIGWINCH", handleResize);

			// Remove the session from the list
			setSessions((prev) => prev.filter((s) => s.id !== sessionId));

			// Clear screen and return to menu
			process.stdout.write("\x1b[2J\x1b[H");
			setCurrentScreen("menu");
			setCurrentSessionId(null);
		});

		return ptyProcess;
	}, []);

	const switchToSession = React.useCallback((sessionId: string) => {
		const session = sessions.find((s) => s.id === sessionId);
		if (!session) return;

		// Clean up previous session listeners if any
		if (activeListeners.current.dataDisposable) {
			activeListeners.current.dataDisposable.dispose();
		}

		// Clear the screen
		process.stdout.write("\x1b[2J\x1b[H");
		setCurrentSessionId(sessionId);
		setCurrentScreen("claude");

		// Set up input handling for this session
		const handleInput = (data: Buffer) => {
			session.process.write(data.toString());
		};

		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
		process.stdin.resume();
		process.stdin.on("data", handleInput);

		// Handle output from the session
		const dataDisposable = session.process.onData((data) => {
			process.stdout.write(data);
		});

		// Handle terminal resize
		const handleResize = () => {
			if (process.stdout.columns && process.stdout.rows) {
				session.process.resize(process.stdout.columns, process.stdout.rows);
			}
		};
		process.on("SIGWINCH", handleResize);

		// Store listeners for cleanup
		activeListeners.current = { handleInput, handleResize, dataDisposable };
	}, [sessions]);

	const handleSelect = React.useCallback(
		(option: string) => {
			if (option === "start") {
				sessionCounter.current += 1;
				const newSessionId = `session-${sessionCounter.current}`;
				
				setCurrentScreen("claude");
				setCurrentSessionId(newSessionId);
				
				// Launch claude after state update
				setTimeout(() => {
					const process = launchClaude(newSessionId);
					setSessions((prev) => [...prev, { id: newSessionId, process }]);
				}, 0);
			} else if (option === "exit") {
				// Kill all sessions before exiting
				for (const session of sessions) {
					session.process.kill();
				}
				exit();
			} else {
				// It's a session ID
				switchToSession(option);
			}
		},
		[exit, launchClaude, sessions, switchToSession],
	);

	// Only render menu when on menu screen
	if (currentScreen === "menu") {
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
