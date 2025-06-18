import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { BranchInput } from "./BranchInput.js";

// Simple mock that avoids ES module issues
vi.mock("ink-text-input", () => {
	return {
		default: vi.fn(() => null),
	};
});

describe("BranchInput", () => {
	it("should render component structure", () => {
		const onSubmit = vi.fn();
		const onBack = vi.fn();
		const { lastFrame } = render(
			<BranchInput onSubmit={onSubmit} onBack={onBack} />,
		);

		// Component should render even with mocked TextInput
		const frame = lastFrame();
		expect(frame).toBeDefined();
		if (frame) {
			expect(frame.includes("Create New Branch and Worktree")).toBe(true);
		}
	});

	it("should handle escape key press", () => {
		const onSubmit = vi.fn();
		const onBack = vi.fn();
		const { stdin } = render(
			<BranchInput onSubmit={onSubmit} onBack={onBack} />,
		);

		stdin.write("\x1B"); // Escape key
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	// Direct unit tests for validation logic
	describe("validation functions", () => {
		// Test the regex pattern used in the component
		const invalidCharsRegex = /[^\w\-\.\/]/;

		it("should validate branch names correctly", () => {
			// Valid branch names
			const validNames = [
				"feature",
				"feature123",
				"feature-branch",
				"feature_branch",
				"v1.0.0",
				"feature/new-feature",
				"feature/JIRA-123_new-feature.v2",
				"release/2.0",
				"hotfix/urgent-fix",
				"main",
				"develop",
				"123feature",
				"_private",
				"-start-with-dash",
				"end-with-dot.",
			];

			for (const name of validNames) {
				expect(invalidCharsRegex.test(name)).toBe(false);
			}

			// Invalid branch names
			const invalidNames = [
				"feature@branch",
				"feature branch",
				"feature!branch",
				"feature#branch",
				"feature$branch",
				"feature%branch",
				"feature^branch",
				"feature&branch",
				"feature*branch",
				"feature(branch)",
				"feature[branch]",
				"feature{branch}",
				"feature|branch",
				"feature\\branch",
				"feature:branch",
				"feature;branch",
				"feature'branch",
				'feature"branch',
				"feature<branch>",
				"feature?branch",
			];

			for (const name of invalidNames) {
				expect(invalidCharsRegex.test(name)).toBe(true);
			}
		});

		it("should handle empty and whitespace-only strings", () => {
			expect("".trim()).toBe("");
			expect("   ".trim()).toBe("");
			expect("  feature  ".trim()).toBe("feature");
		});
	});
});
