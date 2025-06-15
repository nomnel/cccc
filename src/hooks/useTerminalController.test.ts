import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// node-ptyのモック
const mockPtyProcess = {
	onData: vi.fn(),
	onExit: vi.fn(),
	write: vi.fn(),
	resize: vi.fn(),
	kill: vi.fn(),
	clear: vi.fn(),
	pause: vi.fn(),
	resume: vi.fn(),
	pid: 1234,
	cols: 80,
	rows: 24,
	process: "bash",
	handleFlowControl: false,
	ptyProcess: null,
	exitCode: null,
	signalCode: null,
};

const mockPty = {
	spawn: vi.fn(() => mockPtyProcess),
};

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
vi.mock("node-pty", () => ({ default: mockPty }));

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

	it("node-ptyモジュールが正しく読み込める", async () => {
		// node-ptyのインポートテスト
		expect(async () => {
			await import("node-pty");
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
		it("createPtyProcess関数が提供される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			expect(typeof result.current.createPtyProcess).toBe("function");
		});

		it("引数なしでPTYプロセスを作成できる", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const ptyProcess = result.current.createPtyProcess();

			expect(mockPty.spawn).toHaveBeenCalledWith("claude", [], {
				name: "xterm-color",
				cols: 120,
				rows: 30,
				cwd: "/test/dir",
				env: { TEST: "value" },
			});
			expect(ptyProcess).toBe(mockPtyProcess);
		});

		it("引数を指定してPTYプロセスを作成できる", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const args = ["--verbose", "--config=test"];
			const ptyProcess = result.current.createPtyProcess(args);

			expect(mockPty.spawn).toHaveBeenCalledWith("claude", args, {
				name: "xterm-color",
				cols: 120,
				rows: 30,
				cwd: "/test/dir",
				env: { TEST: "value" },
			});
			expect(ptyProcess).toBe(mockPtyProcess);
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

			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const ptyProcess = result.current.createPtyProcess();

			expect(mockPty.spawn).toHaveBeenCalledWith("claude", [], {
				name: "xterm-color",
				cols: 80, // デフォルト値
				rows: 24, // デフォルト値
				cwd: "/test/dir",
				env: { TEST: "value" },
			});
		});
	});

	describe("プロセスリスナー設定", () => {
		it("setupProcessListeners関数が提供される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			expect(typeof result.current.setupProcessListeners).toBe("function");
		});

		it("データリスナーが正しく設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const mockOnData = vi.fn();
			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			const listeners = result.current.setupProcessListeners(mockPtyProcess);

			expect(mockPtyProcess.onData).toHaveBeenCalled();
			expect(listeners.dataDisposable).toBeDefined();
			expect(typeof listeners.dataDisposable?.dispose).toBe("function");
		});

		it("入力リスナーが正しく設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			const listeners = result.current.setupProcessListeners(mockPtyProcess);

			expect(mockStdin.setRawMode).toHaveBeenCalledWith(true);
			expect(mockStdin.resume).toHaveBeenCalled();
			expect(mockStdin.on).toHaveBeenCalledWith("data", listeners.handleInput);
			expect(typeof listeners.handleInput).toBe("function");
		});

		it("リサイズリスナーが正しく設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			const listeners = result.current.setupProcessListeners(mockPtyProcess);

			expect(mockProcess.on).toHaveBeenCalledWith(
				"SIGWINCH",
				listeners.handleResize,
			);
			expect(typeof listeners.handleResize).toBe("function");
		});

		it("終了コールバックが設定される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const mockOnExit = vi.fn();
			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			const listeners = result.current.setupProcessListeners(mockPtyProcess, mockOnExit);

			expect(mockPtyProcess.onExit).toHaveBeenCalled();

			// onExitコールバックの実行をテスト
			const onExitCallback = mockPtyProcess.onExit.mock.calls[0]?.[0];
			onExitCallback();

			expect(mockOnExit).toHaveBeenCalled();
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

			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			result.current.setupProcessListeners(mockPtyProcess);

			expect(mockProcessNoTTY.stdin.setRawMode).not.toHaveBeenCalled();
			expect(mockProcessNoTTY.stdin.resume).toHaveBeenCalled();
		});
	});

	describe("統合テスト", () => {
		it("データ出力が正しく標準出力に書き込まれる", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			const testData = "test output data";
			let onDataCallback: (data: string) => void = () => {};

			mockPtyProcess.onData.mockImplementation((callback) => {
				onDataCallback = callback;
				return { dispose: vi.fn() };
			});

			result.current.setupProcessListeners(mockPtyProcess);

			// データ出力をシミュレート
			act(() => {
				onDataCallback(testData);
			});

			expect(mockStdout.write).toHaveBeenCalledWith(testData);
		});

		it("入力がPTYプロセスに正しく送信される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			const listeners = result.current.setupProcessListeners(mockPtyProcess);

			const testInput = Buffer.from("test input");

			// 入力をシミュレート
			act(() => {
				listeners.handleInput?.(testInput);
			});

			expect(mockPtyProcess.write).toHaveBeenCalledWith("test input");
		});

		it("リサイズイベントがPTYプロセスに正しく伝達される", async () => {
			const { useTerminalController } = await import(
				"./useTerminalController.js"
			);
			const { result } = renderHook(() => useTerminalController());

			mockPtyProcess.onData.mockReturnValue({ dispose: vi.fn() });

			const listeners = result.current.setupProcessListeners(mockPtyProcess);

			// リサイズをシミュレート
			act(() => {
				listeners.handleResize?.();
			});

			expect(mockPtyProcess.resize).toHaveBeenCalledWith(120, 30);
		});
	});
});
