import * as React from "react";
import { Box, Text, useInput } from "ink";
import { MENU_OPTIONS } from "./constants.js";
import type { Session } from "./types.js";

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
}

// Session preview character limit
const SESSION_PREVIEW_LENGTH = 200;

const FILTER_PATTERNS = [
	// UI elements
	"│ ",
	" │",
	"╭",
	"╮",
	"╰",
	"╯",
	// Hint patterns
	"use /ide to connect to your ide",
	"esc to interrupt",
	"※ tip:",
	"? for shortcuts",
	"auto-accept edits on",
	"plan mode on",
];

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

	// Get session status based on recent output
	const getSessionStatus = (session: Session): string => {
		if (session.outputs.length === 0) return "Idle";

		// Get last 100 lines of output
		const fullOutput = Buffer.concat(session.outputs.slice(-100)).toString();
		const lines = fullOutput.split("\n");
		const recentLines = lines.slice(-100).join("\n");
		const cleanOutput = stripAnsi(recentLines);

		// Check for common patterns that indicate a running process
		// Look for spinner patterns, progress indicators, or common running messages
		const runningPatterns = [
			"esc to interrupt",
			"ctrl+c to stop",
			"press any key to stop",
			"running",
			"processing",
			"⠋",
			"⠙",
			"⠹",
			"⠸",
			"⠼",
			"⠴",
			"⠦",
			"⠧",
			"⠇",
			"⠏", // spinner characters
			"█",
			"▓",
			"▒",
			"░", // progress bar characters
		];

		for (const pattern of runningPatterns) {
			if (cleanOutput.toLowerCase().includes(pattern.toLowerCase())) {
				return "Running";
			}
		}

		// Check for input prompts
		const inputPatterns = [
			"Do you want",
			"Would you like",
			"Enter",
			"Please choose",
			"Select",
			"Continue?",
			"(y/n)",
			"(yes/no)",
			"?",
		];

		for (const pattern of inputPatterns) {
			if (cleanOutput.includes(pattern)) {
				return "Awaiting Input";
			}
		}

		// Check if the last line ends with a colon or question mark (common prompt indicators)
		const lastLine = lines[lines.length - 1];
		if (
			lastLine &&
			(lastLine.trim().endsWith(":") || lastLine.trim().endsWith("?"))
		) {
			return "Awaiting Input";
		}

		return "Idle";
	};

	// Extract last 50 characters from session outputs, filtering out input prompts and hints
	const getSessionPreview = (session: Session): string => {
		if (session.outputs.length === 0) return "";

		// Concatenate all outputs
		const fullOutput = Buffer.concat(session.outputs).toString();

		// Strip ANSI escape sequences
		const cleanOutput = stripAnsi(fullOutput);

		// Split into lines to filter out input prompts and hints
		const lines = cleanOutput.split("\n");

		// Filter out lines that contain input prompts, hints, or common interactive elements
		const filteredLines = lines.filter((line) => {
			const trimmedLine = line.trim();
			// Skip empty lines
			if (!trimmedLine) return false;

			const lowerLine = trimmedLine.toLowerCase();

			// Filter out patterns
			if (
				FILTER_PATTERNS.some((pattern) =>
					lowerLine.includes(pattern.toLowerCase()),
				)
			) {
				return false;
			}

			return true;
		});

		// Join filtered lines and normalize whitespace
		const filteredOutput = filteredLines.join(" ").replace(/\s+/g, " ").trim();

		// Get last characters based on the defined limit
		if (filteredOutput.length <= SESSION_PREVIEW_LENGTH) {
			return filteredOutput;
		}
		return `…${filteredOutput.slice(-SESSION_PREVIEW_LENGTH)}`;
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
									const status = getSessionStatus(session);
									const statusColor =
										status === "Awaiting Input"
											? "yellow"
											: status === "Running"
												? "cyan"
												: "dim";
									const preview = getSessionPreview(session);
									const timestamp = formatTimestamp(session.lastUpdated);
									return (
										<>
											{" "}
											({timestamp}) [<Text color={statusColor}>{status}</Text>]
											{preview ? ` - ${preview}` : ""}
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
