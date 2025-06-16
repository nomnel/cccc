import * as React from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface BranchInputProps {
	onSubmit: (branchName: string) => void;
	onBack: () => void;
}

export const BranchInput: React.FC<BranchInputProps> = ({
	onSubmit,
	onBack,
}) => {
	const [branchName, setBranchName] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	useInput((input, key) => {
		if (key.escape) {
			onBack();
		}
	});

	const handleSubmit = (value: string) => {
		const trimmedValue = value.trim();

		if (!trimmedValue) {
			setError("Branch name cannot be empty");
			return;
		}

		// Basic validation for branch name
		const invalidChars = /[^\w\-\.\/]/;
		if (invalidChars.test(trimmedValue)) {
			setError(
				"Branch name contains invalid characters. Use only letters, numbers, hyphens, dots, and slashes.",
			);
			return;
		}

		onSubmit(trimmedValue);
	};

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold>Create New Branch and Worktree</Text>
			<Box marginTop={1} marginBottom={1}>
				<Text>Enter branch name: </Text>
				<TextInput
					value={branchName}
					onChange={setBranchName}
					onSubmit={handleSubmit}
					placeholder="feature/my-new-feature"
				/>
			</Box>
			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}
			<Box marginTop={1}>
				<Text dimColor>Press Enter to create • Press Escape to go back</Text>
			</Box>
		</Box>
	);
};
