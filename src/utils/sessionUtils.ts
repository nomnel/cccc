import stripAnsi from "strip-ansi";
import type { Session } from "../types.js";

// Session preview character limit
const SESSION_PREVIEW_LENGTH = 200;

const FILTER_PATTERNS = [
	// UI elements
	"│ ",
	" │",
	"╭",
	"╮",
	"╰",
	"╯",
	// Hint patterns
	"use /ide to connect to your ide",
	"esc to interrupt",
	"※ tip:",
	"? for shortcuts",
	"auto-accept edits on",
	"plan mode on",
].map((pattern) => pattern.toLowerCase());

const RUNNING_PATTERNS = ["esc to interrupt"];
const AWAITING_INPUT_PATTERNS = ["│ do you want", "│ would you like"];

// Get session status based on recent output
export const getSessionStatus = (
	outputs: Buffer[],
): "Idle" | "Running" | "Awaiting Input" => {
	if (outputs.length === 0) return "Idle";

	// Get last 100 lines of output
	const recentOutput = Buffer.concat(outputs.slice(-100)).toString();
	const cleanOutput = stripAnsi(recentOutput);

	const lines = cleanOutput.split("\n");

	// Check if the last line ends with a colon or question mark (common prompt indicators)
	const lastLine = lines[lines.length - 1]?.trim();
	if (lastLine && (lastLine.endsWith(":") || lastLine.endsWith("?"))) {
		return "Awaiting Input";
	}

	for (const line of lines.reverse()) {
		const normalized = line.trim().toLowerCase();

		if (RUNNING_PATTERNS.some((pattern) => normalized.includes(pattern))) {
			return "Running";
		}

		if (
			AWAITING_INPUT_PATTERNS.some((pattern) => normalized.includes(pattern))
		) {
			return "Awaiting Input";
		}
	}

	return "Idle";
};

// Extract last characters from session outputs, filtering out input prompts and hints
export const getSessionPreview = (outputs: Buffer[]): string => {
	if (outputs.length === 0) return "";

	const recentOutput = Buffer.concat(outputs.slice(-10)).toString();
	const cleanOutput = stripAnsi(recentOutput);

	// Filter out lines that contain input prompts, hints, or common interactive elements
	const lines = cleanOutput.split("\n").filter((line) => {
		const trimmedLine = line.trim();
		if (!trimmedLine) return false;

		const lowerLine = trimmedLine.toLowerCase();
		// FILTER_PATTERNS has already been converted to lowercase
		return FILTER_PATTERNS.every((pattern) => !lowerLine.includes(pattern));
	});

	// Join filtered lines and normalize whitespace
	const preview = lines.join(" ").replace(/\s+/g, " ").trim();

	// Get last characters based on the defined limit
	if (preview.length <= SESSION_PREVIEW_LENGTH) {
		return preview;
	}
	return `…${preview.slice(-SESSION_PREVIEW_LENGTH)}`;
};