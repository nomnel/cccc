import { exec, execSync } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

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

export function isGitRepo(cwd?: string): boolean {
	try {
		const options: { stdio: "ignore"; cwd?: string } = { stdio: "ignore" };
		if (cwd) {
			options.cwd = cwd;
		}
		execSync("git rev-parse --git-dir", options);
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

export function createWorktree(branchName: string, cwd?: string): string {
	// Get the git directory
	const gitDirOptions: { encoding: "utf8"; cwd?: string } = {
		encoding: "utf8",
	};
	if (cwd) {
		gitDirOptions.cwd = cwd;
	}
	const gitDir = execSync("git rev-parse --git-dir", gitDirOptions).trim();

	// Create path under .git/worktrees/
	const worktreePath = path.join(gitDir, "worktrees", branchName);

	try {
		// Create the worktree with a new branch
		const worktreeOptions: { encoding: "utf8"; cwd?: string } = {
			encoding: "utf8",
		};
		if (cwd) {
			worktreeOptions.cwd = cwd;
		}
		execSync(
			`git worktree add -b ${branchName} "${worktreePath}"`,
			worktreeOptions,
		);

		// Get the absolute path of the created worktree
		// If we have a cwd, resolve relative to it
		const absolutePath = cwd
			? path.resolve(cwd, worktreePath)
			: path.resolve(worktreePath);
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

export interface GitRef {
	name: string;
	type: "branch" | "tag";
}

export function getBranchesAndTags(cwd?: string): GitRef[] {
	try {
		const refs: GitRef[] = [];
		const options: { encoding: "utf8"; cwd?: string } = { encoding: "utf8" };
		if (cwd) {
			options.cwd = cwd;
		}

		// Get all branches
		const branchesOutput = execSync(
			"git branch -a --format='%(refname:short)'",
			options,
		);
		const branches = branchesOutput.trim().split("\n").filter(Boolean);
		for (const branch of branches) {
			// Skip remote tracking branches
			if (!branch.startsWith("remotes/")) {
				refs.push({ name: branch, type: "branch" });
			}
		}

		// Get all tags
		const tagsOutput = execSync("git tag -l", options);
		const tags = tagsOutput.trim().split("\n").filter(Boolean);
		for (const tag of tags) {
			refs.push({ name: tag, type: "tag" });
		}

		return refs;
	} catch (error) {
		return [];
	}
}

export function createWorktreeFromRef(
	branchName: string,
	baseBranch: string,
	cwd?: string,
): string {
	// Get the git directory
	const gitDirOptions: { encoding: "utf8"; cwd?: string } = {
		encoding: "utf8",
	};
	if (cwd) {
		gitDirOptions.cwd = cwd;
	}
	const gitDir = execSync("git rev-parse --git-dir", gitDirOptions).trim();

	// Create path under .git/worktrees/
	const worktreePath = path.join(gitDir, "worktrees", branchName);

	try {
		// Create the worktree with a new branch based on the specified ref
		const worktreeOptions: { encoding: "utf8"; cwd?: string } = {
			encoding: "utf8",
		};
		if (cwd) {
			worktreeOptions.cwd = cwd;
		}
		execSync(
			`git worktree add -b ${branchName} "${worktreePath}" ${baseBranch}`,
			worktreeOptions,
		);

		// Get the absolute path of the created worktree
		// If we have a cwd, resolve relative to it
		const absolutePath = cwd
			? path.resolve(cwd, worktreePath)
			: path.resolve(worktreePath);
		return absolutePath;
	} catch (error) {
		throw new Error(
			`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export function getCurrentBranch(workingDirectory?: string): string | null {
	try {
		const options = workingDirectory
			? { encoding: "utf8" as const, cwd: workingDirectory }
			: { encoding: "utf8" as const };
		const branch = execSync("git rev-parse --abbrev-ref HEAD", options).trim();
		return branch === "HEAD" ? "(detached HEAD)" : branch;
	} catch {
		return null;
	}
}

export function getRepositoryName(workingDirectory?: string): string | null {
	try {
		const options = workingDirectory
			? { encoding: "utf8" as const, cwd: workingDirectory }
			: { encoding: "utf8" as const };

		// Try to get the remote origin URL
		const remoteUrl = execSync(
			"git config --get remote.origin.url",
			options,
		).trim();

		if (!remoteUrl) {
			// If no remote, try to get the repository name from the directory
			const gitRoot = workingDirectory || getGitRoot();
			return gitRoot ? path.basename(gitRoot) : null;
		}

		// Extract repository name from URL
		// Handle SSH format: git@github.com:user/repo.git
		// Handle HTTPS format: https://github.com/user/repo.git
		// Handle other formats: https://gitlab.com/user/repo, etc.

		let repoName: string;

		if (remoteUrl.startsWith("git@")) {
			// SSH format
			const parts = remoteUrl.split(":");
			if (parts.length === 2 && parts[1]) {
				repoName = parts[1];
			} else {
				return null;
			}
		} else if (
			remoteUrl.startsWith("http://") ||
			remoteUrl.startsWith("https://")
		) {
			// HTTPS format
			const urlParts = remoteUrl.split("/");
			repoName = urlParts.slice(-2).join("/");
		} else {
			// Unknown format, try to extract the last part
			const lastPart = remoteUrl.split("/").pop();
			if (!lastPart) {
				return null;
			}
			repoName = lastPart;
		}

		// Remove .git extension if present
		if (repoName.endsWith(".git")) {
			repoName = repoName.slice(0, -4);
		}

		// For paths like "user/repo", return just the repo name
		// For paths like "repo", return as is
		const parts = repoName.split("/");
		const finalName = parts[parts.length - 1];
		return finalName || null;
	} catch {
		// If git commands fail, return null
		// We don't want to fallback to directory name if it's not a git repo
		return null;
	}
}
