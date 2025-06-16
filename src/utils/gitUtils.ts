import { execSync } from "node:child_process";
import path from "node:path";

export interface GitWorktree {
	path: string;
	branch: string;
	commit: string;
	bare?: boolean;
}

/**
 * Check if the current directory is a git repository
 */
export const isGitRepo = (cwd: string = process.cwd()): boolean => {
	try {
		execSync("git rev-parse --is-inside-work-tree", {
			cwd,
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
};

/**
 * Get the root directory of the git repository
 */
export const getGitRoot = (cwd: string = process.cwd()): string | null => {
	try {
		const result = execSync("git rev-parse --show-toplevel", {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		return result.trim();
	} catch {
		return null;
	}
};

/**
 * Get all git worktrees
 */
export const getWorktrees = (cwd: string = process.cwd()): GitWorktree[] => {
	try {
		const result = execSync("git worktree list --porcelain", {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});

		const worktrees: GitWorktree[] = [];
		const lines = result.trim().split("\n");
		let currentWorktree: Partial<GitWorktree> = {};

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				// If we have a previous worktree, save it
				if (currentWorktree.path) {
					worktrees.push(currentWorktree as GitWorktree);
				}
				// Start new worktree
				currentWorktree = {
					path: line.substring("worktree ".length),
				};
			} else if (line.startsWith("HEAD ")) {
				currentWorktree.commit = line.substring("HEAD ".length);
			} else if (line.startsWith("branch ")) {
				currentWorktree.branch = line.substring("branch ".length);
			} else if (line === "bare") {
				currentWorktree.bare = true;
			} else if (line.startsWith("detached")) {
				currentWorktree.branch = `(detached at ${currentWorktree.commit?.substring(0, 7) || "unknown"})`;
			}
		}

		// Add the last worktree
		if (currentWorktree.path) {
			worktrees.push(currentWorktree as GitWorktree);
		}

		return worktrees;
	} catch (error) {
		throw new Error(`Failed to get worktrees: ${error instanceof Error ? error.message : String(error)}`);
	}
};

/**
 * Get display name for a worktree
 */
export const getWorktreeDisplayName = (worktree: GitWorktree): string => {
	const dirname = path.basename(worktree.path);
	const branch = worktree.branch || "unknown";
	return `${dirname} (${branch})`;
};

/**
 * Get relative path from git root
 */
export const getRelativePath = (absolutePath: string, gitRoot: string): string => {
	return path.relative(gitRoot, absolutePath) || ".";
};

/**
 * Sanitize branch name to be used as a directory name
 */
export const sanitizeBranchNameForDirectory = (branchName: string): string => {
	// Replace directory-unsafe characters with hyphens
	return branchName
		.replace(/[^\w\-\.]/g, "-") // Replace any non-word chars (except - and .) with -
		.replace(/\/+/g, "-") // Replace slashes with hyphens
		.replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
		.replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

/**
 * Check if a worktree already exists
 */
export const worktreeExists = (worktreePath: string, cwd: string = process.cwd()): boolean => {
	const worktrees = getWorktrees(cwd);
	return worktrees.some(wt => wt.path === worktreePath);
};

/**
 * Create a new git worktree
 */
export const createWorktree = (branchName: string, cwd: string = process.cwd()): string => {
	const gitRoot = getGitRoot(cwd);
	if (!gitRoot) {
		throw new Error("Not in a git repository");
	}

	const sanitizedDirName = sanitizeBranchNameForDirectory(branchName);
	const worktreePath = path.join(gitRoot, ".git", "worktree", sanitizedDirName);

	// Check if worktree already exists
	if (worktreeExists(worktreePath, cwd)) {
		throw new Error(`Worktree already exists at: ${worktreePath}`);
	}

	try {
		// Check if branch already exists
		try {
			execSync(`git rev-parse --verify ${branchName}`, {
				cwd,
				stdio: "ignore",
			});
			// Branch exists, create worktree with existing branch
			execSync(`git worktree add "${worktreePath}" "${branchName}"`, {
				cwd,
				stdio: ["ignore", "pipe", "pipe"],
			});
		} catch {
			// Branch doesn't exist, create new branch with worktree
			execSync(`git worktree add -b "${branchName}" "${worktreePath}"`, {
				cwd,
				stdio: ["ignore", "pipe", "pipe"],
			});
		}

		return worktreePath;
	} catch (error) {
		throw new Error(`Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`);
	}
};