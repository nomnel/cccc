import { describe, expect, it } from "vitest";
import { getSessionDisplayName } from "./notificationUtils.js";

describe("notificationUtils", () => {
	describe("getSessionDisplayName", () => {
		it("should return display name with branch, repoName, and settingsName", () => {
			const session = {
				id: "session-1",
				repoName: "my-repo",
				branch: "feature-branch",
				settingsName: "dev",
			};

			const result = getSessionDisplayName(session);

			expect(result).toBe("my-repo/feature-branch:dev");
		});

		it("should return display name with only branch and repoName", () => {
			const session = {
				id: "session-1",
				repoName: "my-repo",
				branch: "main",
			};

			const result = getSessionDisplayName(session);

			expect(result).toBe("my-repo/main");
		});

		it("should derive repoName from workingDirectory", () => {
			const session = {
				id: "session-1",
				workingDirectory: "/Users/user/projects/my-project",
				branch: "develop",
			};

			const result = getSessionDisplayName(session);

			expect(result).toBe("my-project/develop");
		});

		it("should return ID when neither repoName nor workingDirectory exists", () => {
			const session = {
				id: "session-1",
			};

			const result = getSessionDisplayName(session);

			expect(result).toBe("session-1");
		});

		it("should return directory name when only workingDirectory exists", () => {
			const session = {
				id: "session-1",
				workingDirectory: "/Users/user/projects/my-project",
			};

			const result = getSessionDisplayName(session);

			expect(result).toBe("my-project");
		});

		it("should return settingsName with prefix colon when only settingsName exists", () => {
			const session = {
				id: "session-1",
				settingsName: "production",
			};

			const result = getSessionDisplayName(session);

			expect(result).toBe(":production");
		});
	});

	// Note: sendNotification and sendSessionStatusNotification functions
	// depend on exec from node:child_process which is difficult to mock
	// properly due to promisify. These functions have been manually tested
	// on macOS to verify they work correctly.
});
