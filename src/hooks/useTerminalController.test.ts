import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TmuxSession } from "../utils/tmuxUtils.js";

// TmuxSessionのモック
const mockTmuxSession: TmuxSession = {
	sessionName: "test-session",
	paneName: "test-pane",
	lastCapturedLine: 0,
	outputMonitor: undefined,
};

// tmuxUtilsのモック
vi.mock("../utils/tmuxUtils.js", () => ({
	createTmuxSession: vi.fn(() => mockTmuxSession),
	sendInput: vi.fn(),
	captureOutput: vi.fn(() => "test output"),
	captureIncrementalOutput: vi.fn(() => ({ output: "incremental output", newLastLine: 10 })),
	resizePane: vi.fn(),
	isSessionRunning: vi.fn(() => true),
	hasCommandExited: vi.fn(() => false),
	killSession: vi.fn(),
	createOutputMonitor: vi.fn(() => ({
		stdout: { on: vi.fn() },
		on: vi.fn(),
		kill: vi.fn(),
		killed: false,
	})),
	getCurrentTerminalDimensions: vi.fn(() => ({ cols: 120, rows: 30 })),
}));

// プロセスモック
const mockStdout = {
	write: vi.fn(),
	columns: 120,
	rows: 30,
};

const mockStdin = {
	isTTY: true,
	setRawMode: vi.fn(),
	resume: vi.fn(),
	on: vi.fn(),
	removeListener: vi.fn(),
};

const mockProcess = {
	stdout: mockStdout,
	stdin: mockStdin,
	cwd: vi.fn(() => "/test/dir"),
	env: { TEST: "value" },
	on: vi.fn(),
	removeListener: vi.fn(),
	argv: ["node", "script.js", "arg1", "arg2"],
};

// グローバルモック
vi.stubGlobal("process", mockProcess);

