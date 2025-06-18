import { describe, expect, it } from "vitest";
import { getSessionPreview, getSessionStatus } from "./sessionUtils.js";

describe("sessionUtils", () => {
	describe("getSessionStatus", () => {
		it("should return 'Idle' when no outputs", () => {
			expect(getSessionStatus([])).toBe("Idle");
		});

		it("should return 'Running' when output contains running patterns", () => {
			const outputs = [Buffer.from("Some text\nESC to interrupt\nMore text")];
			expect(getSessionStatus(outputs)).toBe("Running");
		});

		it("should return 'Running' with case-insensitive pattern matching", () => {
			const outputs = [Buffer.from("Some text\nEsc To Interrupt\nMore text")];
			expect(getSessionStatus(outputs)).toBe("Running");
		});

		it("should return 'Awaiting Input' when output contains input patterns", () => {
			const outputs = [Buffer.from("│ Do you want to continue?")];
			expect(getSessionStatus(outputs)).toBe("Awaiting Input");
		});

		it("should return 'Awaiting Input' for 'would you like' patterns", () => {
			const outputs = [Buffer.from("│ Would you like to proceed?")];
			expect(getSessionStatus(outputs)).toBe("Awaiting Input");
		});

		it("should return 'Awaiting Input' when last line ends with colon", () => {
			const outputs = [Buffer.from("Enter your name:")];
			expect(getSessionStatus(outputs)).toBe("Awaiting Input");
		});

		it("should return 'Awaiting Input' when last line ends with question mark", () => {
			const outputs = [Buffer.from("What is your choice?")];
			expect(getSessionStatus(outputs)).toBe("Awaiting Input");
		});

		it("should handle ANSI escape sequences", () => {
			const outputs = [
				Buffer.from("\x1b[31mESC to interrupt\x1b[0m"),
			];
			expect(getSessionStatus(outputs)).toBe("Running");
		});

		it("should prioritize 'Running' over 'Awaiting Input'", () => {
			const outputs = [
				Buffer.from("│ Do you want to continue?\nESC to interrupt"),
			];
			expect(getSessionStatus(outputs)).toBe("Running");
		});

		it("should handle multiple buffers", () => {
			const outputs = [
				Buffer.from("Some initial text"),
				Buffer.from("More text"),
				Buffer.from("ESC to interrupt"),
			];
			expect(getSessionStatus(outputs)).toBe("Running");
		});

		it("should only check recent output (last 100 buffers)", () => {
			const outputs: Buffer[] = [];
			// Add 101 buffers with idle content
			for (let i = 0; i < 101; i++) {
				outputs.push(Buffer.from("Idle content"));
			}
			// The first buffer (which would have running pattern) should be ignored
			outputs[0] = Buffer.from("ESC to interrupt");
			expect(getSessionStatus(outputs)).toBe("Idle");
		});

		it("should handle empty lines correctly", () => {
			const outputs = [Buffer.from("\n\n\n")];
			expect(getSessionStatus(outputs)).toBe("Idle");
		});

		it("should handle whitespace-only last line", () => {
			const outputs = [Buffer.from("Some text\n   \n")]
			expect(getSessionStatus(outputs)).toBe("Idle");
		});
	});

	describe("getSessionPreview", () => {
		it("should return empty string when no outputs", () => {
			expect(getSessionPreview([])).toBe("");
		});

		it("should return simple text", () => {
			const outputs = [Buffer.from("Hello world")];
			expect(getSessionPreview(outputs)).toBe("Hello world");
		});

		it("should filter out UI elements", () => {
			const outputs = [Buffer.from("│ Some text │\n╭───╮\nActual content")];
			expect(getSessionPreview(outputs)).toBe("Actual content");
		});

		it("should filter out hint patterns", () => {
			const outputs = [
				Buffer.from("Use /ide to connect to your IDE\n※ Tip: something\nReal content"),
			];
			expect(getSessionPreview(outputs)).toBe("Real content");
		});

		it("should filter out multiple patterns case-insensitively", () => {
			const outputs = [
				Buffer.from("? for shortcuts\nAuto-accept edits ON\nPlan mode ON\nImportant message"),
			];
			expect(getSessionPreview(outputs)).toBe("Important message");
		});

		it("should join multiple lines with space", () => {
			const outputs = [Buffer.from("Line 1\nLine 2\nLine 3")];
			expect(getSessionPreview(outputs)).toBe("Line 1 Line 2 Line 3");
		});

		it("should normalize whitespace", () => {
			const outputs = [Buffer.from("Text   with    multiple     spaces")];
			expect(getSessionPreview(outputs)).toBe("Text with multiple spaces");
		});

		it("should truncate long previews", () => {
			const longText = "a".repeat(250);
			const outputs = [Buffer.from(longText)];
			const preview = getSessionPreview(outputs);
			expect(preview.length).toBe(201); // 200 chars + ellipsis
			expect(preview.startsWith("…")).toBe(true);
			expect(preview.endsWith("a".repeat(200))).toBe(true);
		});

		it("should handle ANSI escape sequences", () => {
			const outputs = [
				Buffer.from("\x1b[31mColored text\x1b[0m"),
			];
			expect(getSessionPreview(outputs)).toBe("Colored text");
		});

		it("should only process last 10 buffers", () => {
			const outputs: Buffer[] = [];
			for (let i = 0; i < 15; i++) {
				outputs.push(Buffer.from(`Buffer ${i}`));
			}
			const preview = getSessionPreview(outputs);
			// Should only include buffers 5-14
			expect(preview).toContain("Buffer 14");
			expect(preview).not.toContain("Buffer 4");
		});

		it("should handle empty lines and filter them out", () => {
			const outputs = [Buffer.from("Text\n\n\nMore text")];
			expect(getSessionPreview(outputs)).toBe("Text More text");
		});

		it("should handle mixed content correctly", () => {
			const outputs = [
				Buffer.from("│ UI element\nReal content\nuse /ide to connect to your ide\nMore real content"),
			];
			expect(getSessionPreview(outputs)).toBe("Real content More real content");
		});

		it("should preserve content that contains filter patterns as substrings", () => {
			const outputs = [Buffer.from("This is about tips and shortcuts but not a tip itself")];
			expect(getSessionPreview(outputs)).toBe("This is about tips and shortcuts but not a tip itself");
		});
	});
});