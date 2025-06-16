import * as React from "react";
import { Box, Text, useInput } from "ink";
import {
	getWorktrees,
	getWorktreeDisplayName,
	isGitRepo,
	getGitRoot,
	type GitWorktree,
} from "./utils/gitUtils.js";

interface WorktreeMenuProps {
	onSelect: (worktreePath: string) => void;
	onBack: () => void;
}

export const WorktreeMenu: React.FC<WorktreeMenuProps> = ({
	onSelect,
	onBack,
}) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [worktrees, setWorktrees] = React.useState<GitWorktree[]>([]);
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(true);

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
				if (foundWorktrees.length === 0) {
					setError("No worktrees found");
					return;
				}

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

	// Build options array: worktrees + back
	const options = React.useMemo(() => {
		const result: string[] = [];
		for (const worktree of worktrees) {
			result.push(worktree.path);
		}
		result.push("← Back to main menu");
		return result;
	}, [worktrees]);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		}
		if (key.return) {
			const option = options[selectedIndex];
			if (option === "← Back to main menu") {
				onBack();
			} else if (option) {
				onSelect(option);
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

	return (
		<Box flexDirection="column">
			<Text color="blue" bold>
				Select a Git Worktree:
			</Text>
			<Text color="dim">
				Use ↑/↓ to navigate, Enter to select, Esc to go back
			</Text>
			<Text> </Text>
			{options.map((option, index) => {
				const isSelected = selectedIndex === index;
				const isBackOption = option === "← Back to main menu";

				if (isBackOption) {
					return (
						<Box key={option}>
							<Text color={isSelected ? "green" : "dim"}>
								{isSelected ? "▶ " : "  "}
								{option}
							</Text>
						</Box>
					);
				}

				// Find the corresponding worktree
				const worktree = worktrees.find((w) => w.path === option);
				if (!worktree) return null;

				const displayName = getWorktreeDisplayName(worktree);

				return (
					<Box key={option}>
						<Text color={isSelected ? "green" : undefined}>
							{isSelected ? "▶ " : "  "}
							{displayName}
						</Text>
						{isSelected && <Text color="dim"> → {worktree.path}</Text>}
					</Box>
				);
			})}
		</Box>
	);
};
