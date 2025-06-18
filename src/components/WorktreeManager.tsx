import { Box, Text } from "ink";
import React, { useEffect, useState } from "react";
import type { Worktree, WorktreeStatus } from "../utils/gitUtils.js";
import {
	deleteWorktree,
	getWorktreeStatus,
	getWorktreesAsync,
} from "../utils/gitUtils.js";

interface WorktreeWithStatus extends Worktree {
	status?: WorktreeStatus;
}

interface WorktreeManagerProps {
	onBack: () => void;
}

export function WorktreeManager({ onBack }: WorktreeManagerProps) {
	const [worktrees, setWorktrees] = useState<WorktreeWithStatus[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	const loadWorktrees = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const trees = await getWorktreesAsync();
			const treesWithStatus = await Promise.all(
				trees.map(async (tree) => {
					const status = await getWorktreeStatus(tree.path);
					return { ...tree, status };
				}),
			);
			setWorktrees(treesWithStatus);
			setSelectedIndex(0);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load worktrees");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadWorktrees();
	}, [loadWorktrees]);

	useEffect(() => {
		const handleKeyPress = async (chunk: Buffer) => {
			const key = chunk.toString();

			if (confirmDelete) {
				if (key === "y" || key === "Y") {
					const worktree = worktrees.find((w) => w.path === confirmDelete);
					if (worktree) {
						try {
							const force = worktree.status?.hasUncommittedChanges ?? false;
							await deleteWorktree(worktree.path, force);
							setConfirmDelete(null);
							await loadWorktrees();
						} catch (err) {
							setError(
								err instanceof Error
									? err.message
									: "Failed to delete worktree",
							);
							setConfirmDelete(null);
						}
					}
				} else if (key === "n" || key === "N" || key === "\x1b") {
					setConfirmDelete(null);
				}
				return;
			}

			if (key === "\x1b[A") {
				// Up arrow
				setSelectedIndex((prev) => Math.max(0, prev - 1));
			} else if (key === "\x1b[B") {
				// Down arrow
				setSelectedIndex((prev) => Math.min(worktrees.length - 1, prev + 1));
			} else if (key === "d" || key === "D") {
				const selected = worktrees[selectedIndex];
				if (
					selected &&
					!selected.isCurrentWorktree &&
					!selected.isMainWorktree
				) {
					setConfirmDelete(selected.path);
				}
			} else if (key === "r" || key === "R") {
				await loadWorktrees();
			} else if (key === "\x1b" || key === "q" || key === "Q") {
				// Escape or Q
				onBack();
			}
		};

		process.stdin.on("data", handleKeyPress);
		return () => {
			process.stdin.off("data", handleKeyPress);
		};
	}, [worktrees, selectedIndex, confirmDelete, onBack, loadWorktrees]);

	if (loading) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text>Loading worktrees...</Text>
			</Box>
		);
	}

	if (error) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="red">Error: {error}</Text>
				<Text dimColor>Press Escape to go back</Text>
			</Box>
		);
	}

	if (confirmDelete) {
		const worktree = worktrees.find((w) => w.path === confirmDelete);
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="yellow">Delete worktree at {confirmDelete}?</Text>
				{worktree?.status?.hasUncommittedChanges && (
					<Text color="red">
						Warning: This worktree has uncommitted changes!
					</Text>
				)}
				<Text>Press Y to confirm, N to cancel</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>Git Worktree Manager</Text>
			<Text dimColor>
				Use arrow keys to navigate, D to delete, R to refresh, Escape to go back
			</Text>
			<Box marginTop={1} />

			{worktrees.length === 0 ? (
				<Text dimColor>No worktrees found</Text>
			) : (
				worktrees.map((worktree, index) => {
					const isSelected = index === selectedIndex;
					const statusColor = worktree.status?.hasUncommittedChanges
						? "yellow"
						: worktree.status?.hasUntrackedFiles
							? "cyan"
							: "green";

					return (
						<Box key={worktree.path} marginBottom={1}>
							<Text
								color={isSelected ? "blue" : undefined}
								inverse={isSelected}
							>
								{isSelected ? "▶ " : "  "}
								<Text bold>{worktree.branch || "(no branch)"}</Text>
								{worktree.isCurrentWorktree && (
									<Text color="green"> (current)</Text>
								)}
								{worktree.isMainWorktree && <Text color="cyan"> (main)</Text>}
							</Text>
							<Text dimColor> {worktree.path}</Text>
							<Text color={statusColor} dimColor>
								Status:{" "}
								{worktree.status?.hasUncommittedChanges
									? "modified"
									: worktree.status?.hasUntrackedFiles
										? "untracked files"
										: "clean"}
							</Text>
						</Box>
					);
				})
			)}
		</Box>
	);
}
