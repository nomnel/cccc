import { describe, expect, it } from "vitest";
import {
	MENU_OPTIONS,
	SCREENS,
	SESSION_PREFIX,
	TERMINAL_CONFIG,
} from "./constants.js";

describe("constants", () => {
	describe("TERMINAL_CONFIG", () => {
		it("すべての設定値が定義されている", () => {
			expect(TERMINAL_CONFIG.DEFAULT_COLS).toBe(80);
			expect(TERMINAL_CONFIG.DEFAULT_ROWS).toBe(24);
			expect(TERMINAL_CONFIG.CLEAR_SCREEN_SEQUENCE).toBe("\x1b[2J\x1b[H");
			expect(TERMINAL_CONFIG.PROCESS_NAME).toBe("claude");
			expect(TERMINAL_CONFIG.XTERM_NAME).toBe("xterm-color");
		});

		it("すべての値が正しい型である", () => {
			expect(typeof TERMINAL_CONFIG.DEFAULT_COLS).toBe("number");
			expect(typeof TERMINAL_CONFIG.DEFAULT_ROWS).toBe("number");
			expect(typeof TERMINAL_CONFIG.CLEAR_SCREEN_SEQUENCE).toBe("string");
			expect(typeof TERMINAL_CONFIG.PROCESS_NAME).toBe("string");
			expect(typeof TERMINAL_CONFIG.XTERM_NAME).toBe("string");
		});

		it("数値は正の値である", () => {
			expect(TERMINAL_CONFIG.DEFAULT_COLS).toBeGreaterThan(0);
			expect(TERMINAL_CONFIG.DEFAULT_ROWS).toBeGreaterThan(0);
		});
	});

	describe("SCREENS", () => {
		it("すべての画面タイプが定義されている", () => {
			expect(SCREENS.MENU).toBe("menu");
			expect(SCREENS.CLAUDE).toBe("claude");
			expect(SCREENS.WORKTREE).toBe("worktree");
		});

		it("すべての値が文字列である", () => {
			expect(typeof SCREENS.MENU).toBe("string");
			expect(typeof SCREENS.CLAUDE).toBe("string");
			expect(typeof SCREENS.WORKTREE).toBe("string");
		});
	});

	describe("SESSION_PREFIX", () => {
		it("セッションプレフィックスが正しく定義されている", () => {
			expect(SESSION_PREFIX).toBe("session-");
			expect(typeof SESSION_PREFIX).toBe("string");
			expect(SESSION_PREFIX.length).toBeGreaterThan(0);
		});
	});

	describe("MENU_OPTIONS", () => {
		it("すべてのメニューオプションが定義されている", () => {
			expect(MENU_OPTIONS.START_NEW_SESSION).toBe("start_new_session");
			expect(MENU_OPTIONS.MANAGE_WORKTREES).toBe("manage_worktrees");
			expect(MENU_OPTIONS.EXIT).toBe("exit");
		});

		it("すべての値が文字列である", () => {
			expect(typeof MENU_OPTIONS.START_NEW_SESSION).toBe("string");
			expect(typeof MENU_OPTIONS.MANAGE_WORKTREES).toBe("string");
			expect(typeof MENU_OPTIONS.EXIT).toBe("string");
		});
	});
});
