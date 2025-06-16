import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import { findSettingsFiles, getSettingsDisplayName } from "./settingsUtils.js";

describe("settingsUtils", () => {
	const testDir = path.join(process.cwd(), "test-settings-utils");

	beforeEach(() => {
		// Create test directory structure
		mkdirSync(path.join(testDir, "frontend", ".claude"), { recursive: true });
		mkdirSync(path.join(testDir, "backend", ".claude"), { recursive: true });
		mkdirSync(path.join(testDir, ".claude"), { recursive: true });

		// Create settings files
		writeFileSync(
			path.join(testDir, "frontend", ".claude", "settings.json"),
			JSON.stringify({ name: "Frontend App" }),
		);
		writeFileSync(
			path.join(testDir, "backend", ".claude", "settings.json"),
			JSON.stringify({ project: "Backend API" }),
		);
		writeFileSync(
			path.join(testDir, ".claude", "settings.json"),
			JSON.stringify({}),
		);
	});

	afterEach(() => {
		// Clean up test directory
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("findSettingsFiles", () => {
		it("should find all settings.json files in .claude directories", () => {
			const settings = findSettingsFiles(testDir);
			expect(settings).toHaveLength(3);
			expect(settings.map((s) => s.relativePath).sort()).toEqual([
				".claude/settings.json",
				"backend/.claude/settings.json",
				"frontend/.claude/settings.json",
			]);
		});

		it("should extract names from settings files", () => {
			const settings = findSettingsFiles(testDir);
			const frontend = settings.find((s) =>
				s.relativePath.includes("frontend"),
			);
			const backend = settings.find((s) => s.relativePath.includes("backend"));

			expect(frontend?.name).toBe("Frontend App");
			expect(backend?.name).toBe("Backend API");
		});

		it("should handle empty directories", () => {
			const emptyDir = path.join(testDir, "empty");
			mkdirSync(emptyDir);
			const settings = findSettingsFiles(emptyDir);
			expect(settings).toHaveLength(0);
		});

		it("should ignore non-.claude directories", () => {
			mkdirSync(path.join(testDir, "not-claude"), { recursive: true });
			writeFileSync(
				path.join(testDir, "not-claude", "settings.json"),
				JSON.stringify({ name: "Should not find" }),
			);
			const settings = findSettingsFiles(testDir);
			expect(settings).toHaveLength(3);
		});
	});

	describe("getSettingsDisplayName", () => {
		it("should use name field if available", () => {
			const settings = {
				path: "/path/to/.claude/settings.json",
				relativePath: "frontend/.claude/settings.json",
				name: "My Frontend",
			};
			expect(getSettingsDisplayName(settings)).toBe(
				"My Frontend (frontend/.claude/settings.json)",
			);
		});

		it("should use parent directory if no name", () => {
			const settings = {
				path: "/path/to/backend/.claude/settings.json",
				relativePath: "backend/.claude/settings.json",
			};
			expect(getSettingsDisplayName(settings)).toBe(
				"backend/.claude/settings.json",
			);
		});

		it("should handle root settings file", () => {
			const settings = {
				path: "/path/to/.claude/settings.json",
				relativePath: ".claude/settings.json",
			};
			expect(getSettingsDisplayName(settings)).toBe(".claude/settings.json");
		});
	});
});