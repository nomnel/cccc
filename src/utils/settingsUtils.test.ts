import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import {
	findHomeSettingsFiles,
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

	describe("findHomeSettingsFiles", () => {
		it("should find all settings.*.json files in ~/.claude/", () => {
			const settings = findHomeSettingsFiles(mockHomeDir);
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
			const settings = findHomeSettingsFiles(mockHomeDir);
			const hasDefaultSettings = settings.some(
				(s) => s.filename === "settings.json",
			);
			expect(hasDefaultSettings).toBe(false);
		});

		it("should not include non-settings files", () => {
			const settings = findHomeSettingsFiles(mockHomeDir);
			const hasConfigFile = settings.some((s) => s.filename === "config.json");
			expect(hasConfigFile).toBe(false);
		});

		it("should handle missing ~/.claude directory", () => {
			rmSync(claudeDir, { recursive: true });
			const settings = findHomeSettingsFiles(mockHomeDir);
			expect(settings).toHaveLength(0);
		});

		it("should ignore directories", () => {
			mkdirSync(path.join(claudeDir, "settings.subdir.json"));
			const settings = findHomeSettingsFiles(mockHomeDir);
			expect(settings).toHaveLength(3); // Still only the 3 files
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
		it("should return the name part of the settings file", () => {
			const settings = {
				path: "/home/user/.claude/settings.dev.json",
				filename: "settings.dev.json",
				name: "dev",
			};
			expect(getSettingsDisplayName(settings)).toBe("dev");
		});

		it("should handle complex names", () => {
			const settings = {
				path: "/home/user/.claude/settings.my-project.json",
				filename: "settings.my-project.json",
				name: "my-project",
			};
			expect(getSettingsDisplayName(settings)).toBe("my-project");
		});
	});
});
