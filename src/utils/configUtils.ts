import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface Repository {
	path: string;
}

export interface Config {
	repositories: Repository[];
}

const CONFIG_DIR = path.join(os.homedir(), ".config", "cccc");
const CONFIG_FILE = path.join(CONFIG_DIR, "settings.json");

function ensureConfigDir(): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true });
	}
}

export function loadConfig(): Config {
	ensureConfigDir();

	if (!fs.existsSync(CONFIG_FILE)) {
		const defaultConfig: Config = { repositories: [] };
		saveConfig(defaultConfig);
		return defaultConfig;
	}

	try {
		const content = fs.readFileSync(CONFIG_FILE, "utf-8");
		return JSON.parse(content) as Config;
	} catch (error) {
		console.error("Failed to load config:", error);
		return { repositories: [] };
	}
}

export function saveConfig(config: Config): void {
	ensureConfigDir();

	try {
		fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
	} catch (error) {
		console.error("Failed to save config:", error);
		throw error;
	}
}

export function addRepository(repoPath: string): void {
	const config = loadConfig();

	// Resolve the path to absolute
	const absolutePath = path.resolve(repoPath);

	// Check if the path exists
	if (!fs.existsSync(absolutePath)) {
		throw new Error(`Path does not exist: ${absolutePath}`);
	}

	// Check if it's a directory
	if (!fs.statSync(absolutePath).isDirectory()) {
		throw new Error(`Path is not a directory: ${absolutePath}`);
	}

	// Check if repository already exists
	if (config.repositories.some((repo) => repo.path === absolutePath)) {
		throw new Error(`Repository already exists: ${absolutePath}`);
	}

	config.repositories.push({ path: absolutePath });
	saveConfig(config);
}

export function removeRepository(repoPath: string): void {
	const config = loadConfig();

	// Try to match both absolute and relative paths
	const absolutePath = path.resolve(repoPath);

	const initialLength = config.repositories.length;
	config.repositories = config.repositories.filter(
		(repo) => repo.path !== repoPath && repo.path !== absolutePath,
	);

	if (config.repositories.length === initialLength) {
		throw new Error(`Repository not found: ${repoPath}`);
	}

	saveConfig(config);
}

export function listRepositories(): Repository[] {
	const config = loadConfig();
	return config.repositories;
}
