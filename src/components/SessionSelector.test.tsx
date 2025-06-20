import { render } from "ink-testing-library";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as configUtils from "../utils/configUtils.js";
import * as gitUtils from "../utils/gitUtils.js";
import { SessionSelector } from "./SessionSelector.js";

// Mock gitUtils
vi.mock("../utils/gitUtils.js");

// Mock configUtils
vi.mock("../utils/configUtils.js", () => ({
	listRepositories: vi.fn(),
}));

// Mock ink-text-input to avoid ES module issues
vi.mock("ink-text-input", () => ({
	default: vi.fn(() => null),
}));

describe("SessionSelector", () => {
	const mockOnSelectNewBranch = vi.fn();
	const mockOnSelectNewBranchFromRef = vi.fn();
	const mockOnSelectWorktree = vi.fn();
	const mockOnBack = vi.fn();

	const defaultProps = {
		onSelectNewBranch: mockOnSelectNewBranch,
		onSelectNewBranchFromRef: mockOnSelectNewBranchFromRef,
		onSelectWorktree: mockOnSelectWorktree,
		onBack: mockOnBack,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock process.chdir to prevent directory changes during tests
		vi.spyOn(process, "chdir").mockImplementation(() => {});
		// Set up default mocks
		vi.mocked(configUtils.listRepositories).mockReturnValue([
			{ path: "/path/to/repo" },
		]);
		vi.mocked(gitUtils.isGitRepo).mockReturnValue(true);
		vi.mocked(gitUtils.getGitRoot).mockReturnValue("/path/to/repo");
		vi.mocked(gitUtils.getRepositoryName).mockReturnValue("test-repo");
		vi.mocked(gitUtils.getWorktrees).mockReturnValue([]);
		vi.mocked(gitUtils.getBranchesAndTags).mockReturnValue([]);
		// Mock getWorktreeDisplayName to return the branch name
		vi.mocked(gitUtils.getWorktreeDisplayName).mockImplementation(
			(worktree) => worktree.branch || "",
		);
		// Mock formatWorktreeDisplayName
		vi.mocked(gitUtils.formatWorktreeDisplayName).mockImplementation(
			(repoName, branchName, worktreePath, repoPath) => {
				if (repoPath && worktreePath === repoPath) {
					return `${repoName}:${branchName}`;
				}
				// Check if it's a worktree based on path
				if (worktreePath.includes("-feature")) {
					const worktreeName = worktreePath.split("/").pop();
					return `${repoName}/${worktreeName}:${branchName}`;
				}
				return `${repoName}:${branchName}`;
			},
		);
	});

	describe("initial state", () => {
		it("should display loading state initially", () => {
			const { lastFrame } = render(<SessionSelector {...defaultProps} />);
			expect(lastFrame()).toContain("Loading worktrees...");
		});

		it("should display error when not in a git repository", async () => {
			vi.mocked(configUtils.listRepositories).mockReturnValue([]);
			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("No repositories configured");
			});
		});

		it("should display error when git root cannot be found", async () => {
			vi.mocked(gitUtils.isGitRepo).mockReturnValue(false);
			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("No valid git repositories found");
			});
		});
	});

	describe("menu navigation", () => {
		it("should display menu options after loading", async () => {
			const mockWorktrees = [
				{
					path: "/path/to/repo",
					branch: "main",
				},
				{
					path: "/path/to/repo-feature",
					branch: "feature-branch",
				},
			];

			vi.mocked(gitUtils.getWorktrees).mockReturnValue(mockWorktrees);
			vi.mocked(gitUtils.getBranchesAndTags).mockReturnValue([
				{ type: "branch", name: "main" },
				{ type: "branch", name: "develop" },
			]);

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				const frame = lastFrame();
				expect(frame).toContain("Create new worktree...");
				expect(frame).toContain("Create new worktree from...");
				expect(frame).toContain("test-repo:main");
				expect(frame).toContain("test-repo/repo-feature:feature-branch");
				expect(frame).toContain("← Back to main menu");
			});
		});

		it("should handle escape key to go back", async () => {
			const { stdin } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				stdin.write("\x1B"); // Escape key
				expect(mockOnBack).toHaveBeenCalledTimes(1);
			});
		});

		it("should navigate menu with arrow keys", async () => {
			vi.mocked(gitUtils.getWorktrees).mockReturnValue([
				{
					path: "/path/to/repo",
					branch: "main",
				},
			]);

			const { stdin, lastFrame } = render(
				<SessionSelector {...defaultProps} />,
			);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("▶");
			});

			// Navigate down
			stdin.write("\x1B[B"); // Down arrow
			await vi.waitFor(() => {
				const frame = lastFrame();
				if (!frame) return;
				const lines = frame.split("\n");
				const selectedLine = lines.find((line) => line.includes("▶"));
				expect(selectedLine).toContain("Create new worktree from...");
			});
		});
	});

	describe("branch creation modes", () => {
		it("should enter create new branch mode", async () => {
			const { stdin, lastFrame } = render(
				<SessionSelector {...defaultProps} />,
			);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("Create new worktree...");
			});

			// Select "Create new branch..."
			stdin.write("\r"); // Enter key

			await vi.waitFor(() => {
				const frame = lastFrame();
				expect(frame).toContain("Create New Branch and Worktree");
				expect(frame).toContain("Enter branch name:");
			});
		});

		it("should show branch/tag options when needed", async () => {
			vi.mocked(gitUtils.getBranchesAndTags).mockReturnValue([
				{ type: "branch", name: "main" },
				{ type: "branch", name: "develop" },
				{ type: "tag", name: "v1.0.0" },
			]);

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("Create new worktree from...");
			});

			// Note: Since we're mocking TextInput, we can't test the full flow
			// The test verifies that branches and tags are loaded correctly
			expect(vi.mocked(gitUtils.getBranchesAndTags)).toHaveBeenCalled();
		});

		it("should handle escape in branch creation mode", async () => {
			const { stdin, lastFrame } = render(
				<SessionSelector {...defaultProps} />,
			);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("Create new worktree...");
			});

			// Enter create mode
			stdin.write("\r");

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("Create New Branch and Worktree");
			});

			// Press escape to go back
			stdin.write("\x1B");

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("Create new worktree...");
				expect(lastFrame()).not.toContain("Create New Branch and Worktree");
			});
		});
	});

	describe("worktree selection", () => {
		it("should allow worktree selection", async () => {
			const mockWorktrees = [
				{
					path: "/path/to/repo",
					branch: "main",
				},
			];

			vi.mocked(gitUtils.getWorktrees).mockReturnValue(mockWorktrees);

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				const frame = lastFrame();
				expect(frame).toContain("📁");
				expect(frame).toContain("main");
			});

			// Note: Due to async timing and mocked TextInput,
			// we can't reliably test the actual selection event
		});
	});

	describe("error handling", () => {
		it("should display error when worktree loading fails", async () => {
			vi.mocked(gitUtils.getWorktrees).mockImplementation(() => {
				throw new Error("Failed to get worktrees");
			});

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain("No valid git repositories found");
			});
		});
	});

	describe("display formatting", () => {
		it("should format main worktree display correctly", async () => {
			vi.mocked(gitUtils.getWorktrees).mockReturnValue([
				{
					path: "/path/to/my-project",
					branch: "main",
				},
			]);
			vi.mocked(gitUtils.getRepositoryName).mockReturnValue("my-project");

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				// The main worktree should be displayed as "my-project:main"
				expect(lastFrame()).toContain("📁");
				expect(lastFrame()).toContain("my-project:main");
			});
		});

		it("should format worktree display correctly", async () => {
			// Override the mock for this test to show worktree format
			vi.mocked(gitUtils.formatWorktreeDisplayName).mockReturnValue(
				"my-project/my-project-feature:feature/new-ui",
			);
			vi.mocked(gitUtils.getWorktrees).mockReturnValue([
				{
					path: "/path/to/my-project-feature",
					branch: "feature/new-ui",
				},
			]);
			vi.mocked(gitUtils.getRepositoryName).mockReturnValue("my-project");

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				expect(lastFrame()).toContain(
					"my-project/my-project-feature:feature/new-ui",
				);
			});
		});

		it("should show worktree icon", async () => {
			vi.mocked(gitUtils.getWorktrees).mockReturnValue([
				{
					path: "/path/to/repo",
					branch: "main",
				},
			]);

			const { lastFrame } = render(<SessionSelector {...defaultProps} />);

			await vi.waitFor(() => {
				// Check for the folder icon which indicates a worktree
				expect(lastFrame()).toContain("📁");
			});
		});
	});
});
