import {
	readdirSync,
	statSync,
	existsSync,
	readFileSync,
	copyFileSync,
	mkdirSync,
} from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

export interface SettingsFile {
	path: string;
	filename: string;
	name: string; // The part between "settings." and ".json"
}

/**
 * Find all settings.*.json files in ~/.claude/ directory
 */
export const findHomeSettingsFiles = (homeDir?: string): SettingsFile[] => {
	const settingsFiles: SettingsFile[] = [];
	const home = homeDir || homedir();
	const claudeDir = path.join(home, ".claude");

	if (!existsSync(claudeDir)) {
		return settingsFiles;
	}

	try {
		const entries = readdirSync(claudeDir);

		for (const entry of entries) {
			// Match settings.*.json pattern
			const match = entry.match(/^settings\.(.+)\.json$/);
			if (match && match[1]) {
				const fullPath = path.join(claudeDir, entry);
				if (statSync(fullPath).isFile()) {
					settingsFiles.push({
						path: fullPath,
						filename: entry,
						name: match[1], // The part between "settings." and ".json"
					});
				}
			}
		}
	} catch (error) {
		// Ignore if we can't read the directory
	}

	return settingsFiles;
};

/**
 * Copy a settings file to the worktree as settings.local.json
 */
export const copySettingsToWorktree = (
	settingsPath: string,
	worktreePath: string,
): string => {
	const claudeDir = path.join(worktreePath, ".claude");
	const targetPath = path.join(claudeDir, "settings.local.json");

	// Create .claude directory if it doesn't exist
	if (!existsSync(claudeDir)) {
		mkdirSync(claudeDir, { recursive: true });
	}

	// Copy the settings file
	copyFileSync(settingsPath, targetPath);

	return targetPath;
};

/**
 * Get display name for a settings file
 */
export const getSettingsDisplayName = (settings: SettingsFile): string => {
	return settings.name;
};
