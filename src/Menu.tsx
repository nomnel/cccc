import * as React from "react";
import { Box, Text, useApp, useInput } from "ink";

interface MenuProps {
	onSelect: (option: "start" | "exit") => void;
}

export const Menu: React.FC<MenuProps> = ({ onSelect }) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const options = ["start", "exit"] as const;

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