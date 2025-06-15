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

	// Extract last 50 characters from session outputs
	const getSessionPreview = (session: Session): string => {
		if (session.outputs.length === 0) return "";

		// Concatenate all outputs
		const fullOutput = Buffer.concat(session.outputs).toString();

		// Replace consecutive whitespace characters with single space
		const normalizedOutput = fullOutput.replace(/\s+/g, " ");

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
									return preview ? ` - ${preview}` : "";
								}
								return "";
							})()}
					</Text>
				</Box>
			))}
		</Box>
	);
};
