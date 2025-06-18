import { render } from "ink-testing-library";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsFile } from "../utils/settingsUtils.js";
import { SettingsSelector } from "./SettingsSelector.js";

// Mock settingsUtils
vi.mock("../utils/settingsUtils.js", () => ({
	getSettingsDisplayName: vi.fn((settings: SettingsFile) => {
		return `${settings.name} (${settings.path})`;
	}),
}));

describe("SettingsSelector", () => {
	const mockOnSelect = vi.fn();
	const mockOnBack = vi.fn();

	const mockSettingsFiles: SettingsFile[] = [
		{
			path: "/path/to/production.json",
			filename: "settings.production.json",
			name: "production",
			source: "home",
		},
		{
			path: "/path/to/development.json",
			filename: "settings.development.json",
			name: "development",
			source: "home",
		},
		{
			path: "/path/to/staging.json",
			filename: "settings.staging.json",
			name: "staging",
			source: "local",
		},
	];

	const defaultProps = {
		settingsFiles: mockSettingsFiles,
		workingDirectory: "/path/to/worktree",
		onSelect: mockOnSelect,
		onBack: mockOnBack,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("rendering", () => {
		it("should display header and working directory", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			expect(lastFrame()).toContain("Select settings file for worktree:");
			expect(lastFrame()).toContain("/path/to/worktree");
			expect(lastFrame()).toContain(
				"Use ↑/↓ to navigate, Enter to select, Esc to go back",
			);
		});

		it("should display all settings files", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			expect(lastFrame()).toContain("production (/path/to/production.json)");
			expect(lastFrame()).toContain("development (/path/to/development.json)");
			expect(lastFrame()).toContain("staging (/path/to/staging.json)");
		});

		it("should display continue without settings option", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			expect(lastFrame()).toContain("Continue without settings");
		});

		it("should display back option", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			expect(lastFrame()).toContain("← Back to worktree selection");
		});

		it("should show selection indicator", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			// First option should be selected by default
			const frame = lastFrame();
			if (!frame) return;
			const lines = frame.split("\n");
			const selectedLine = lines.find((line) => line.includes("▶"));
			expect(selectedLine).toBeDefined();
			expect(selectedLine).toContain("production");
		});
	});

	describe("keyboard handling", () => {
		it("should handle escape key", () => {
			const { stdin } = render(<SettingsSelector {...defaultProps} />);

			stdin.write("\x1B"); // Escape

			expect(mockOnBack).toHaveBeenCalledTimes(1);
			expect(mockOnSelect).not.toHaveBeenCalled();
		});

		it("should handle enter key on first option", () => {
			const { stdin } = render(<SettingsSelector {...defaultProps} />);

			// Press enter on first option (default selection)
			stdin.write("\r");

			expect(mockOnSelect).toHaveBeenCalledWith(
				"/path/to/production.json",
				"production",
			);
		});
	});

	describe("empty settings", () => {
		it("should handle empty settings list", () => {
			const props = {
				...defaultProps,
				settingsFiles: [],
			};

			const { lastFrame } = render(<SettingsSelector {...props} />);

			// Should still show "Continue without settings" and "Back" options
			expect(lastFrame()).toContain("Continue without settings");
			expect(lastFrame()).toContain("← Back to worktree selection");
		});

		it("should show correct number of options with empty settings", () => {
			const props = {
				...defaultProps,
				settingsFiles: [],
			};

			const { lastFrame } = render(<SettingsSelector {...props} />);

			// Should have exactly 2 options
			const frame = lastFrame();
			if (!frame) return;
			const lines = frame.split("\n").filter((line) => line.trim());
			const optionLines = lines.filter(
				(line) =>
					line.includes("Continue without settings") ||
					line.includes("← Back to worktree selection"),
			);
			expect(optionLines).toHaveLength(2);
		});
	});

	describe("options building", () => {
		it("should build correct options array", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			// Should have settings files + 2 extra options
			const totalOptions = mockSettingsFiles.length + 2; // + "Continue without" + "Back"

			// Count lines with either ▶ or spaces at the beginning (indicating options)
			const frame = lastFrame();
			if (!frame) return;
			const lines = frame.split("\n");
			const optionLines = lines.filter(
				(line) =>
					line.trimStart().startsWith("▶") ||
					(line.startsWith("  ") && line.trim().length > 0),
			);

			// Should have correct number of options
			expect(optionLines.length).toBeGreaterThanOrEqual(totalOptions);
		});
	});

	describe("display formatting", () => {
		it("should use correct display names for settings", () => {
			const { lastFrame } = render(<SettingsSelector {...defaultProps} />);

			// Verify that getSettingsDisplayName is used
			for (const settings of mockSettingsFiles) {
				expect(lastFrame()).toContain(`${settings.name} (${settings.path})`);
			}
		});
	});
});
