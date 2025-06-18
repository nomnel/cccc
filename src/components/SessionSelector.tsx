import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import * as React from "react";
import {
	type GitWorktree,
	getGitRoot,
	getWorktreeDisplayName,
	getWorktrees,
	isGitRepo,
} from "../utils/gitUtils.js";

interface SessionSelectorProps {
	onSelectNewBranch: (branchName: string) => void;
	onSelectWorktree: (worktreePath: string) => void;
	onBack: () => void;
}

type MenuOption =
	| { type: "create-new" }
	| { type: "worktree"; worktree: GitWorktree }
	| { type: "back" };

export const SessionSelector: React.FC<SessionSelectorProps> = ({
	onSelectNewBranch,
	onSelectWorktree,
	onBack,
}) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [worktrees, setWorktrees] = React.useState<GitWorktree[]>([]);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);
	const [isCreatingBranch, setIsCreatingBranch] = React.useState(false);
	const [branchName, setBranchName] = React.useState("");
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
		const result: MenuOption[] = [{ type: "create-new" }];

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

		onSelectNewBranch(trimmedValue);
	};

	useInput((input, key) => {
		if (isCreatingBranch) {
			if (key.escape) {
				setIsCreatingBranch(false);
				setBranchName("");
				setBranchError(null);
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
				setIsCreatingBranch(true);
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

	if (isCreatingBranch) {
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
