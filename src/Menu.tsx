import * as React from "react";
import { Box, Text, useApp, useInput } from "ink";
import type pty from "node-pty";

type Session = { id: string; process: pty.IPty };

interface MenuProps {
	onSelect: (option: string) => void;
	sessions: Session[];
}

export const Menu: React.FC<MenuProps> = ({ onSelect, sessions }) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	
	// Build options array: start, sessions, exit
	const options = React.useMemo(() => {
		const result = ["start"];
		for (const session of sessions) {
			result.push(session.id);
		}
		result.push("exit");
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