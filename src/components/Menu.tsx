import path from "node:path";
import { Box, Text, useInput } from "ink";
import * as React from "react";
import { MENU_OPTIONS } from "../constants.js";
import type { Session } from "../types.js";

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
}

export const Menu: React.FC<MenuProps> = ({ onSelect, sessions }) => {
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
		for (const session of sessions) {
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
									return (
										<>
											{" "}
											[
											<Text color={statusColor} key={`status-${session.id}`}>
												{session.status}
											</Text>
											] ({timestamp}) {workingDirDisplay}:
											{session.settingsName || ""}
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
