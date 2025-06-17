import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execAsync = promisify(exec);

export interface Worktree {
	path: string;
	branch: string;
	isCurrentWorktree: boolean;
	isBare: boolean;
	isMainWorktree: boolean;
}

export interface WorktreeStatus {
	hasUncommittedChanges: boolean;
	hasUntrackedFiles: boolean;
}

export async function getWorktreesAsync(): Promise<Worktree[]> {
	try {
		const { stdout } = await execAsync("git worktree list --porcelain");
		const worktrees: Worktree[] = [];
		const lines = stdout.trim().split("\n");

		let currentWorktree: Partial<Worktree> = {};

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				if (currentWorktree.path) {
					worktrees.push(currentWorktree as Worktree);
				}
				currentWorktree = {
					path: line.substring(9),
					isCurrentWorktree: false,
					isBare: false,
					isMainWorktree: false,
				};
			} else if (line.startsWith("branch ")) {
				currentWorktree.branch = line.substring(7);
			} else if (line === "bare") {
				currentWorktree.isBare = true;
			} else if (line === "detached") {
				currentWorktree.branch = "(detached HEAD)";
			}
		}

		if (currentWorktree.path) {
			worktrees.push(currentWorktree as Worktree);
		}

		// Get current worktree
		const { stdout: currentPath } = await execAsync(
			"git rev-parse --show-toplevel",
		);
		const currentWorktreePath = currentPath.trim();

		// Get main worktree
		const { stdout: gitDir } = await execAsync(
			"git rev-parse --git-common-dir",
		);
		const mainWorktreePath = gitDir.trim().replace(/\/.git$/, "");

		// Mark current and main worktrees
		for (const worktree of worktrees) {
			worktree.isCurrentWorktree = worktree.path === currentWorktreePath;
			worktree.isMainWorktree = worktree.path === mainWorktreePath;
		}

		return worktrees;
	} catch (error) {
		throw new Error(
			`Failed to get worktrees: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function getWorktreeStatus(
	worktreePath: string,
): Promise<WorktreeStatus> {
	try {
		const { stdout } = await execAsync(
			`git -C "${worktreePath}" status --porcelain`,
		);
		const lines = stdout.trim().split("\n").filter(Boolean);

		let hasUncommittedChanges = false;
		let hasUntrackedFiles = false;

		for (const line of lines) {
			const status = line.substring(0, 2);
			if (status === "??") {
				hasUntrackedFiles = true;
			} else {
				hasUncommittedChanges = true;
			}
		}

		return { hasUncommittedChanges, hasUntrackedFiles };
	} catch (error) {
		// If we can't get status, return unknown state
		return { hasUncommittedChanges: false, hasUntrackedFiles: false };
	}
}

export async function deleteWorktree(
	worktreePath: string,
	force = false,
): Promise<void> {
	try {
		const command = force
			? `git worktree remove "${worktreePath}" --force`
			: `git worktree remove "${worktreePath}"`;
		await execAsync(command);
	} catch (error) {
		throw new Error(
			`Failed to delete worktree: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function deleteAllWorktrees(): Promise<{
	deleted: string[];
	errors: string[];
}> {
	const results: { deleted: string[]; errors: string[] } = {
		deleted: [],
		errors: [],
	};

	try {
		const worktrees = await getWorktreesAsync();
		const worktreesToDelete = worktrees.filter(
			(w) => !w.isMainWorktree && !w.isCurrentWorktree,
		);

		for (const worktree of worktreesToDelete) {
			try {
				const status = await getWorktreeStatus(worktree.path);
				await deleteWorktree(worktree.path, status.hasUncommittedChanges);
				results.deleted.push(worktree.path);
			} catch (error) {
				results.errors.push(
					`${worktree.path}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		return results;
	} catch (error) {
		throw new Error(
			`Failed to delete all worktrees: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Legacy interface for compatibility with existing code
export interface GitWorktree {
	path: string;
	branch: string;
}

export function isGitRepo(): boolean {
	try {
		execSync("git rev-parse --git-dir", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

export function getGitRoot(): string | null {
	try {
		const result = execSync("git rev-parse --show-toplevel", {
			encoding: "utf8",
		});
		return result.trim();
	} catch {
		return null;
	}
}

export function getWorktreeDisplayName(worktree: GitWorktree): string {
	if (worktree.branch.startsWith("refs/heads/")) {
		return worktree.branch.substring(11);
	}
	return worktree.branch;
}

export function createWorktree(branchName: string): string {
	const worktreePath = path.join("..", branchName);

	try {
		// Create the worktree with a new branch
		execSync(`git worktree add -b ${branchName} "${worktreePath}"`, {
			encoding: "utf8",
		});

		// Get the absolute path of the created worktree
		const absolutePath = path.resolve(worktreePath);
		return absolutePath;
	} catch (error) {
		throw new Error(
			`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Legacy synchronous getWorktrees function for compatibility
export function getWorktrees(gitRoot: string): GitWorktree[] {
	try {
		const output = execSync("git worktree list --porcelain", {
			encoding: "utf8",
			cwd: gitRoot,
		});

		const worktrees: GitWorktree[] = [];
		const lines = output.trim().split("\n");
		let currentWorktree: Partial<GitWorktree> = {};

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				if (currentWorktree.path) {
					worktrees.push(currentWorktree as GitWorktree);
				}
				currentWorktree = {
					path: line.substring(9),
				};
			} else if (line.startsWith("branch ")) {
				currentWorktree.branch = line.substring(7);
			} else if (line === "detached") {
				currentWorktree.branch = "(detached HEAD)";
			}
		}

		if (currentWorktree.path) {
			worktrees.push(currentWorktree as GitWorktree);
		}

		return worktrees;
	} catch (error) {
		return [];
	}
}
