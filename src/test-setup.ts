import { vi } from "vitest";

// Mock process.stdout
Object.defineProperty(process.stdout, "write", {
	value: vi.fn(),
});

// Mock process.stdin
Object.defineProperty(process.stdin, "setRawMode", {
	value: vi.fn(),
});

Object.defineProperty(process.stdin, "resume", {
	value: vi.fn(),
});

Object.defineProperty(process.stdin, "on", {
	value: vi.fn(),
});

Object.defineProperty(process.stdin, "removeListener", {
	value: vi.fn(),
});

Object.defineProperty(process.stdin, "isTTY", {
	value: true,
});

// Mock process.on
const originalProcessOn = process.on.bind(process);
process.on = vi.fn().mockImplementation((event, handler) => {
	if (event === "SIGWINCH" || event === "beforeExit") {
		return originalProcessOn(event, handler);
	}
	return process;
});

// Mock process.removeListener
process.removeListener = vi.fn();

// Mock process.argv
process.argv = ["node", "test", "--test-arg"];

// Mock process.stdout dimensions
Object.defineProperty(process.stdout, "columns", {
	value: 80,
});

Object.defineProperty(process.stdout, "rows", {
	value: 24,
});
