import { execSync, spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

export interface TmuxSession {
	sessionName: string;
	paneName: string;
	outputMonitor?: ChildProcess;
	lastCapturedLine: number;
}

export interface TmuxDimensions {
	cols: number;
	rows: number;
}

/**
 * Creates a new tmux session with the specified command
 */
export const createTmuxSession = (
	sessionName: string,
	command: string,
	cwd: string,
	env: Record<string, string>,
): TmuxSession => {
	const paneName = `${sessionName}-pane`;
	
	// Check if session already exists and kill it if it does
	try {
		execSync(`tmux has-session -t "${sessionName}" 2>/dev/null`, {
			stdio: "pipe",
		});
		// Session exists, kill it first
		try {
			execSync(`tmux kill-session -t "${sessionName}"`, {
				stdio: "pipe",
			});
		} catch {
			// Ignore errors if kill fails
		}
	} catch {
		// Session doesn't exist, which is what we want
	}
	
	// Create tmux session with the command
	try {
		const tmuxCommand = `tmux new-session -d -s "${sessionName}" -n "${paneName}" -c "${cwd}" ${command}`;
		
		// Execute with environment variables passed through execSync's env option
		execSync(tmuxCommand, { 
			stdio: "pipe",
			env: env,
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		// Check if tmux is installed
		try {
			execSync("which tmux", { stdio: "pipe", env });
		} catch {
			throw new Error("tmux is not installed. Please install tmux to use this application.");
		}
		// Check if the command (claude) exists
		try {
			execSync(`which ${command.split(" ")[0]}`, { stdio: "pipe", env });
		} catch {
			throw new Error(`Command '${command.split(" ")[0]}' not found. Make sure Claude CLI is installed and in your PATH.`);
		}
		throw new Error(`Failed to create tmux session: ${errorMessage}`);
	}
	
	return {
		sessionName,
		paneName,
		lastCapturedLine: 0,
	};
};

/**
 * Sends input to a tmux session
 */
export const sendInput = (session: TmuxSession, data: string): void => {
	try {
		// Escape special characters for tmux send-keys
		const escaped = data
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\$/g, "\\$")
			.replace(/`/g, "\\`");
		
		execSync(`tmux send-keys -t "${session.sessionName}:${session.paneName}" "${escaped}"`, {
			stdio: "pipe",
		});
	} catch (error) {
		throw new Error(`Failed to send input to tmux session: ${error}`);
	}
};

/**
 * Captures the output from a tmux pane
 */
export const captureOutput = (session: TmuxSession): string => {
	try {
		const output = execSync(
			`tmux capture-pane -t "${session.sessionName}:${session.paneName}" -p -S -`,
			{ encoding: "utf8" }
		);
		return output;
	} catch (error) {
		throw new Error(`Failed to capture tmux output: ${error}`);
	}
};

/**
 * Captures incremental output from a tmux pane (only new lines since last capture)
 */
export const captureIncrementalOutput = (session: TmuxSession): { output: string; newLastLine: number } => {
	try {
		// Get current pane history size
		const historySize = parseInt(
			execSync(
				`tmux display-message -t "${session.sessionName}:${session.paneName}" -p "#{history_size}"`,
				{ encoding: "utf8" }
			).trim(),
			10
		);
		
		if (session.lastCapturedLine >= historySize) {
			return { output: "", newLastLine: historySize };
		}
		
		// Capture only new lines
		const output = execSync(
			`tmux capture-pane -t "${session.sessionName}:${session.paneName}" -p -S ${session.lastCapturedLine} -E ${historySize - 1}`,
			{ encoding: "utf8" }
		);
		
		return { output, newLastLine: historySize };
	} catch (error) {
		throw new Error(`Failed to capture incremental tmux output: ${error}`);
	}
};

/**
 * Resizes a tmux pane
 */
export const resizePane = (session: TmuxSession, dimensions: TmuxDimensions): void => {
	try {
		execSync(
			`tmux resize-pane -t "${session.sessionName}:${session.paneName}" -x ${dimensions.cols} -y ${dimensions.rows}`,
			{ stdio: "pipe" }
		);
	} catch (error) {
		throw new Error(`Failed to resize tmux pane: ${error}`);
	}
};

/**
 * Checks if a tmux session is still running
 */
export const isSessionRunning = (session: TmuxSession): boolean => {
	try {
		execSync(`tmux has-session -t "${session.sessionName}" 2>/dev/null`, {
			stdio: "pipe",
		});
		return true;
	} catch {
		return false;
	}
};

/**
 * Checks if the command in the pane has exited
 */
export const hasCommandExited = (session: TmuxSession): boolean => {
	try {
		const paneInfo = execSync(
			`tmux list-panes -t "${session.sessionName}:${session.paneName}" -F "#{pane_dead}"`,
			{ encoding: "utf8" }
		).trim();
		
		return paneInfo === "1";
	} catch {
		return true;
	}
};

/**
 * Kills a tmux session
 */
export const killSession = (session: TmuxSession): void => {
	try {
		// Stop pipe-pane first
		try {
			execSync(`tmux pipe-pane -t "${session.sessionName}:${session.paneName}" -O`, {
				stdio: "pipe",
			});
		} catch {
			// Ignore if it fails
		}
		
		// Kill the output monitor if it exists
		if (session.outputMonitor && !session.outputMonitor.killed) {
			session.outputMonitor.kill();
		}
		
		// Clean up FIFO
		const pipePath = `/tmp/tmux-monitor-${session.sessionName}`;
		try {
			execSync(`rm -f "${pipePath}"`, { stdio: "pipe" });
		} catch {
			// Ignore cleanup errors
		}
		
		execSync(`tmux kill-session -t "${session.sessionName}"`, {
			stdio: "pipe",
		});
	} catch {
		// Session might already be dead, ignore error
	}
};

/**
 * Sets up a continuous output monitor for a tmux session
 */
export const createOutputMonitor = (
	session: TmuxSession,
	onData: (data: string) => void,
): ChildProcess => {
	// First, ensure pipe-pane is off
	try {
		execSync(`tmux pipe-pane -t "${session.sessionName}:${session.paneName}" -O`, {
			stdio: "pipe",
		});
	} catch {
		// Ignore if it fails (pipe might not be active)
	}
	
	// Create a FIFO pipe for output
	const pipePath = `/tmp/tmux-monitor-${session.sessionName}`;
	try {
		// Remove old FIFO if it exists
		execSync(`rm -f "${pipePath}"`, { stdio: "pipe" });
		execSync(`mkfifo "${pipePath}"`, { stdio: "pipe" });
	} catch {
		// Ignore errors
	}
	
	// Start the reader first (non-blocking)
	const monitor = spawn("cat", [pipePath]);
	
	// Give the reader a moment to connect to the FIFO
	setTimeout(() => {
		// Start piping tmux output to the FIFO
		try {
			execSync(
				`tmux pipe-pane -t "${session.sessionName}:${session.paneName}" -o "cat >> ${pipePath}"`,
				{ stdio: "pipe" }
			);
		} catch (error) {
			// Kill the monitor if pipe-pane fails
			if (!monitor.killed) {
				monitor.kill();
			}
		}
	}, 100);
	
	monitor.stdout?.on("data", (chunk: Buffer) => {
		onData(chunk.toString());
	});
	
	monitor.on("error", (error) => {
		// Try to clean up and notify about the error
		try {
			execSync(`tmux pipe-pane -t "${session.sessionName}:${session.paneName}" -O`, {
				stdio: "pipe",
			});
		} catch {
			// Ignore if it fails
		}
	});
	
	monitor.on("exit", () => {
		// Clean up FIFO
		try {
			execSync(`rm -f "${pipePath}"`, { stdio: "pipe" });
		} catch {
			// Ignore cleanup errors
		}
	});
	
	return monitor;
};

/**
 * Get terminal dimensions of current terminal
 */
export const getCurrentTerminalDimensions = (): TmuxDimensions => {
	return {
		cols: process.stdout.columns || 80,
		rows: process.stdout.rows || 24,
	};
};

/**
 * Clean up any orphaned tmux sessions from previous runs
 */
export const cleanupOrphanedSessions = (sessionPrefix: string): void => {
	try {
		// List all tmux sessions
		const sessions = execSync("tmux list-sessions -F '#{session_name}'", {
			encoding: "utf8",
			stdio: "pipe",
		}).trim().split("\n");
		
		// Kill any sessions that match our prefix
		for (const session of sessions) {
			if (session.startsWith(sessionPrefix)) {
				try {
					execSync(`tmux kill-session -t "${session}"`, {
						stdio: "pipe",
					});
				} catch {
					// Ignore errors if kill fails
				}
			}
		}
	} catch {
		// No tmux sessions exist or tmux is not running, which is fine
	}
};