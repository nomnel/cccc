import * as pty from "node-pty";
import * as os from "node:os";

const shell = os.platform() === "win32" ? "powershell.exe" : process.env.SHELL || "bash";

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