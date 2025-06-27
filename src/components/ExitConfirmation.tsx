import { Box, Text, useInput } from "ink";
import * as React from "react";

interface ExitConfirmationProps {
	sessionCount: number;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ExitConfirmation: React.FC<ExitConfirmationProps> = ({
	sessionCount,
	onConfirm,
	onCancel,
}) => {
	const [selectedOption, setSelectedOption] = React.useState(1); // 0 = Yes, 1 = No

	useInput((input, key) => {
		if (key.leftArrow || key.rightArrow) {
			setSelectedOption((prev) => (prev === 0 ? 1 : 0));
		}
		if (key.return) {
			if (selectedOption === 0) {
				onConfirm();
			} else {
				onCancel();
			}
		}
		if (key.escape) {
			onCancel();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text>
				{sessionCount === 1
					? "There is 1 active session. Do you want to exit and terminate it?"
					: `There are ${sessionCount} active sessions. Do you want to exit and terminate all of them?`}
			</Text>
			<Box marginTop={1}>
				<Box marginRight={2}>
					<Text color={selectedOption === 0 ? "green" : undefined}>
						{selectedOption === 0 ? "▶ " : "  "}Yes
					</Text>
				</Box>
				<Box>
					<Text color={selectedOption === 1 ? "green" : undefined}>
						{selectedOption === 1 ? "▶ " : "  "}No
					</Text>
				</Box>
			</Box>
		</Box>
	);
};
