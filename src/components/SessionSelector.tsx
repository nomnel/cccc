import * as path from "node:path";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import * as React from "react";
import { listRepositories } from "../utils/configUtils.js";
import {
	type GitRef,
	type GitWorktree,
	formatWorktreeDisplayName,
	getBranchesAndTags,
	getGitRoot,
	getRepositoryName,
	getWorktreeDisplayName,
	getWorktreePath,
	getWorktrees,
	isGitRepo,
} from "../utils/gitUtils.js";

// Type for repository with its worktrees
interface RepositoryWorktrees {
	repositoryPath: string;
	repositoryName: string;
	worktrees: GitWorktree[];
	branchesAndTags: GitRef[];
}

interface SessionSelectorProps {
	onSelectNewBranch: (branchName: string, repositoryPath: string) => void;
	onSelectNewBranchFromRef: (
		branchName: string,
		baseBranch: string,
		repositoryPath: string,
	) => void;
	onSelectWorktree: (worktreePath: string) => void;
	onBack: () => void;
}

type MenuOption =
	| { type: "repo-header"; repositoryName: string }
	| { type: "create-new"; repositoryPath: string; repositoryName: string }
	| { type: "create-new-from"; repositoryPath: string; repositoryName: string }
	| {
			type: "worktree";
			worktree: GitWorktree;
			repositoryPath: string;
			repositoryName: string;
	  }
	| { type: "back" };

type BranchSelectionMode =
	| "none"
	| "create-new"
	| "select-base"
	| "create-new-from";

