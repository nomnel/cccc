import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TmuxSession } from "../utils/tmuxUtils.js";
import { useSessionManager } from "./useSessionManager.js";

// Mock tmuxUtils
vi.mock("../utils/tmuxUtils.js", () => ({
	killSession: vi.fn(),
}));

// モックTmuxSessionを作成
const createMockTmuxSession = (name = "test-session"): TmuxSession => ({
	sessionName: name,
	paneName: `${name}-pane`,
	lastCapturedLine: 0,
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
			const mockTmuxSession = createMockTmuxSession();

			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			expect(result.current.sessions).toHaveLength(1);
			expect(result.current.sessions[0]?.id).toBe("session-1");
			expect(result.current.sessions[0]?.tmuxSession).toBe(mockTmuxSession);
		});

		it("複数のセッションを追加できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession1 = createMockTmuxSession("session-1");
			const mockTmuxSession2 = createMockTmuxSession("session-2");

			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession1,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			act(() => {
				result.current.addSession({
					id: "session-2",
					tmuxSession: mockTmuxSession2,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
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
			const mockTmuxSession1 = createMockTmuxSession("session-1");
			const mockTmuxSession2 = createMockTmuxSession("session-2");

			// セッションを2つ追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession1,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
				result.current.addSession({
					id: "session-2",
					tmuxSession: mockTmuxSession2,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
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
			const mockTmuxSession = createMockTmuxSession();

			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
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
			const mockTmuxSession = createMockTmuxSession();

			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			const session = result.current.findSession("session-1");
			expect(session).toBeDefined();
			expect(session?.id).toBe("session-1");
			expect(session?.tmuxSession).toBe(mockTmuxSession);
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

	describe("セッション出力の追加", () => {
		it("指定されたセッションに出力を追加できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession = createMockTmuxSession();

			// セッションを追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			// 出力を追加
			act(() => {
				result.current.appendOutput("session-1", Buffer.from("Hello World\n"));
			});

			const session = result.current.findSession("session-1");
			expect(session?.outputs).toEqual([Buffer.from("Hello World\n")]);
		});

		it("複数の出力を順番に追加できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession = createMockTmuxSession();

			// セッションを追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			// 複数の出力を追加
			act(() => {
				result.current.appendOutput("session-1", Buffer.from("Line 1\n"));
				result.current.appendOutput("session-1", Buffer.from("Line 2\n"));
				result.current.appendOutput("session-1", Buffer.from("Line 3\n"));
			});

			const session = result.current.findSession("session-1");
			expect(session?.outputs).toEqual([
				Buffer.from("Line 1\n"),
				Buffer.from("Line 2\n"),
				Buffer.from("Line 3\n"),
			]);
		});

		it("既存の出力がある場合は追加される", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession = createMockTmuxSession();

			// 既存の出力があるセッションを追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [Buffer.from("Existing output\n")],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			// 新しい出力を追加
			act(() => {
				result.current.appendOutput("session-1", Buffer.from("New output\n"));
			});

			const session = result.current.findSession("session-1");
			expect(session?.outputs).toEqual([
				Buffer.from("Existing output\n"),
				Buffer.from("New output\n"),
			]);
		});

		it("存在しないセッションIDに対しては何も起こらない", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession = createMockTmuxSession();

			// セッションを追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			// 存在しないセッションに出力を追加
			act(() => {
				result.current.appendOutput(
					"non-existent",
					Buffer.from("Test output\n"),
				);
			});

			// 既存のセッションには影響なし
			const session = result.current.findSession("session-1");
			expect(session?.outputs).toEqual([]);
		});

		it("複数のセッションで独立して出力を管理できる", () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession1 = createMockTmuxSession("session-1");
			const mockTmuxSession2 = createMockTmuxSession("session-2");

			// 2つのセッションを追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession1,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
				result.current.addSession({
					id: "session-2",
					tmuxSession: mockTmuxSession2,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			// それぞれのセッションに異なる出力を追加
			act(() => {
				result.current.appendOutput(
					"session-1",
					Buffer.from("Session 1 output\n"),
				);
				result.current.appendOutput(
					"session-2",
					Buffer.from("Session 2 output\n"),
				);
				result.current.appendOutput(
					"session-1",
					Buffer.from("More for session 1\n"),
				);
			});

			const session1 = result.current.findSession("session-1");
			const session2 = result.current.findSession("session-2");

			expect(session1?.outputs).toEqual([
				Buffer.from("Session 1 output\n"),
				Buffer.from("More for session 1\n"),
			]);
			expect(session2?.outputs).toEqual([Buffer.from("Session 2 output\n")]);
		});
	});

	describe("全セッション終了", () => {
		it("すべてのセッションのプロセスを終了し、リストをクリアする", async () => {
			const { result } = renderHook(() => useSessionManager());
			const mockTmuxSession1 = createMockTmuxSession("session-1");
			const mockTmuxSession2 = createMockTmuxSession("session-2");

			// セッションを2つ追加
			act(() => {
				result.current.addSession({
					id: "session-1",
					tmuxSession: mockTmuxSession1,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
				result.current.addSession({
					id: "session-2",
					tmuxSession: mockTmuxSession2,
					outputs: [],
					lastUpdated: new Date(),
					status: "Idle",
					preview: "",
				});
			});

			// 全セッション終了
			act(() => {
				result.current.killAllSessions();
			});

			const { killSession } = await import("../utils/tmuxUtils.js");
			expect(killSession).toHaveBeenCalledWith(mockTmuxSession1);
			expect(killSession).toHaveBeenCalledWith(mockTmuxSession2);
			expect(killSession).toHaveBeenCalledTimes(2);
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
