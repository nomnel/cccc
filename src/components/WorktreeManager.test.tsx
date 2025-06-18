import { render } from "ink-testing-library";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gitUtils from "../utils/gitUtils.js";
import { WorktreeManager } from "./WorktreeManager.js";

vi.mock("../utils/gitUtils.js");

describe("WorktreeManager", () => {
	const mockOnBack = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		// process.stdin methods are already mocked in test-setup.ts
		vi.mocked(process.stdin.on).mockImplementation(() => process.stdin);
		// Define off method if it doesn't exist
		if (!process.stdin.off) {
			Object.defineProperty(process.stdin, "off", {
				value: vi.fn().mockImplementation(() => process.stdin),
				configurable: true,
			});
		}
	});

	it("should display loading state initially", () => {
		vi.mocked(gitUtils.getWorktreesAsync).mockImplementation(
			() => new Promise(() => {}),
		);

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		expect(lastFrame()).toContain("Loading worktrees...");
	});

	it("should display worktrees when loaded", async () => {
		const mockWorktrees = [
			{
				path: "/path/to/main",
				branch: "main",
				isCurrentWorktree: false,
				isBare: false,
				isMainWorktree: true,
			},
			{
				path: "/path/to/feature",
				branch: "feature-branch",
				isCurrentWorktree: true,
				isBare: false,
				isMainWorktree: false,
			},
		];

		vi.mocked(gitUtils.getWorktreesAsync).mockResolvedValue(mockWorktrees);
		vi.mocked(gitUtils.getWorktreeStatus).mockResolvedValue({
			hasUncommittedChanges: false,
			hasUntrackedFiles: false,
		});

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		// Wait for async operations
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toContain("Git Worktree Manager");
			expect(frame).toContain("main");
			expect(frame).toContain("(main)");
			expect(frame).toContain("feature-branch");
			expect(frame).toContain("(current)");
			expect(frame).toContain("/path/to/main");
			expect(frame).toContain("/path/to/feature");
		});
	});

	it("should display error when loading fails", async () => {
		vi.mocked(gitUtils.getWorktreesAsync).mockRejectedValue(
			new Error("Git error"),
		);

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toContain("Error: Git error");
			expect(frame).toContain("Press Escape to go back");
		});
	});

	it("should display worktree status correctly", async () => {
		const mockWorktrees = [
			{
				path: "/path/to/modified",
				branch: "modified-branch",
				isCurrentWorktree: false,
				isBare: false,
				isMainWorktree: false,
			},
			{
				path: "/path/to/untracked",
				branch: "untracked-branch",
				isCurrentWorktree: false,
				isBare: false,
				isMainWorktree: false,
			},
		];

		vi.mocked(gitUtils.getWorktreesAsync).mockResolvedValue(mockWorktrees);
		vi.mocked(gitUtils.getWorktreeStatus)
			.mockResolvedValueOnce({
				hasUncommittedChanges: true,
				hasUntrackedFiles: false,
			})
			.mockResolvedValueOnce({
				hasUncommittedChanges: false,
				hasUntrackedFiles: true,
			});

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toContain("Status: modified");
			expect(frame).toContain("Status: untracked files");
		});
	});

	it("should show confirmation dialog when delete is pressed", async () => {
		const mockWorktrees = [
			{
				path: "/path/to/deletable",
				branch: "deletable-branch",
				isCurrentWorktree: false,
				isBare: false,
				isMainWorktree: false,
			},
		];

		vi.mocked(gitUtils.getWorktreesAsync).mockResolvedValue(mockWorktrees);
		vi.mocked(gitUtils.getWorktreeStatus).mockResolvedValue({
			hasUncommittedChanges: false,
			hasUntrackedFiles: false,
		});

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain("deletable-branch");
		});

		// Get the last event handler that was registered with process.stdin.on
		const calls = vi.mocked(process.stdin.on).mock.calls;
		const dataHandlerCall = [...calls]
			.reverse()
			.find((call) => (call[0] as string) === "data");
		const onDataHandler = dataHandlerCall?.[1] as
			| ((chunk: Buffer) => void)
			| undefined;

		expect(onDataHandler).toBeDefined();

		// Simulate pressing 'D' to delete
		if (onDataHandler) {
			await onDataHandler(Buffer.from("d"));
		}

		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toContain("Delete worktree at /path/to/deletable?");
			expect(frame).toContain("Press Y to confirm, N to cancel");
		});
	});

	it("should warn about uncommitted changes in confirmation dialog", async () => {
		const mockWorktrees = [
			{
				path: "/path/to/modified",
				branch: "modified-branch",
				isCurrentWorktree: false,
				isBare: false,
				isMainWorktree: false,
			},
		];

		vi.mocked(gitUtils.getWorktreesAsync).mockResolvedValue(mockWorktrees);
		vi.mocked(gitUtils.getWorktreeStatus).mockResolvedValue({
			hasUncommittedChanges: true,
			hasUntrackedFiles: false,
		});

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain("modified-branch");
		});

		// Get the last event handler that was registered with process.stdin.on
		const calls = vi.mocked(process.stdin.on).mock.calls;
		const dataHandlerCall = [...calls]
			.reverse()
			.find((call) => (call[0] as string) === "data");
		const onDataHandler = dataHandlerCall?.[1] as
			| ((chunk: Buffer) => void)
			| undefined;

		expect(onDataHandler).toBeDefined();

		// Simulate pressing 'D' to delete
		if (onDataHandler) {
			await onDataHandler(Buffer.from("d"));
		}

		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).toContain(
				"Warning: This worktree has uncommitted changes!",
			);
		});
	});

	it("should handle empty worktree list", async () => {
		vi.mocked(gitUtils.getWorktreesAsync).mockResolvedValue([]);

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain("No worktrees found");
		});
	});

	it("should not allow deletion of main or current worktree", async () => {
		const mockWorktrees = [
			{
				path: "/path/to/main",
				branch: "main",
				isCurrentWorktree: false,
				isBare: false,
				isMainWorktree: true,
			},
			{
				path: "/path/to/current",
				branch: "current-branch",
				isCurrentWorktree: true,
				isBare: false,
				isMainWorktree: false,
			},
		];

		vi.mocked(gitUtils.getWorktreesAsync).mockResolvedValue(mockWorktrees);
		vi.mocked(gitUtils.getWorktreeStatus).mockResolvedValue({
			hasUncommittedChanges: false,
			hasUntrackedFiles: false,
		});

		const { lastFrame } = render(<WorktreeManager onBack={mockOnBack} />);

		await vi.waitFor(() => {
			expect(lastFrame()).toContain("main");
		});

		// Get the last event handler that was registered with process.stdin.on
		const calls = vi.mocked(process.stdin.on).mock.calls;
		const dataHandlerCall = [...calls]
			.reverse()
			.find((call) => (call[0] as string) === "data");
		const onDataHandler = dataHandlerCall?.[1] as
			| ((chunk: Buffer) => void)
			| undefined;

		expect(onDataHandler).toBeDefined();

		// Try to delete main worktree
		if (onDataHandler) {
			await onDataHandler(Buffer.from("d"));
		}

		// Should not show confirmation dialog
		await vi.waitFor(() => {
			const frame = lastFrame();
			expect(frame).not.toContain("Delete worktree");
			expect(frame).toContain("Git Worktree Manager");
		});
	});
});
