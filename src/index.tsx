import * as React from "react";
import { render } from "ink";
import pty from "node-pty";
import * as os from "node:os";
import { Menu } from "./Menu.js";

const shell = os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

const launchClaude = () => {
	const args = process.argv.slice(2);

	const ptyProcess = pty.spawn("claude", args, {
		name: "xterm-color",
		cols: process.stdout.columns || 80,
		rows: process.stdout.rows || 24,
		cwd: process.cwd(),
		env: process.env,
	});

	ptyProcess.onData((data) => {
		process.stdout.write(data);
	});

	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
	}
	process.stdin.resume();
	process.stdin.on("data", (data) => {
		ptyProcess.write(data.toString());
	});

	ptyProcess.onExit(({ exitCode }) => {
		process.exit(exitCode);
	});

	process.on("SIGWINCH", () => {
		if (process.stdout.columns && process.stdout.rows) {
			ptyProcess.resize(process.stdout.columns, process.stdout.rows);
		}
	});

	process.on("exit", () => {
		ptyProcess.kill();
	});
};

let app: ReturnType<typeof render> | null = null;

const App: React.FC = () => {
	const handleSelect = (option: "start" | "exit") => {
		if (option === "start") {
			if (app) {
				app.unmount();
			}
			process.nextTick(() => {
				launchClaude();
			});
		} else {
			process.exit(0);
		}
	};

	return <Menu onSelect={handleSelect} />;
};

app = render(<App />);

process.on("beforeExit", () => {
	if (app) {
		app.unmount();
	}
});