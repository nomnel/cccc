import * as React from "react";
import { Box, Text, useInput } from "ink";
import { MENU_OPTIONS } from "./constants.js";
import type { Session } from "./types.js";

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
}

// Session preview character limit
const SESSION_PREVIEW_LENGTH = 50;

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

	// Strip ANSI escape sequences from text
	const stripAnsi = (text: string): string => {
		// Remove ANSI escape sequences
		// Matches:
		// - CSI sequences: ESC [ ... m
		// - OSC sequences: ESC ] ... ST/BEL
		// - Other escape sequences
		return text.replace(
			// biome-ignore lint/suspicious/noControlCharactersInRegex: This regex is specifically designed to match and remove ANSI escape sequences
			/[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
			"",
		);
	};

	// Extract last 50 characters from session outputs
	const getSessionPreview = (session: Session): string => {
		if (session.outputs.length === 0) return "";

		// Concatenate all outputs
		const fullOutput = Buffer.concat(session.outputs).toString();

		// Strip ANSI escape sequences
		const cleanOutput = stripAnsi(fullOutput);

		// Replace consecutive whitespace characters with single space
		const normalizedOutput = cleanOutput.replace(/\s+/g, " ");

		// Get last characters based on the defined limit
		if (normalizedOutput.length <= SESSION_PREVIEW_LENGTH) {
			return normalizedOutput;
		}
		return `…${normalizedOutput.slice(-SESSION_PREVIEW_LENGTH)}`;
	};

	// Build options array: start, sessions, exit
	const options = React.useMemo(() => {
		const result: string[] = [MENU_OPTIONS.START];
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
							option !== MENU_OPTIONS.EXIT &&
							(() => {
								const session = sessions.find((s) => s.id === option);
								if (session) {
									const preview = getSessionPreview(session);
									const timestamp = formatTimestamp(session.lastUpdated);
									return ` (${timestamp})${preview ? ` - ${preview}` : ""}`;
								}
								return "";
							})()}
					</Text>
				</Box>
			))}
		</Box>
	);
};
