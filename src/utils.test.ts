import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_OPTIONS } from "./constants.js";
import { getShell, isMenuOption, isSessionId } from "./utils.js";

describe("utils", () => {
	describe("getShell", () => {
		beforeEach(() => {
			vi.resetModules();
		});

		it("windowsの場合はpowershell.exeを返す", async () => {
			vi.doMock("node:os", () => ({
				platform: () => "win32",
			}));

			// 動的インポートして新しいモジュールを取得
			const { getShell } = await import("./utils.js");
			expect(getShell()).toBe("powershell.exe");
		});

		it("windows以外でSHELL環境変数がある場合はそれを返す", async () => {
			vi.doMock("node:os", () => ({
				platform: () => "linux",
			}));

			const originalShell = process.env.SHELL;
			process.env.SHELL = "/bin/zsh";

			const { getShell } = await import("./utils.js");
			expect(getShell()).toBe("/bin/zsh");

			process.env.SHELL = originalShell;
		});

		it("windows以外でSHELL環境変数がない場合はbashを返す", async () => {
			vi.doMock("node:os", () => ({
				platform: () => "linux",
			}));

			const originalShell = process.env.SHELL;
			process.env.SHELL = "";

			const { getShell } = await import("./utils.js");
			expect(getShell()).toBe("bash");

			process.env.SHELL = originalShell;
		});
	});

	describe("isMenuOption", () => {
		it("start new sessionオプションの場合はtrueを返す", () => {
			expect(isMenuOption(MENU_OPTIONS.START_NEW_SESSION)).toBe(true);
		});

		it("exitオプションの場合はtrueを返す", () => {
			expect(isMenuOption(MENU_OPTIONS.EXIT)).toBe(true);
		});

		it("メニューオプション以外の場合はfalseを返す", () => {
			expect(isMenuOption("session-1")).toBe(false);
			expect(isMenuOption("random-string")).toBe(false);
		});
	});

	describe("isSessionId", () => {
		it("メニューオプションではない文字列の場合はtrueを返す", () => {
			expect(isSessionId("session-1")).toBe(true);
			expect(isSessionId("random-session")).toBe(true);
		});

		it("メニューオプションの場合はfalseを返す", () => {
			expect(isSessionId(MENU_OPTIONS.START_NEW_SESSION)).toBe(false);
			expect(isSessionId(MENU_OPTIONS.EXIT)).toBe(false);
		});
	});
});
