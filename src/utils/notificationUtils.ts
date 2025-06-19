import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function sendNotification(
	message: string,
	title = "cccc",
): Promise<void> {
	if (process.platform === "darwin") {
		try {
			const escapedMessage = message.replace(/"/g, '\\"');
			const escapedTitle = title.replace(/"/g, '\\"');
			const command = `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}" sound name "Tink"'`;
			await execAsync(command);
		} catch (error) {
			console.error("Failed to send notification:", error);
		}
	}
}

export function getSessionDisplayName(session: {
	id: string;
	workingDirectory?: string;
	repoName?: string;
	branch?: string;
	settingsName?: string;
}): string {
	const workingDirDisplay = session.workingDirectory
		? session.workingDirectory.split("/").pop() || ""
		: "";
	const repoDisplay = session.repoName || workingDirDisplay;
	const branchDisplay = session.branch
		? `${repoDisplay}/${session.branch}`
		: repoDisplay;
	const settingsDisplay = session.settingsName
		? `:${session.settingsName}`
		: "";

	return branchDisplay + settingsDisplay || session.id;
}

export function sendSessionStatusNotification(
	session: {
		id: string;
		workingDirectory?: string;
		repoName?: string;
		branch?: string;
		settingsName?: string;
	},
	newStatus: string,
): Promise<void> {
	let message = "";
	const icon = newStatus === "Idle" ? "✅" : "📝";
	const sessionName = getSessionDisplayName(session);

	if (newStatus === "Idle") {
		message = `${icon} Session completed: ${sessionName}`;
	} else if (newStatus === "Awaiting Input") {
		message = `${icon} Input needed: ${sessionName}`;
	}

	return sendNotification(message);
}
