import path from "node:path";
import { Box, Text, useInput } from "ink";
import * as React from "react";
import { MENU_OPTIONS } from "../constants.js";
import type { Session } from "../types.js";
import { formatWorktreeDisplayName } from "../utils/gitUtils.js";

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
	error?: string | null;
}

// Sort sessions by priority: Awaiting Input > Idle > Running
// Within same status, sort by oldest lastUpdated first
const sortSessions = (sessions: Session[]): Session[] => {
	const statusPriority: Record<Session["status"], number> = {
		"Awaiting Input": 0,
		Idle: 1,
		Running: 2,
	};

	return [...sessions].sort((a, b) => {
		// First, sort by status priority
		const statusDiff = statusPriority[a.status] - statusPriority[b.status];
		if (statusDiff !== 0) {
			return statusDiff;
		}

		// If same status, sort by lastUpdated (oldest first)
		return a.lastUpdated.getTime() - b.lastUpdated.getTime();
	});
};

export const Menu: React.FC<MenuProps> = ({ onSelect, sessions, error }) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	// Get display text for menu options
	const getOptionDisplayText = (option: string): string => {
		switch (option) {
			case MENU_OPTIONS.START_NEW_SESSION:
				return "start new session";
			case MENU_OPTIONS.MANAGE_WORKTREES:
				return "manage worktrees";
			case MENU_OPTIONS.EXIT:
				return "exit";
			default:
				return option;
		}
	};

	// Format timestamp to show relative time
	const formatTimestamp = (date: Date): string => {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return "just now";
	};

	// Build options array: start new session, manage worktrees, sessions, exit
	const options = React.useMemo(() => {
		const result: string[] = [
			MENU_OPTIONS.START_NEW_SESSION,
			MENU_OPTIONS.MANAGE_WORKTREES,
		];
		// Sort sessions before adding them to the menu
		const sortedSessions = sortSessions(sessions);
		for (const session of sortedSessions) {
			result.push(session.id);
		}
		result.push(MENU_OPTIONS.EXIT);
		return result;
	}, [sessions]);

	useInput((input, key) => {
		if (key.upArrow || (key.ctrl && input === "p")) {
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow || (key.ctrl && input === "n")) {
			setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		}
		if (key.return) {
			const option = options[selectedIndex];
			if (option) {
				onSelect(option);
			}
		}
	});

	return (
		<Box flexDirection="column">
			{error && (
				<Box marginBottom={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}
			{options.map((option, index) => (
				<Box key={option}>
					<Text color={selectedIndex === index ? "green" : undefined}>
						{selectedIndex === index ? "▶ " : "  "}
						{getOptionDisplayText(option)}
						{option !== MENU_OPTIONS.START_NEW_SESSION &&
							option !== MENU_OPTIONS.MANAGE_WORKTREES &&
							option !== MENU_OPTIONS.EXIT &&
							(() => {
								const session = sessions.find((s) => s.id === option);
								if (session) {
									const statusColor =
										session.status === "Awaiting Input"
											? "yellow"
											: session.status === "Running"
												? "cyan"
												: "dim";
									const timestamp = formatTimestamp(session.lastUpdated);
									const workingDirDisplay = session.workingDirectory
										? path.basename(session.workingDirectory)
										: "";
									const repoDisplay = session.repoName || workingDirDisplay;

									// Format display based on whether it's main worktree or not
									let branchDisplay: string;
									if (session.branch && session.workingDirectory) {
										branchDisplay = formatWorktreeDisplayName(
											repoDisplay,
											session.branch,
											session.workingDirectory,
										);
									} else if (session.branch) {
										branchDisplay = `${repoDisplay}:${session.branch}`;
									} else {
										branchDisplay = repoDisplay;
									}
									return (
										<>
											{" "}
											[
											<Text color={statusColor} key={`status-${session.id}`}>
												{session.status}
											</Text>
											] ({timestamp}) {branchDisplay}
											{session.settingsName ? ` [${session.settingsName}]` : ""}
											{session.preview ? ` - ${session.preview}` : ""}
										</>
									);
								}
								return "";
							})()}
					</Text>
				</Box>
			))}
		</Box>
	);
};
