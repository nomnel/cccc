import { describe, expect, it } from "vitest";
import { getRepositoryName } from "./gitUtils.js";

describe("getRepositoryName", () => {
	it("should extract repository name from the current repository", () => {
		// This will test against the actual repository we're in
		const repoName = getRepositoryName();
		expect(repoName).toBe("cccc");
	});

	it("should return null with an invalid working directory", () => {
		// Test with a non-existent directory
		const repoName = getRepositoryName("/non/existent/directory");
		expect(repoName).toBeNull();
	});
});
