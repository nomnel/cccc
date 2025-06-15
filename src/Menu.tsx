import * as React from "react";
import { Box, Text, useInput } from "ink";
import { MENU_OPTIONS } from "./constants.js";
import type { Session } from "./types.js";

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
}

export const Menu: React.FC<MenuProps> = ({ onSelect, sessions }) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);

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
					</Text>
				</Box>
			))}
		</Box>
	);
};
