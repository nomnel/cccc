import * as React from "react";
import { Box, Text, useInput } from "ink";
import stripAnsi from "strip-ansi";
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
].map((pattern) => pattern.toLowerCase());

const RUNNING_PATTERNS = ["esc to interrupt"];
const AWAITING_INPUT_PATTERNS = ["│ do you want", "│ would you like"];

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

	// Get session status based on recent output
	const getSessionStatus = (session: Session): string => {
		if (session.outputs.length === 0) return "Idle";

		// Get last 100 lines of output
		const recentOutput = Buffer.concat(session.outputs.slice(-100)).toString();
		const cleanOutput = stripAnsi(recentOutput);

		const lines = cleanOutput.split("\n");

		// Check if the last line ends with a colon or question mark (common prompt indicators)
		const lastLine = lines[lines.length - 1]?.trim();
		if (lastLine && (lastLine.endsWith(":") || lastLine.endsWith("?"))) {
			return "Awaiting Input";
		}

		for (const line of lines.reverse()) {
			const normalized = line.trim().toLowerCase();

			if (RUNNING_PATTERNS.some((pattern) => normalized.includes(pattern))) {
				return "Running";
			}

			if (
				AWAITING_INPUT_PATTERNS.some((pattern) => normalized.includes(pattern))
			) {
				return "Awaiting Input";
			}
		}

		return "Idle";
	};

	// Extract last 50 characters from session outputs, filtering out input prompts and hints
	const getSessionPreview = (session: Session): string => {
		if (session.outputs.length === 0) return "";

		const recentOutput = Buffer.concat(session.outputs.slice(-10)).toString();
		const cleanOutput = stripAnsi(recentOutput);

		// Filter out lines that contain input prompts, hints, or common interactive elements
		const lines = cleanOutput.split("\n").filter((line) => {
			const trimmedLine = line.trim();
			if (!trimmedLine) return false;

			const lowerLine = trimmedLine.toLowerCase();
			// FILTER_PATTERNS has already been converted to lowercase
			return FILTER_PATTERNS.every((pattern) => !lowerLine.includes(pattern));
		});

		// Join filtered lines and normalize whitespace
		const preview = lines.join(" ").replace(/\s+/g, " ").trim();

		// Get last characters based on the defined limit
		if (preview.length <= SESSION_PREVIEW_LENGTH) {
			return preview;
		}
		return `…${preview.slice(-SESSION_PREVIEW_LENGTH)}`;
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
