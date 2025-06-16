import * as React from "react";
import { Box, Text, useInput } from "ink";
import type { SettingsFile } from "../utils/settingsUtils.js";
import { getSettingsDisplayName } from "../utils/settingsUtils.js";

interface SettingsSelectorProps {
	settingsFiles: SettingsFile[];
	workingDirectory: string;
	onSelect: (settingsPath: string | null) => void;
	onBack: () => void;
}

export const SettingsSelector: React.FC<SettingsSelectorProps> = ({
	settingsFiles,
	workingDirectory,
	onSelect,
	onBack,
}) => {
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	// Options: settings files + "no settings" + back
	const options = React.useMemo(() => {
		const result: Array<{ label: string; value: string | null }> = [];

		// Add settings files
		for (const settings of settingsFiles) {
			result.push({
				label: getSettingsDisplayName(settings),
				value: settings.path,
			});
		}

		// Add "no settings" option
		result.push({
			label: "Continue without settings",
			value: null,
		});

		// Add back option
		result.push({
			label: "← Back to worktree selection",
			value: "back",
		});

		return result;
	}, [settingsFiles]);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		}
		if (key.return) {
			const option = options[selectedIndex];
			if (option?.value === "back") {
				onBack();
			} else if (option) {
				onSelect(option.value);
			}
		}
		if (key.escape) {
			onBack();
		}
	});

	return (
		<Box flexDirection="column">
			<Text color="blue" bold>
				Multiple settings files found in worktree:
			</Text>
			<Text color="dim">{workingDirectory}</Text>
			<Text color="dim">
				Use ↑/↓ to navigate, Enter to select, Esc to go back
			</Text>
			<Text> </Text>
			{options.map((option, index) => {
				const isSelected = selectedIndex === index;
				const isBackOption = option.value === "back";
				const isNoSettings =
					option.value === null && option.label.includes("without");

				return (
					<Box key={index}>
						<Text
							color={
								isSelected
									? "green"
									: isBackOption || isNoSettings
										? "dim"
										: undefined
							}
						>
							{isSelected ? "▶ " : "  "}
							{option.label}
						</Text>
					</Box>
				);
			})}
		</Box>
	);
};
