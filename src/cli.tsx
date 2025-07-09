#!/usr/bin/env node

import path from "node:path";
import {
	addRepository,
	listRepositories,
	removeRepository,
} from "./utils/configUtils.js";
import { isGitRepo } from "./utils/gitUtils.js";

const args = process.argv.slice(2);
const command = args[0];

async function main() {
	switch (command) {
		case "add": {
			const path = args[1];
			if (!path) {
				console.error("Usage: cccc add <path>");
				process.exit(1);
			}

			try {
				addRepository(path);
				console.log(`Repository added: ${path}`);
			} catch (error) {
				console.error(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
			break;
		}

		case "remove": {
			const repo = args[1];
			if (!repo) {
				console.error("Usage: cccc remove <repo>");
				process.exit(1);
			}

			try {
				removeRepository(repo);
				console.log(`Repository removed: ${repo}`);
			} catch (error) {
				console.error(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
				);
				process.exit(1);
			}
			break;
		}

		case "list": {
			const repositories = listRepositories();
			if (repositories.length === 0) {
				console.log("No repositories configured");
			} else {
				console.log("Configured repositories:");
				repositories.forEach((repo, index) => {
					console.log(`  ${index + 1}. ${repo.path}`);
				});
			}
			break;
		}

		default: {
			// No command or unknown command - check if current directory is a git repo
			const currentDir = process.cwd();

			// Check if current directory is a git repository
			if (isGitRepo(currentDir)) {
				// Check if it's already managed
				const repositories = listRepositories();
				const absolutePath = path.resolve(currentDir);
				const isManaged = repositories.some(
					(repo) => repo.path === absolutePath,
				);

				if (!isManaged) {
					// Automatically add this repository to cccc management
					try {
						addRepository(currentDir);
						console.log(
							`Automatically added current git repository to cccc: ${absolutePath}`,
						);
					} catch (error) {
						// If it fails to add, just continue without adding
						console.error(
							`Warning: Could not auto-add repository: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				}
			}

			// Import and run the main app
			await import("./index.js");
			break;
		}
	}
}

main().catch((error) => {
	console.error("Unexpected error:", error);
	process.exit(1);
});