export const SessionSelector: React.FC<SessionSelectorProps> = ({
	onSelectNewBranch,
	onSelectNewBranchFromRef,
	onSelectWorktree,
	onBack,
}) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [repositories, setRepositories] = React.useState<RepositoryWorktrees[]>(
		[],
	);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [branchMode, setBranchMode] =
		React.useState<BranchSelectionMode>("none");
	const [branchName, setBranchName] = React.useState("");
	const [selectedBaseIndex, setSelectedBaseIndex] = React.useState(0);
	const [selectedBaseBranch, setSelectedBaseBranch] = React.useState<
		string | null
	>(null);
	const [branchError, setBranchError] = React.useState<string | null>(null);
	const [selectedRepository, setSelectedRepository] = React.useState<
		string | null
	>(null);
	const [availableBranchesAndTags, setAvailableBranchesAndTags] =
		React.useState<GitRef[]>([]);
	const [worktreePath, setWorktreePath] = React.useState<string>("");

	// Calculate worktree path when branch name or repository changes
	React.useEffect(() => {
		if (branchName && selectedRepository) {
			try {
				const path = getWorktreePath(branchName, selectedRepository);
				setWorktreePath(path);
			} catch {
				setWorktreePath("");
			}
		} else {
			setWorktreePath("");
		}
	}, [branchName, selectedRepository]);

	// Load repositories and their worktrees on mount
	React.useEffect(() => {
		const loadRepositories = async () => {
			const originalCwd = process.cwd();

			try {
				setLoading(true);
				setError(null);

				const configuredRepos = listRepositories();
				if (configuredRepos.length === 0) {
					setError(
						"No repositories configured. Run 'cccc add <path>' to add a repository.",
					);
					return;
				}

				const repos: RepositoryWorktrees[] = [];

				for (const repo of configuredRepos) {
					try {
						// Change to repository directory
						process.chdir(repo.path);

						// Check if it's a valid git repository
						if (!isGitRepo(repo.path)) {
							continue;
						}

						// Get git root
						const gitRoot = getGitRoot();
						if (!gitRoot) {
							continue;
						}

						// Get repository name
						const repositoryName =
							getRepositoryName(gitRoot) || path.basename(repo.path);

						// Get worktrees
						const worktrees = getWorktrees(gitRoot);

						// Get branches and tags
						const branchesAndTags = getBranchesAndTags(repo.path);

						repos.push({
							repositoryPath: repo.path,
							repositoryName,
							worktrees,
							branchesAndTags,
						});
					} catch (err) {
						// Repository is invalid or inaccessible, skip it
					}
				}

				if (repos.length === 0) {
					setError("No valid git repositories found");
				} else {
					setRepositories(repos);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load repositories",
				);
			} finally {
				setLoading(false);
				// Always restore the original working directory
				process.chdir(originalCwd);
			}
		};

		loadRepositories();
	}, []);

	// Build options array
	const options = React.useMemo((): MenuOption[] => {
		const result: MenuOption[] = [];

		// Add options for each repository
		for (const repo of repositories) {
			// Add repository header
			result.push({ type: "repo-header", repositoryName: repo.repositoryName });

			// Add create options for this repository
			result.push(
				{
					type: "create-new",
					repositoryPath: repo.repositoryPath,
					repositoryName: repo.repositoryName,
				},
				{
					type: "create-new-from",
					repositoryPath: repo.repositoryPath,
					repositoryName: repo.repositoryName,
				},
			);

			// Add worktrees for this repository
			for (const worktree of repo.worktrees) {
				result.push({
					type: "worktree",
					worktree,
					repositoryPath: repo.repositoryPath,
					repositoryName: repo.repositoryName,
				});
			}
		}

		result.push({ type: "back" });
		return result;
	}, [repositories]);

	// Skip repo headers when navigating - calculate this always to maintain hook order
	const actualSelectedIndex = React.useMemo(() => {
		let selectableIndex = 0;
		for (let i = 0; i < options.length; i++) {
			const option = options[i];
			if (option && option.type !== "repo-header") {
				if (selectableIndex === selectedIndex) {
					return i;
				}
				selectableIndex++;
			}
		}
		return 0;
	}, [selectedIndex, options]);

	const handleBranchSubmit = (value: string) => {
		let trimmedValue = value.trim();

		// Generate timestamp-based branch name if empty
		if (!trimmedValue) {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, "0");
			const day = String(now.getDate()).padStart(2, "0");
			const hours = String(now.getHours()).padStart(2, "0");
			const minutes = String(now.getMinutes()).padStart(2, "0");
			const seconds = String(now.getSeconds()).padStart(2, "0");
			trimmedValue = `branch-${year}${month}${day}-${hours}${minutes}${seconds}`;
		}

		// Basic validation for branch name
		const invalidChars = /[^\w\-\.\/]/;
		if (invalidChars.test(trimmedValue)) {
			setBranchError(
				"Branch name contains invalid characters. Use only letters, numbers, hyphens, dots, and slashes.",
			);
			return;
		}

		if (branchMode === "create-new" && selectedRepository) {
			onSelectNewBranch(trimmedValue, selectedRepository);
		} else if (
			branchMode === "create-new-from" &&
			selectedBaseBranch &&
			selectedRepository
		) {
			// Create branch from the selected base
			onSelectNewBranchFromRef(
				trimmedValue,
				selectedBaseBranch,
				selectedRepository,
			);
		}
	};

	useInput((input, key) => {
		if (branchMode === "create-new") {
			if (key.escape) {
				setBranchMode("none");
				setBranchName("");
				setBranchError(null);
			}
			return;
		}

		if (branchMode === "create-new-from") {
			if (key.escape) {
				setBranchMode("select-base");
				setBranchName("");
				setBranchError(null);
			}
			return;
		}

		if (branchMode === "select-base") {
			if (key.upArrow || (key.ctrl && input === "p")) {
				setSelectedBaseIndex((prev) =>
					prev > 0 ? prev - 1 : availableBranchesAndTags.length - 1,
				);
			}
			if (key.downArrow || (key.ctrl && input === "n")) {
				setSelectedBaseIndex((prev) =>
					prev < availableBranchesAndTags.length - 1 ? prev + 1 : 0,
				);
			}
			if (key.return && availableBranchesAndTags[selectedBaseIndex]) {
				const baseBranch = availableBranchesAndTags[selectedBaseIndex].name;
				setSelectedBaseBranch(baseBranch);
				setBranchMode("create-new-from");
			}
			if (key.escape) {
				setBranchMode("none");
				setSelectedBaseIndex(0);
				setSelectedBaseBranch(null);
			}
			return;
		}

		const selectableOptions = options.filter(
			(opt) => opt.type !== "repo-header",
		);
		if (key.upArrow || (key.ctrl && input === "p")) {
			setSelectedIndex((prev) =>
				prev > 0 ? prev - 1 : selectableOptions.length - 1,
			);
		}
		if (key.downArrow || (key.ctrl && input === "n")) {
			setSelectedIndex((prev) =>
				prev < selectableOptions.length - 1 ? prev + 1 : 0,
			);
		}
		if (key.return) {
			const option = selectableOptions[selectedIndex];
			if (!option) return;

			if (option.type === "create-new") {
				setSelectedRepository(option.repositoryPath);
				setBranchMode("create-new");
			} else if (option.type === "create-new-from") {
				setSelectedRepository(option.repositoryPath);
				// Find and set the branches/tags for the selected repository
				const repo = repositories.find(
					(r) => r.repositoryPath === option.repositoryPath,
				);
				if (repo) {
					setAvailableBranchesAndTags(repo.branchesAndTags);
				}
				setBranchMode("select-base");
				setSelectedBaseIndex(0);
			} else if (option.type === "worktree") {
				onSelectWorktree(option.worktree.path);
			} else if (option.type === "back") {
				onBack();
			}
		}
		if (key.escape) {
			onBack();
		}
	});

	if (loading) {
		return (
			<Box flexDirection="column">
				<Text>Loading worktrees...</Text>
			</Box>
		);
	}

	if (error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
				<Text color="dim">Press any key to return to main menu</Text>
			</Box>
		);
	}

	if (branchMode === "create-new") {
		return (
			<Box flexDirection="column">
				<Text color="blue" bold>
					Create New Branch and Worktree
				</Text>
				<Box marginTop={1} marginBottom={1}>
					<Text>Enter branch name: </Text>
					<TextInput
						value={branchName}
						onChange={setBranchName}
						onSubmit={handleBranchSubmit}
						placeholder="feature/my-new-feature"
					/>
				</Box>
				<Box marginBottom={1}>
					<Text dimColor>Worktree path: {worktreePath || ""}</Text>
				</Box>
				{branchError && (
					<Box marginBottom={1}>
						<Text color="red">{branchError}</Text>
					</Box>
				)}
				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to create (empty for auto-generated name) • Press Escape
						to go back
					</Text>
				</Box>
			</Box>
		);
	}

	if (branchMode === "select-base") {
		return (
			<Box flexDirection="column">
				<Text color="blue" bold>
					Select base branch or tag
				</Text>
				<Text> </Text>
				{availableBranchesAndTags.map((ref, index) => {
					const isSelected = selectedBaseIndex === index;
					return (
						<Box key={`${ref.type}-${ref.name}`}>
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text color="gray">{ref.type === "branch" ? "⎇" : "◉"}</Text>{" "}
								{ref.name}
							</Text>
						</Box>
					);
				})}
				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to continue • Press Escape to go back
					</Text>
				</Box>
			</Box>
		);
	}

	if (branchMode === "create-new-from") {
		return (
			<Box flexDirection="column">
				<Text color="blue" bold>
					Create New Branch from: {selectedBaseBranch}
				</Text>
				<Box marginTop={1} marginBottom={1}>
					<Text>Enter branch name: </Text>
					<TextInput
						value={branchName}
						onChange={setBranchName}
						onSubmit={handleBranchSubmit}
						placeholder="feature/my-new-feature"
					/>
				</Box>
				<Box marginBottom={1}>
					<Text dimColor>Worktree path: {worktreePath || ""}</Text>
				</Box>
				{branchError && (
					<Box marginBottom={1}>
						<Text color="red">{branchError}</Text>
					</Box>
				)}
				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to create (empty for auto-generated name) • Press Escape
						to go back
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text color="gray">Select a repository and branch/worktree</Text>
			<Text> </Text>
			{options.map((option, index) => {
				const isSelected = actualSelectedIndex === index;

				if (option.type === "repo-header") {
					return (
						<Box
							key={`header-${option.repositoryName}`}
							marginTop={index > 0 ? 1 : 0}
						>
							<Text bold color="blue">
								{option.repositoryName}
							</Text>
						</Box>
					);
				}

				if (option.type === "create-new") {
					return (
						<Box key={`create-new-${option.repositoryPath}`} marginLeft={2}>
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text bold>+</Text> Create new worktree...
							</Text>
						</Box>
					);
				}

				if (option.type === "create-new-from") {
					return (
						<Box
							key={`create-new-from-${option.repositoryPath}`}
							marginLeft={2}
						>
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text bold>+</Text> Create new worktree from...
							</Text>
						</Box>
					);
				}

				if (option.type === "worktree") {
					const branchName = getWorktreeDisplayName(option.worktree);
					const displayText = formatWorktreeDisplayName(
						option.repositoryName,
						branchName,
						option.worktree.path,
						option.repositoryPath,
					);

					return (
						<Box key={option.worktree.path} marginLeft={2}>
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text color="gray">📁</Text> {displayText}
							</Text>
						</Box>
					);
				}

				if (option.type === "back") {
					return (
						<Box key="back" marginTop={1}>
							<Text color={isSelected ? "green" : "dim"}>
								{isSelected ? "▶ " : "  "}← Back to main menu
							</Text>
						</Box>
					);
				}

				return null;
			})}
		</Box>
	);
};
