import * as React from "react";
import { render, useInput, useApp } from "ink";
import pty from "node-pty";
import * as os from "node:os";
import { Menu } from "./Menu.js";

const shell =
	os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

type Screen = "menu" | "claude";

const App: React.FC = () => {
	const [currentScreen, setCurrentScreen] = React.useState<Screen>("menu");
	const [claudeProcess, setClaudeProcess] = React.useState<pty.IPty | null>(
		null,
	);
	const { exit } = useApp();

	// Handle Ctrl+Q to return to menu when in claude screen
	useInput((input, key) => {
		if (currentScreen === "claude" && key.ctrl && input === "q") {
			// Kill the claude process and return to menu
			if (claudeProcess) {
				claudeProcess.kill();
				setClaudeProcess(null);
			}
			// Clear screen and return to menu
			process.stdout.write("\x1b[2J\x1b[H");
			setCurrentScreen("menu");
		}
	});

	const launchClaude = React.useCallback(() => {
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

		// Store the process reference
		setClaudeProcess(ptyProcess);

		// Handle output from claude
		ptyProcess.onData((data) => {
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

		// Clean up on exit
		ptyProcess.onExit(({ exitCode }) => {
			// Remove event listeners
			process.stdin.removeListener("data", handleInput);
			process.removeListener("SIGWINCH", handleResize);

			// Clear the process reference
			setClaudeProcess(null);

			// Clear screen and return to menu
			process.stdout.write("\x1b[2J\x1b[H");
			setCurrentScreen("menu");
		});

		return ptyProcess;
	}, []);

	const handleSelect = React.useCallback(
		(option: "start" | "exit") => {
			if (option === "start") {
				setCurrentScreen("claude");
				// Launch claude after state update
				setTimeout(() => {
					launchClaude();
				}, 0);
			} else {
				exit();
			}
		},
		[exit, launchClaude],
	);

	// Only render menu when on menu screen
	if (currentScreen === "menu") {
		return <Menu onSelect={handleSelect} />;
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
