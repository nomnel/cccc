import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import * as React from "react";
import {
	type GitRef,
	type GitWorktree,
	getBranchesAndTags,
	getGitRoot,
	getWorktreeDisplayName,
	getWorktrees,
	isGitRepo,
} from "../utils/gitUtils.js";

interface SessionSelectorProps {
	onSelectNewBranch: (branchName: string) => void;
	onSelectNewBranchFromRef: (branchName: string, baseBranch: string) => void;
	onSelectWorktree: (worktreePath: string) => void;
	onBack: () => void;
}

type MenuOption =
	| { type: "create-new" }
	| { type: "create-new-from" }
	| { type: "worktree"; worktree: GitWorktree }
	| { type: "back" };

type BranchSelectionMode = "none" | "create-new" | "select-base" | "create-new-from";

export const SessionSelector: React.FC<SessionSelectorProps> = ({
	onSelectNewBranch,
	onSelectNewBranchFromRef,
	onSelectWorktree,
	onBack,
}) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [worktrees, setWorktrees] = React.useState<GitWorktree[]>([]);
	const [branchesAndTags, setBranchesAndTags] = React.useState<GitRef[]>([]);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [branchMode, setBranchMode] = React.useState<BranchSelectionMode>("none");
	const [branchName, setBranchName] = React.useState("");
	const [selectedBaseIndex, setSelectedBaseIndex] = React.useState(0);
	const [selectedBaseBranch, setSelectedBaseBranch] = React.useState<string | null>(null);
	const [branchError, setBranchError] = React.useState<string | null>(null);

	// Load worktrees on mount
	React.useEffect(() => {
		const loadWorktrees = async () => {
			try {
				setLoading(true);
				setError(null);

				// Check if we're in a git repository
				if (!isGitRepo()) {
					setError("Not in a git repository");
					return;
				}

				// Get git root to ensure we're working from the right location
				const gitRoot = getGitRoot();
				if (!gitRoot) {
					setError("Could not find git repository root");
					return;
				}

				// Get all worktrees
				const foundWorktrees = getWorktrees(gitRoot);
				setWorktrees(foundWorktrees);
				
				// Get branches and tags
				const refs = getBranchesAndTags();
				setBranchesAndTags(refs);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load worktrees",
				);
			} finally {
				setLoading(false);
			}
		};

		loadWorktrees();
	}, []);

	// Build options array
	const options = React.useMemo((): MenuOption[] => {
		const result: MenuOption[] = [
			{ type: "create-new" },
			{ type: "create-new-from" },
		];

		// Add separator (visual only, not selectable)
		for (const worktree of worktrees) {
			result.push({ type: "worktree", worktree });
		}

		result.push({ type: "back" });
		return result;
	}, [worktrees]);

	const handleBranchSubmit = (value: string) => {
		const trimmedValue = value.trim();

		if (!trimmedValue) {
			setBranchError("Branch name cannot be empty");
			return;
		}

		// Basic validation for branch name
		const invalidChars = /[^\w\-\.\/]/;
		if (invalidChars.test(trimmedValue)) {
			setBranchError(
				"Branch name contains invalid characters. Use only letters, numbers, hyphens, dots, and slashes.",
			);
			return;
		}

		if (branchMode === "create-new") {
			onSelectNewBranch(trimmedValue);
		} else if (branchMode === "create-new-from" && selectedBaseBranch) {
			// Create branch from the selected base
			onSelectNewBranchFromRef(trimmedValue, selectedBaseBranch);
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
				setSelectedBaseIndex((prev) => (prev > 0 ? prev - 1 : branchesAndTags.length - 1));
			}
			if (key.downArrow || (key.ctrl && input === "n")) {
				setSelectedBaseIndex((prev) => (prev < branchesAndTags.length - 1 ? prev + 1 : 0));
			}
			if (key.return && branchesAndTags[selectedBaseIndex]) {
				const baseBranch = branchesAndTags[selectedBaseIndex].name;
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

		if (key.upArrow || (key.ctrl && input === "p")) {
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow || (key.ctrl && input === "n")) {
			setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		}
		if (key.return) {
			const option = options[selectedIndex];
			if (!option) return;

			if (option.type === "create-new") {
				setBranchMode("create-new");
			} else if (option.type === "create-new-from") {
				setBranchMode("select-base");
				setSelectedBaseIndex(0);
			} else if (option.type === "worktree" && "worktree" in option) {
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
				{branchError && (
					<Box marginBottom={1}>
						<Text color="red">{branchError}</Text>
					</Box>
				)}
				<Box marginTop={1}>
					<Text dimColor>Press Enter to create • Press Escape to go back</Text>
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
				{branchesAndTags.map((ref, index) => {
					const isSelected = selectedBaseIndex === index;
					return (
						<Box key={`${ref.type}-${ref.name}`}>
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text color="gray">{ref.type === "branch" ? "⎇" : "◉"}</Text> {ref.name}
							</Text>
						</Box>
					);
				})}
				<Box marginTop={1}>
					<Text dimColor>Press Enter to continue • Press Escape to go back</Text>
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
				{branchError && (
					<Box marginBottom={1}>
						<Text color="red">{branchError}</Text>
					</Box>
				)}
				<Box marginTop={1}>
					<Text dimColor>Press Enter to create • Press Escape to go back</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text color="gray">Select a branch or tag to checkout</Text>
			<Text> </Text>
			{options.map((option, index) => {
				const isSelected = selectedIndex === index;

				if (option.type === "create-new") {
					return (
						<Box key="create-new">
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text bold>+</Text> Create new branch...
							</Text>
						</Box>
					);
				}
				
				if (option.type === "create-new-from") {
					return (
						<Box key="create-new-from">
							<Text color={isSelected ? "green" : undefined}>
								{isSelected ? "▶ " : "  "}
								<Text bold>+</Text> Create new branch from...
							</Text>
						</Box>
					);
				}

				if (option.type === "worktree") {
					const displayName = getWorktreeDisplayName(option.worktree);
					const isFirstWorktree = index === 1; // After create-new

					return (
						<Box key={option.worktree.path} flexDirection="column">
							{isFirstWorktree && (
								<Box>
									<Text> </Text>
									<Text color="gray" dimColor>
										branches
									</Text>
								</Box>
							)}
							<Box>
								<Text color={isSelected ? "green" : undefined}>
									{isSelected ? "▶ " : "  "}
									<Text color="gray">⎇</Text> {displayName}{" "}
									<Text color="dim">{option.worktree.branch}</Text>
								</Text>
								{isSelected && (
									<Text color="dim"> → {option.worktree.path}</Text>
								)}
							</Box>
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
