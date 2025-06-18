import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEventListeners } from "./useEventListeners.js";

// プロセスモックの設定
const mockStdin = {
	removeListener: vi.fn(),
	on: vi.fn(),
};

const mockProcess = {
	stdin: mockStdin,
	removeListener: vi.fn(),
	on: vi.fn(),
};

// グローバルprocessをモック
vi.stubGlobal("process", mockProcess);

describe("useEventListeners", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it("フックが正しく読み込める", async () => {
		const { useEventListeners } = await import("./useEventListeners.js");
		expect(typeof useEventListeners).toBe("function");
	});

	it("必要な型が正しく読み込める", async () => {
		// 型のインポートテスト - 実行時エラーがないことを確認
		expect(async () => {
			await import("../types.js");
		}).not.toThrow();
	});

	it("Reactモジュールが正しく読み込める", async () => {
		expect(async () => {
			await import("react");
		}).not.toThrow();
	});

	describe("初期状態", () => {
		it("初期状態で空のリスナーが設定されている", () => {
			const { result } = renderHook(() => useEventListeners());

			expect(result.current.activeListeners).toEqual({});
		});

		it("setListenersとcleanupListeners関数が提供される", () => {
			const { result } = renderHook(() => useEventListeners());

			expect(typeof result.current.setListeners).toBe("function");
			expect(typeof result.current.cleanupListeners).toBe("function");
		});
	});

	describe("リスナーの設定", () => {
		it("新しいリスナーを設定できる", () => {
			const { result } = renderHook(() => useEventListeners());
			const mockHandleInput = vi.fn();
			const mockHandleResize = vi.fn();
			const mockDataDisposable = { dispose: vi.fn() };

			const listeners = {
				handleInput: mockHandleInput,
				handleResize: mockHandleResize,
				dataDisposable: mockDataDisposable,
			};

			act(() => {
				result.current.setListeners(listeners);
			});

			expect(result.current.activeListeners).toEqual(listeners);
		});

		it("空のリスナーオブジェクトも設定できる", () => {
			const { result } = renderHook(() => useEventListeners());

			act(() => {
				result.current.setListeners({});
			});

			expect(result.current.activeListeners).toEqual({});
		});
	});

	describe("リスナーのクリーンアップ", () => {
		it("handleInputリスナーがある場合は削除される", () => {
			const { result } = renderHook(() => useEventListeners());
			const mockHandleInput = vi.fn();

			act(() => {
				result.current.setListeners({ handleInput: mockHandleInput });
			});

			act(() => {
				result.current.cleanupListeners();
			});

			expect(mockStdin.removeListener).toHaveBeenCalledWith(
				"data",
				mockHandleInput,
			);
			expect(result.current.activeListeners).toEqual({});
		});

		it("handleResizeリスナーがある場合は削除される", () => {
			const { result } = renderHook(() => useEventListeners());
			const mockHandleResize = vi.fn();

			act(() => {
				result.current.setListeners({ handleResize: mockHandleResize });
			});

			act(() => {
				result.current.cleanupListeners();
			});

			expect(mockProcess.removeListener).toHaveBeenCalledWith(
				"SIGWINCH",
				mockHandleResize,
			);
			expect(result.current.activeListeners).toEqual({});
		});

		it("dataDisposableがある場合はdisposeされる", () => {
			const { result } = renderHook(() => useEventListeners());
			const mockDataDisposable = { dispose: vi.fn() };

			act(() => {
				result.current.setListeners({
					dataDisposable: mockDataDisposable,
				});
			});

			act(() => {
				result.current.cleanupListeners();
			});

			expect(mockDataDisposable.dispose).toHaveBeenCalledTimes(1);
			expect(result.current.activeListeners).toEqual({});
		});

		it("複数のリスナーがある場合はすべてクリーンアップされる", () => {
			const { result } = renderHook(() => useEventListeners());
			const mockHandleInput = vi.fn();
			const mockHandleResize = vi.fn();
			const mockDataDisposable = { dispose: vi.fn() };

			const listeners = {
				handleInput: mockHandleInput,
				handleResize: mockHandleResize,
				dataDisposable: mockDataDisposable,
			};

			act(() => {
				result.current.setListeners(listeners);
			});

			act(() => {
				result.current.cleanupListeners();
			});

			expect(mockStdin.removeListener).toHaveBeenCalledWith(
				"data",
				mockHandleInput,
			);
			expect(mockProcess.removeListener).toHaveBeenCalledWith(
				"SIGWINCH",
				mockHandleResize,
			);
			expect(mockDataDisposable.dispose).toHaveBeenCalledTimes(1);
			expect(result.current.activeListeners).toEqual({});
		});

		it("リスナーがない場合でもエラーにならない", () => {
			const { result } = renderHook(() => useEventListeners());

			expect(() => {
				act(() => {
					result.current.cleanupListeners();
				});
			}).not.toThrow();

			expect(result.current.activeListeners).toEqual({});
		});
	});

	describe("リスナーの置き換え", () => {
		it("新しいリスナーを設定する際、古いリスナーがクリーンアップされる", () => {
			const { result } = renderHook(() => useEventListeners());

			// 最初のリスナーを設定
			const oldMockHandleInput = vi.fn();
			const oldMockDataDisposable = { dispose: vi.fn() };

			act(() => {
				result.current.setListeners({
					handleInput: oldMockHandleInput,
					dataDisposable: oldMockDataDisposable,
				});
			});

			// 新しいリスナーを設定
			const newMockHandleInput = vi.fn();
			const newMockDataDisposable = { dispose: vi.fn() };

			act(() => {
				result.current.setListeners({
					handleInput: newMockHandleInput,
					dataDisposable: newMockDataDisposable,
				});
			});

			expect(mockStdin.removeListener).toHaveBeenCalledWith(
				"data",
				oldMockHandleInput,
			);
			expect(oldMockDataDisposable.dispose).toHaveBeenCalledTimes(1);
			expect(result.current.activeListeners.handleInput).toEqual(
				newMockHandleInput,
			);
			expect(result.current.activeListeners.dataDisposable).toEqual(
				newMockDataDisposable,
			);
		});
	});

	describe("アンマウント時の自動クリーンアップ", () => {
		it("コンポーネントがアンマウントされるとリスナーがクリーンアップされる", () => {
			const { result, unmount } = renderHook(() => useEventListeners());
			const mockHandleInput = vi.fn();
			const mockDataDisposable = { dispose: vi.fn() };

			act(() => {
				result.current.setListeners({
					handleInput: mockHandleInput,
					dataDisposable: mockDataDisposable,
				});
			});

			unmount();

			expect(mockStdin.removeListener).toHaveBeenCalledWith(
				"data",
				mockHandleInput,
			);
			expect(mockDataDisposable.dispose).toHaveBeenCalledTimes(1);
		});
	});
});
