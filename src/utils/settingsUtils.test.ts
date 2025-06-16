import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import {
	findSettingsFiles,
	copySettingsToWorktree,
	getSettingsDisplayName,
} from "./settingsUtils.js";

describe("settingsUtils", () => {
	const testDir = path.join(process.cwd(), "test-settings-utils");
	const mockHomeDir = path.join(testDir, "mock-home");
	const claudeDir = path.join(mockHomeDir, ".claude");

	beforeEach(() => {
		// Create test directory structure
		mkdirSync(claudeDir, { recursive: true });

		// Create various settings files
		writeFileSync(
			path.join(claudeDir, "settings.dev.json"),
			JSON.stringify({ name: "Development" }),
		);
		writeFileSync(
			path.join(claudeDir, "settings.prod.json"),
			JSON.stringify({ name: "Production" }),
		);
		writeFileSync(
			path.join(claudeDir, "settings.test.json"),
			JSON.stringify({ name: "Testing" }),
		);
		// Create a file that shouldn't match
		writeFileSync(
			path.join(claudeDir, "settings.json"),
			JSON.stringify({ name: "Default" }),
		);
		writeFileSync(
			path.join(claudeDir, "config.json"),
			JSON.stringify({ name: "Config" }),
		);
	});

	afterEach(() => {
		// Clean up test directory
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("findSettingsFiles", () => {
		it("should find all settings.*.json files in ~/.claude/", () => {
			const settings = findSettingsFiles(mockHomeDir, path.join(testDir, "different-dir"));
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
			const settings = findSettingsFiles(mockHomeDir, path.join(testDir, "different-dir"));
			const hasDefaultSettings = settings.some(
				(s) => s.filename === "settings.json",
			);
			expect(hasDefaultSettings).toBe(false);
		});

		it("should not include non-settings files", () => {
			const settings = findSettingsFiles(mockHomeDir, path.join(testDir, "different-dir"));
			const hasConfigFile = settings.some((s) => s.filename === "config.json");
			expect(hasConfigFile).toBe(false);
		});

		it("should handle missing ~/.claude directory", () => {
			rmSync(claudeDir, { recursive: true });
			const settings = findSettingsFiles(mockHomeDir, path.join(testDir, "different-dir"));
			expect(settings).toHaveLength(0);
		});

		it("should ignore directories", () => {
			mkdirSync(path.join(claudeDir, "settings.subdir.json"));
			const settings = findSettingsFiles(mockHomeDir, path.join(testDir, "different-dir"));
			expect(settings).toHaveLength(3); // Still only the 3 files
		});

		it("should find settings in both home and local directories", () => {
			// Create local .claude directory with settings
			const localDir = path.join(testDir, "local-project");
			const localClaudeDir = path.join(localDir, ".claude");
			mkdirSync(localClaudeDir, { recursive: true });
			
			writeFileSync(
				path.join(localClaudeDir, "settings.local-dev.json"),
				JSON.stringify({ name: "Local Development" }),
			);
			
			const settings = findSettingsFiles(mockHomeDir, localDir);
			expect(settings).toHaveLength(4); // 3 from home + 1 from local
			
			// Check that sources are correctly assigned
			const homeSetting = settings.find(s => s.name === "dev");
			const localSetting = settings.find(s => s.name === "local-dev");
			
			expect(homeSetting?.source).toBe("home");
			expect(localSetting?.source).toBe("local");
		});
	});

	describe("copySettingsToWorktree", () => {
		const worktreeDir = path.join(testDir, "worktree");

		beforeEach(() => {
			mkdirSync(worktreeDir, { recursive: true });
		});

		it("should copy settings file to worktree as settings.local.json", () => {
			const sourcePath = path.join(claudeDir, "settings.dev.json");
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
			const sourcePath = path.join(claudeDir, "settings.prod.json");
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
			const sourcePath = path.join(claudeDir, "settings.test.json");
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