describe("useTerminalController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("フックが正しく読み込める", async () => {
		const { useTerminalController } = await import(
			"./useTerminalController.js"
		);
		expect(typeof useTerminalController).toBe("function");
	});

	it("必要な定数が正しく読み込める", async () => {
		const { TERMINAL_CONFIG } = await import("../constants.js");
		expect(typeof TERMINAL_CONFIG).toBe("object");
		expect(typeof TERMINAL_CONFIG.CLEAR_SCREEN_SEQUENCE).toBe("string");
		expect(typeof TERMINAL_CONFIG.PROCESS_NAME).toBe("string");
		expect(typeof TERMINAL_CONFIG.XTERM_NAME).toBe("string");
	});

	it("tmuxUtilsモジュールが正しく読み込める", async () => {
		// tmuxUtilsのインポートテスト
		expect(async () => {
			await import("../utils/tmuxUtils.js");
		}).not.toThrow();
	});

	describe("画面クリア機能", () => {
		it("clearScreen関数が提供される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			expect(typeof result.current.clearScreen).toBe("function");
		});

		it("clearScreen実行時に適切なエスケープシーケンスが送信される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			act(() => {
				result.current.clearScreen();
			});

			expect(mockStdout.write).toHaveBeenCalledWith("\x1b[2J\x1b[H");
		});
	});

	describe("PTYプロセス作成", () => {
		it("createTmuxProcess関数が提供される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			expect(typeof result.current.createTmuxProcess).toBe("function");
		});

		it("引数なしでPTYプロセスを作成できる", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const { createTmuxSession } = await import("../utils/tmuxUtils.js");
			const tmuxSession = result.current.createTmuxProcess("test-session-1");

			expect(createTmuxSession).toHaveBeenCalledWith(
				"test-session-1",
				"claude",
				"/test/dir",
				{ TEST: "value" },
				{ cols: 120, rows: 30 },
			);
			expect(tmuxSession).toBe(mockTmuxSession);
		});

		it("引数を指定してPTYプロセスを作成できる", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const { createTmuxSession } = await import("../utils/tmuxUtils.js");
			const args = ["--verbose", "--config=test"];
			const tmuxSession = result.current.createTmuxProcess("test-session-2", args);

			expect(createTmuxSession).toHaveBeenCalledWith(
				"test-session-2",
				"claude --verbose --config=test",
				"/test/dir",
				{ TEST: "value" },
				{ cols: 120, rows: 30 },
			);
			expect(tmuxSession).toBe(mockTmuxSession);
		});

		it("標準出力サイズが未定義の場合はデフォルト値を使用する", async () => {
			// 標準出力サイズを未定義に設定
			const mockProcessWithoutSize = {
				...mockProcess,
				stdout: {
					...mockStdout,
					columns: undefined,
					rows: undefined,
				},
			};
			vi.stubGlobal("process", mockProcessWithoutSize);

			// getCurrentTerminalDimensionsをモックしてデフォルト値を返すようにする
			const tmuxUtils = await import("../utils/tmuxUtils.js");
			vi.mocked(tmuxUtils.getCurrentTerminalDimensions).mockReturnValueOnce({
				cols: 80,
				rows: 24,
			});

			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const { createTmuxSession } = await import("../utils/tmuxUtils.js");
			const tmuxSession = result.current.createTmuxProcess("test-session-3");

			expect(createTmuxSession).toHaveBeenCalledWith(
				"test-session-3",
				"claude",
				"/test/dir",
				{ TEST: "value" },
				{ cols: 80, rows: 24 },
			);
		});
	});

	describe("プロセスリスナー設定", () => {
		it("setupPersistentDataListener関数が提供される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			expect(typeof result.current.setupPersistentDataListener).toBe(
				"function",
			);
		});

		it("setupActiveSessionListeners関数が提供される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			expect(typeof result.current.setupActiveSessionListeners).toBe(
				"function",
			);
		});

		it("永続的データリスナーが正しく設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const { createOutputMonitor } = await import("../utils/tmuxUtils.js");
			const mockOnData = vi.fn();
			const mockIsActive = vi.fn().mockReturnValue(true);

			const dataDisposable = result.current.setupPersistentDataListener(
				mockTmuxSession,
				mockOnData,
				mockIsActive,
			);

			expect(createOutputMonitor).toHaveBeenCalledWith(mockTmuxSession, expect.any(Function));
			expect(dataDisposable).toBeDefined();
			expect(typeof dataDisposable.dispose).toBe("function");
		});

		it("アクティブセッションリスナーが正しく設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			// No need to mock onData for tmux implementation

			const listeners =
				result.current.setupActiveSessionListeners(mockTmuxSession);

			expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
			expect(mockStdin.resume).toHaveBeenCalled();
			expect(mockStdin.on).toHaveBeenCalledWith("data", listeners.handleInput);
			expect(typeof listeners.handleInput).toBe("function");
			expect(typeof listeners.handleResize).toBe("function");
		});

		it("リサイズリスナーが正しく設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			// No need to mock onData for tmux implementation

			const listeners =
				result.current.setupActiveSessionListeners(mockTmuxSession);

			expect(mockProcess.on).toHaveBeenCalledWith(
				"SIGWINCH",
				listeners.handleResize,
			);
			expect(typeof listeners.handleResize).toBe("function");
		});

		it("永続的データリスナーでアクティブ時のみ出力される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const { createOutputMonitor } = await import("../utils/tmuxUtils.js");
			const mockOnData = vi.fn();
			const mockIsActive = vi.fn();
			let onDataCallback: (data: string) => void = () => {};

			// Mock the output monitor to capture the callback
			(createOutputMonitor as any).mockImplementation((session: any, callback: (data: string) => void) => {
				onDataCallback = callback;
				return {
					stdout: { on: vi.fn() },
					on: vi.fn(),
					kill: vi.fn(),
					killed: false,
				};
			});

			result.current.setupPersistentDataListener(
				mockTmuxSession,
				mockOnData,
				mockIsActive,
			);

			// アクティブな場合
			mockIsActive.mockReturnValue(true);
			act(() => {
				onDataCallback("test data");
			});

			expect(mockOnData).toHaveBeenCalledWith("test data");
			expect(mockStdout.write).toHaveBeenCalledWith("test data");

			// 非アクティブな場合
			mockIsActive.mockReturnValue(false);
			mockStdout.write.mockClear();
			act(() => {
				onDataCallback("test data 2");
			});

			expect(mockOnData).toHaveBeenCalledWith("test data 2");
			expect(mockStdout.write).not.toHaveBeenCalled();
		});

		it("TTYでない場合はsetRawModeが呼ばれない", async () => {
			// TTYでない環境をシミュレート
			const mockProcessNoTTY = {
				...mockProcess,
				stdin: {
					...mockStdin,
					isTTY: false,
				},
			};
			vi.stubGlobal("process", mockProcessNoTTY);

			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			// No need to mock onData for tmux implementation

			result.current.setupActiveSessionListeners(mockTmuxSession);

			expect(mockProcessNoTTY.stdin.setRawMode).not.toHaveBeenCalled();
			expect(mockProcessNoTTY.stdin.resume).toHaveBeenCalled();
		});
	});

	describe("統合テスト", () => {
		it("永続的データリスナーがアクティブ時にデータを標準出力に書き込む", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const { createOutputMonitor } = await import("../utils/tmuxUtils.js");
			const testData = "test output data";
			let capturedCallback: (data: string) => void = () => {};

			// Mock the output monitor to capture the callback
			(createOutputMonitor as any).mockImplementation((session: any, callback: (data: string) => void) => {
				capturedCallback = callback;
				return {
					stdout: { on: vi.fn() },
					on: vi.fn(),
					kill: vi.fn(),
					killed: false,
				};
			});

			const mockOnData = vi.fn();
			const mockIsActive = vi.fn().mockReturnValue(true); // Session is active

			result.current.setupPersistentDataListener(
				mockTmuxSession,
				mockOnData,
				mockIsActive,
			);

			// Simulate data from tmux
			act(() => {
				capturedCallback(testData);
			});

			// Verify data was passed to onData callback
			expect(mockOnData).toHaveBeenCalledWith(testData);
			// Verify data was written to stdout (because session is active)
			expect(mockStdout.write).toHaveBeenCalledWith(testData);
		});

		it("入力がPTYプロセスに正しく送信される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			// No need to mock onData for tmux implementation

			const listeners =
				result.current.setupActiveSessionListeners(mockTmuxSession);

			const testInput = Buffer.from("test input");

			// 入力をシミュレート
			act(() => {
				listeners.handleInput?.(testInput);
			});

			const { sendInput } = await import("../utils/tmuxUtils.js");
			expect(sendInput).toHaveBeenCalledWith(mockTmuxSession, "test input");
		});

		it("リサイズイベントがPTYプロセスに正しく伝達される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			// No need to mock onData for tmux implementation

			const listeners =
				result.current.setupActiveSessionListeners(mockTmuxSession);

			// リサイズをシミュレート
			act(() => {
				listeners.handleResize?.();
			});

			const { resizePane } = await import("../utils/tmuxUtils.js");
			expect(resizePane).toHaveBeenCalledWith(mockTmuxSession, {
				cols: 120,
				rows: 30,
			});
		});
	});
});
