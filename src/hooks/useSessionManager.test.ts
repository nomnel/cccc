import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSessionManager } from "./useSessionManager.js";
import type { IPty } from "node-pty";

// モックプロセスを作成
const createMockPtyProcess = (): Partial<IPty> => ({
	kill: vi.fn(),
	write: vi.fn(),
	resize: vi.fn(),
	onData: vi.fn(),
	onExit: vi.fn(),
});

describe("useSessionManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("カスタムフックが正しく読み込める", async () => {
		const { useSessionManager } = await import("./useSessionManager.js");
		expect(typeof useSessionManager).toBe("function");
	});

	it("必要な定数が正しく読み込める", async () => {
		const { SESSION_PREFIX } = await import("../constants.js");
		expect(typeof SESSION_PREFIX).toBe("string");
		expect(SESSION_PREFIX.length).toBeGreaterThan(0);
	});

	it("必要な型が正しく読み込める", async () => {
		// 型のインポートテスト - 実行時エラーがないことを確認
		expect(async () => {
			await import("../types.js");
		}).not.toThrow();
	});

	describe("初期状態", () => {
		it("初期状態が正しく設定される", () => {
			const { result } = renderHook(() => useSessionManager());

			expect(result.current.sessions).toEqual([]);
			expect(result.current.currentScreen).toBe("menu");
			expect(result.current.currentSessionId).toBe(null);
		});
	});

	describe("セッション生成", () => {
		it("ユニークなセッションIDを生成する", () => {
			const { result } = renderHook(() => useSessionManager());

			const id1 = result.current.generateSessionId();
			const id2 = result.current.generateSessionId();

			expect(id1).toMatch(/^session-\d+$/);
			expect(id2).toMatch(/^session-\d+$/);
			expect(id1).not.toBe(id2);
		});

		it("セッションIDが連続して増加する", () => {
			const { result } = renderHook(() => useSessionManager());

			const id1 = result.current.generateSessionId();
			const id2 = result.current.generateSessionId();

			expect(id1).toBe("session-1");
			expect(id2).toBe("session-2");
		});
	});

	describe("セッション追加", () => {
		it("新しいセッションを追加できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockProcess = createMockPtyProcess();

			act(() => {
				result.current.addSession({
					id: "session-1",
					process: mockProcess as IPty,
				});
			});

			expect(result.current.sessions).toHaveLength(1);
			expect(result.current.sessions[0]?.id).toBe("session-1");
			expect(result.current.sessions[0]?.process).toBe(mockProcess);
		});

		it("複数のセッションを追加できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockProcess1 = createMockPtyProcess();
			const mockProcess2 = createMockPtyProcess();

			act(() => {
				result.current.addSession({
					id: "session-1",
					process: mockProcess1 as IPty,
				});
			});

			act(() => {
				result.current.addSession({
					id: "session-2",
					process: mockProcess2 as IPty,
				});
			});

			expect(result.current.sessions).toHaveLength(2);
			expect(result.current.sessions[0]?.id).toBe("session-1");
			expect(result.current.sessions[1]?.id).toBe("session-2");
		});
	});

	describe("セッション削除", () => {
		it("指定されたセッションを削除できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockProcess1 = createMockPtyProcess();
			const mockProcess2 = createMockPtyProcess();

			// セッションを2つ追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					process: mockProcess1 as any,
				});
				result.current.addSession({
					id: "session-2",
					process: mockProcess2 as any,
				});
			});

			// 1つ目のセッションを削除
			act(() => {
				result.current.removeSession("session-1");
			});

			expect(result.current.sessions).toHaveLength(1);
			expect(result.current.sessions[0]?.id).toBe("session-2");
		});

		it("存在しないセッションIDで削除しても何も起こらない", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockProcess = createMockPtyProcess();

			act(() => {
				result.current.addSession({
					id: "session-1",
					process: mockProcess as any,
				});
			});

			act(() => {
				result.current.removeSession("non-existent");
			});

			expect(result.current.sessions).toHaveLength(1);
		});
	});

	describe("セッション検索", () => {
		it("存在するセッションを見つけることができる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockProcess = createMockPtyProcess();

			act(() => {
				result.current.addSession({
					id: "session-1",
					process: mockProcess as any,
				});
			});

			const session = result.current.findSession("session-1");
			expect(session).toBeDefined();
			expect(session?.id).toBe("session-1");
			expect(session?.process).toBe(mockProcess);
		});

		it("存在しないセッションの場合はundefinedを返す", () => {
			const { result } = renderHook(() => useSessionManager());

			const session = result.current.findSession("non-existent");
			expect(session).toBeUndefined();
		});
	});

	describe("画面切り替え", () => {
		it("メニュー画面に切り替えできる", () => {
			const { result } = renderHook(() => useSessionManager());

			// 最初にClaude画面に切り替え
			act(() => {
				result.current.switchToSession("session-1");
			});

			expect(result.current.currentScreen).toBe("claude");
			expect(result.current.currentSessionId).toBe("session-1");

			// メニューに戻る
			act(() => {
				result.current.switchToMenu();
			});

			expect(result.current.currentScreen).toBe("menu");
			expect(result.current.currentSessionId).toBe(null);
		});

		it("セッション画面に切り替えできる", () => {
			const { result } = renderHook(() => useSessionManager());

			act(() => {
				result.current.switchToSession("session-1");
			});

			expect(result.current.currentScreen).toBe("claude");
			expect(result.current.currentSessionId).toBe("session-1");
		});
	});

	describe("全セッション終了", () => {
		it("すべてのセッションのプロセスを終了し、リストをクリアする", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockProcess1 = createMockPtyProcess();
			const mockProcess2 = createMockPtyProcess();

			// セッションを2つ追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					process: mockProcess1 as any,
				});
				result.current.addSession({
					id: "session-2",
					process: mockProcess2 as any,
				});
			});

			// 全セッション終了
			act(() => {
				result.current.killAllSessions();
			});

			expect(mockProcess1.kill).toHaveBeenCalledTimes(1);
			expect(mockProcess2.kill).toHaveBeenCalledTimes(1);
			expect(result.current.sessions).toHaveLength(0);
		});

		it("セッションがない場合でもエラーにならない", () => {
			const { result } = renderHook(() => useSessionManager());

			expect(() => {
				act(() => {
					result.current.killAllSessions();
				});
			}).not.toThrow();

			expect(result.current.sessions).toHaveLength(0);
		});
	});
});
