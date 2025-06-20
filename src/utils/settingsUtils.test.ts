import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	copySettingsToWorktree,
	findSettingsFiles,
	getSettingsDisplayName,
} from "./settingsUtils.js";

describe("settingsUtils", () => {
	// Use a subdirectory in the actual home directory for testing
	const testSubDir = `.claude-test-${Date.now()}`;
	const testHomeClaudeDir = path.join(homedir(), testSubDir);
	const originalClaudeDir = path.join(homedir(), ".claude");
	const backupDir = path.join(homedir(), `.claude-backup-${Date.now()}`);
	let hadOriginalClaudeDir = false;

	beforeEach(() => {
		// Backup existing ~/.claude if it exists
		hadOriginalClaudeDir = existsSync(originalClaudeDir);
		if (hadOriginalClaudeDir) {
			mkdirSync(backupDir, { recursive: true });
			// Move the original directory to backup
			require("node:fs").renameSync(originalClaudeDir, backupDir);
		}

		// Create test .claude directory
		mkdirSync(originalClaudeDir, { recursive: true });

		// Create various settings files
		writeFileSync(
			path.join(originalClaudeDir, "settings.dev.json"),
			JSON.stringify({ name: "Development" }),
		);
		writeFileSync(
			path.join(originalClaudeDir, "settings.prod.json"),
			JSON.stringify({ name: "Production" }),
		);
		writeFileSync(
			path.join(originalClaudeDir, "settings.test.json"),
			JSON.stringify({ name: "Testing" }),
		);
		// Create a file that shouldn't match
		writeFileSync(
			path.join(originalClaudeDir, "settings.json"),
			JSON.stringify({ name: "Default" }),
		);
		writeFileSync(
			path.join(originalClaudeDir, "config.json"),
			JSON.stringify({ name: "Config" }),
		);
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(originalClaudeDir)) {
			rmSync(originalClaudeDir, { recursive: true, force: true });
		}

		// Restore original ~/.claude if it existed
		if (hadOriginalClaudeDir && existsSync(backupDir)) {
			require("node:fs").renameSync(backupDir, originalClaudeDir);
		}

		// Clean up backup dir if it still exists
		if (existsSync(backupDir)) {
			rmSync(backupDir, { recursive: true, force: true });
		}
	});

	describe("findSettingsFiles", () => {
		it("should find all settings.*.json files in ~/.claude/", () => {
			const settings = findSettingsFiles("/some/different/dir");
			expect(settings).toHaveLength(3);

			const names = settings.map((s) => s.name).sort();
			expect(names).toEqual(["dev", "prod", "test"]);

			const filenames = settings.map((s) => s.filename).sort();
			expect(filenames).toEqual([
				"settings.dev.json",
				"settings.prod.json",
				"settings.test.json",
			]);
		});

		it("should not include settings.json without a name part", () => {
			const settings = findSettingsFiles("/some/different/dir");
			const hasDefaultSettings = settings.some(
				(s) => s.filename === "settings.json",
			);
			expect(hasDefaultSettings).toBe(false);
		});

		it("should not include non-settings files", () => {
			const settings = findSettingsFiles("/some/different/dir");
			const hasConfigFile = settings.some((s) => s.filename === "config.json");
			expect(hasConfigFile).toBe(false);
		});

		it("should handle missing ~/.claude directory", () => {
			rmSync(originalClaudeDir, { recursive: true });
			const settings = findSettingsFiles("/some/different/dir");
			expect(settings).toHaveLength(0);
		});

		it("should ignore directories", () => {
			mkdirSync(path.join(originalClaudeDir, "settings.subdir.json"));
			const settings = findSettingsFiles("/some/different/dir");
			expect(settings).toHaveLength(3); // Still only the 3 files
		});

		it("should find settings in both home and local directories", () => {
			// Create local .claude directory with settings
			const localDir = path.join(process.cwd(), `test-local-${Date.now()}`);
			const localClaudeDir = path.join(localDir, ".claude");
			mkdirSync(localClaudeDir, { recursive: true });

			writeFileSync(
				path.join(localClaudeDir, "settings.local-dev.json"),
				JSON.stringify({ name: "Local Development" }),
			);

			try {
				const settings = findSettingsFiles(localDir);
				expect(settings).toHaveLength(4); // 3 from home + 1 from local

				// Check that sources are correctly assigned
				const homeSetting = settings.find((s) => s.name === "dev");
				const localSetting = settings.find((s) => s.name === "local-dev");

				expect(homeSetting?.source).toBe("home");
				expect(localSetting?.source).toBe("local");
			} finally {
				// Clean up local test directory
				rmSync(localDir, { recursive: true, force: true });
			}
		});
	});

	describe("copySettingsToWorktree", () => {
		const worktreeDir = path.join(process.cwd(), `test-worktree-${Date.now()}`);

		beforeEach(() => {
			mkdirSync(worktreeDir, { recursive: true });
		});

		afterEach(() => {
			rmSync(worktreeDir, { recursive: true, force: true });
		});

		it("should copy settings file to worktree as settings.local.json", () => {
			const sourcePath = path.join(originalClaudeDir, "settings.dev.json");
			const targetPath = copySettingsToWorktree(sourcePath, worktreeDir);

			expect(targetPath).toBe(
				path.join(worktreeDir, ".claude", "settings.local.json"),
			);
			expect(existsSync(targetPath)).toBe(true);

			// Verify content was copied
			const sourceContent = JSON.stringify({ name: "Development" });
			const targetContent = require("node:fs").readFileSync(targetPath, "utf8");
			expect(targetContent).toBe(sourceContent);
		});

		it("should create .claude directory if it doesn't exist", () => {
			const sourcePath = path.join(originalClaudeDir, "settings.prod.json");
			const claudeWorktreeDir = path.join(worktreeDir, ".claude");

			expect(existsSync(claudeWorktreeDir)).toBe(false);
			copySettingsToWorktree(sourcePath, worktreeDir);
			expect(existsSync(claudeWorktreeDir)).toBe(true);
		});

		it("should overwrite existing settings.local.json", () => {
			const claudeWorktreeDir = path.join(worktreeDir, ".claude");
			mkdirSync(claudeWorktreeDir, { recursive: true });

			// Create existing file
			const targetPath = path.join(claudeWorktreeDir, "settings.local.json");
			writeFileSync(targetPath, JSON.stringify({ old: "data" }));

			// Copy new file
			const sourcePath = path.join(originalClaudeDir, "settings.test.json");
			copySettingsToWorktree(sourcePath, worktreeDir);

			// Verify new content
			const content = require("node:fs").readFileSync(targetPath, "utf8");
			expect(content).toBe(JSON.stringify({ name: "Testing" }));
		});
	});

	describe("getSettingsDisplayName", () => {
		it("should show name with home source", () => {
			const settings = {
				path: "/home/user/.claude/settings.dev.json",
				filename: "settings.dev.json",
				name: "dev",
				source: "home" as const,
			};
			expect(getSettingsDisplayName(settings)).toBe("dev (~/.claude/)");
		});

		it("should show name with local source", () => {
			const settings = {
				path: "/project/.claude/settings.local-dev.json",
				filename: "settings.local-dev.json",
				name: "local-dev",
				source: "local" as const,
			};
			expect(getSettingsDisplayName(settings)).toBe("local-dev (./.claude/)");
		});
	});
});
