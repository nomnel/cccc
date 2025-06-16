import * as React from "react";
import { Box, Text, useInput } from "ink";
import { MENU_OPTIONS } from "./constants.js";
import type { Session } from "./types.js";
import path from "node:path";

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
}


export const Menu: React.FC<MenuProps> = ({ onSelect, sessions }) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);

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


	// Build options array: start, worktree, sessions, exit
	const options = React.useMemo(() => {
		const result: string[] = [MENU_OPTIONS.START, MENU_OPTIONS.WORKTREE];
		for (const session of sessions) {
			result.push(session.id);
		}
		result.push(MENU_OPTIONS.EXIT);
		return result;
	}, [sessions]);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow) {
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
						{option}
						{option !== MENU_OPTIONS.START &&
							option !== MENU_OPTIONS.WORKTREE &&
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
										? ` [${path.basename(session.workingDirectory)}]`
										: "";
									return (
										<>
											{" "}
											({timestamp}) [<Text color={statusColor} key={`status-${session.id}`}>{session.status}</Text>]
											{workingDirDisplay}
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
