import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface SettingsFile {
	path: string;
	relativePath: string;
	name?: string;
}

/**
 * Recursively find all .claude/settings.json files in a directory
 */
export const findSettingsFiles = (rootDir: string): SettingsFile[] => {
	const settingsFiles: SettingsFile[] = [];

	const searchDirectory = (dir: string) => {
		try {
			const entries = readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);

				if (entry.isDirectory()) {
					// Check if this is a .claude directory
					if (entry.name === ".claude") {
						const settingsPath = path.join(fullPath, "settings.json");
						if (existsSync(settingsPath)) {
							settingsFiles.push({
								path: settingsPath,
								relativePath: path.relative(rootDir, settingsPath),
								name: tryGetSettingsName(settingsPath),
							});
						}
					}
					// Continue searching in subdirectories
					searchDirectory(fullPath);
				}
			}
		} catch (error) {
			// Ignore directories we can't read
		}
	};

	searchDirectory(rootDir);
	return settingsFiles;
};

/**
 * Try to read a name from the settings file
 */
const tryGetSettingsName = (settingsPath: string): string | undefined => {
	try {
		const content = readFileSync(settingsPath, "utf8");
		const settings = JSON.parse(content);
		return settings.name || settings.project || undefined;
	} catch {
		return undefined;
	}
};

/**
 * Get display name for a settings file
 */
export const getSettingsDisplayName = (settings: SettingsFile): string => {
	if (settings.name) {
		return `${settings.name} (${settings.relativePath})`;
	}
	// Show parent directory name for context
	const parentDir = path.dirname(path.dirname(settings.relativePath));
	if (parentDir && parentDir !== ".") {
		return `${parentDir}/.claude/settings.json`;
	}
	return settings.relativePath;
};
