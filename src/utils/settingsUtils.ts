import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	statSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export interface SettingsFile {
	path: string;
	filename: string;
	name: string; // The part between "settings." and ".json"
	source: "home" | "local"; // Whether from ~/.claude or ./.claude
}

/**
 * Find all settings.*.json files in a directory
 */
const findSettingsInDirectory = (
	dir: string,
	source: "home" | "local",
): SettingsFile[] => {
	const settingsFiles: SettingsFile[] = [];

	if (!existsSync(dir)) {
		return settingsFiles;
	}

	try {
		const entries = readdirSync(dir);

		for (const entry of entries) {
			// Match settings.*.json pattern
			const match = entry.match(/^settings\.(.+)\.json$/);
			if (match?.[1]) {
				const fullPath = path.join(dir, entry);
				if (statSync(fullPath).isFile()) {
					settingsFiles.push({
						path: fullPath,
						filename: entry,
						name: match[1], // The part between "settings." and ".json"
						source,
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
 * Find all settings.*.json files in ~/.claude/ and ./.claude/ directories
 */
export const findSettingsFiles = (currentDir?: string): SettingsFile[] => {
	const settingsFiles: SettingsFile[] = [];

	// Search in ./.claude/ (current directory) first
	const cwd = currentDir || process.cwd();
	const localClaudeDir = path.join(cwd, ".claude");
	const home = homedir();
	const homeClaudeDir = path.join(home, ".claude");

	// Only add local settings if it's different from home directory
	if (localClaudeDir !== homeClaudeDir) {
		const localSettings = findSettingsInDirectory(localClaudeDir, "local");
		// Sort local settings alphabetically by filename
		localSettings.sort((a, b) => a.filename.localeCompare(b.filename));
		settingsFiles.push(...localSettings);
	}

	// Then add home settings
	const homeSettings = findSettingsInDirectory(homeClaudeDir, "home");
	// Sort home settings alphabetically by filename
	homeSettings.sort((a, b) => a.filename.localeCompare(b.filename));
	settingsFiles.push(...homeSettings);

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
	const prefix = settings.source === "local" ? "./" : "~/";
	return `${settings.name} (${prefix}.claude/)`;
};
