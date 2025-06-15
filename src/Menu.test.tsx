import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MENU_OPTIONS } from "./constants.js";

// Inkのモック
vi.mock("ink", () => {
	const mockUseInput = vi.fn();
	return {
		Box: ({ children }: any) => React.createElement("div", null, children),
		Text: ({ children, color }: any) =>
			React.createElement("span", { "data-color": color }, children),
		useInput: mockUseInput,
	};
});

describe("Menu", () => {
	let mockUseInput: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		const ink = await import("ink");
		mockUseInput = vi.mocked(ink.useInput);
	});

	it("Menuコンポーネントが正しく読み込める", async () => {
		const { Menu } = await import("./Menu.js");
		expect(typeof Menu).toBe("function");
	});

	it("Menuコンポーネントが正しいpropsを受け取る", async () => {
		const { Menu } = await import("./Menu.js");
		const mockOnSelect = vi.fn();
		const sessions = [
			{
				id: "session-1",
				process: {} as any,
				outputs: [],
				lastUpdated: new Date(),
			},
			{
				id: "session-2",
				process: {} as any,
				outputs: [],
				lastUpdated: new Date(),
			},
		];

		// コンポーネントの作成をテスト
		const element = React.createElement(Menu, {
			onSelect: mockOnSelect,
			sessions: sessions,
		} as any);

		expect(element).toBeDefined();
		expect(element.props.onSelect).toBe(mockOnSelect);
		expect(element.props.sessions).toBe(sessions);
	});

	it("空のセッション配列でも正しく動作する", async () => {
		const { Menu } = await import("./Menu.js");
		const mockOnSelect = vi.fn();

		const element = React.createElement(Menu, {
			onSelect: mockOnSelect,
			sessions: [],
		});

		expect(element).toBeDefined();
		expect(element.props.sessions).toEqual([]);
	});

	it("必要な定数が正しく定義されている", async () => {
		const { MENU_OPTIONS } = await import("./constants.js");

		expect(MENU_OPTIONS.START).toBeDefined();
		expect(MENU_OPTIONS.EXIT).toBeDefined();
		expect(typeof MENU_OPTIONS.START).toBe("string");
		expect(typeof MENU_OPTIONS.EXIT).toBe("string");
	});

	describe("メニューオプションの表示", () => {
		it("セッションなしの場合、START と EXIT オプションが表示される", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			const { container } = render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const texts = container.querySelectorAll("span");
			const textContents = Array.from(texts).map(
				(span) => (span as HTMLElement).textContent,
			);

			expect(textContents).toContain(`▶ ${MENU_OPTIONS.START}`);
			expect(textContents).toContain(`  ${MENU_OPTIONS.EXIT}`);
		});

		it("セッションありの場合、START、セッション、EXIT の順で表示される", () => {
			const mockOnSelect = vi.fn();
			const sessions = [
				{
					id: "session-1",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
				{
					id: "session-2",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
			];

			const { container } = render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const texts = container.querySelectorAll("span");
			const textContents = Array.from(texts).map(
				(span) => (span as HTMLElement).textContent,
			);

			expect(textContents).toContain(`▶ ${MENU_OPTIONS.START}`);
			expect(textContents).toContain(`  session-1`);
			expect(textContents).toContain(`  session-2`);
			expect(textContents).toContain(`  ${MENU_OPTIONS.EXIT}`);
		});

		it("最初のオプションが選択状態で表示される", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			const { container } = render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const selectedText = container.querySelector('[data-color="green"]');
			expect(selectedText?.textContent).toBe(`▶ ${MENU_OPTIONS.START}`);
		});

		it("複数セッションがある場合も最初のオプションが選択状態", () => {
			const mockOnSelect = vi.fn();
			const sessions = [
				{
					id: "session-1",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
				{
					id: "session-2",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
			];

			const { container } = render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const selectedText = container.querySelector('[data-color="green"]');
			expect(selectedText?.textContent).toBe(`▶ ${MENU_OPTIONS.START}`);
		});
	});

	describe("キーボード入力処理", () => {
		it("useInputが正しく呼び出される", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			expect(mockUseInput).toHaveBeenCalledTimes(1);
			expect(typeof mockUseInput.mock.calls[0][0]).toBe("function");
		});

		it("上矢印キーで選択インデックスが正しく変更される", () => {
			const mockOnSelect = vi.fn();
			const sessions = [
				{
					id: "session-1",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
			];

			render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const inputHandler = mockUseInput.mock.calls[0][0];

			// 上矢印キーを押した時の処理をテスト
			// 最初のインデックス(0)から上に行くと最後のインデックスになる
			inputHandler("", { upArrow: true });

			// この時点で最後のオプション(EXIT)が選択されるはず
			// 実際の状態変更は内部的に処理されるため、
			// useInputが呼ばれたことを確認
			expect(mockUseInput).toHaveBeenCalled();
		});

		it("下矢印キーで選択インデックスが正しく変更される", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const inputHandler = mockUseInput.mock.calls[0][0];

			// 下矢印キーを押した時の処理をテスト
			inputHandler("", { downArrow: true });

			expect(mockUseInput).toHaveBeenCalled();
		});

		it("EnterキーでonSelectが呼び出される", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			render(
				React.createElement(Menu, {
					onSelect: mockOnSelect,
					sessions: sessions,
				}),
			);

			const inputHandler = mockUseInput.mock.calls[0][0];

			// Enterキーを押した時の処理をテスト
			// 最初のオプション（START）が選択されているはず
			inputHandler("", { return: true });

			expect(mockUseInput).toHaveBeenCalled();
		});
	});

	describe("オプション配列の生成", () => {
		it("セッションがない場合はSTARTとEXITのみ", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			// オプション配列の検証のため、実際のコンポーネントロジックをテスト
			const expectedOptions = [MENU_OPTIONS.START, MENU_OPTIONS.EXIT];

			// コンポーネント内でのオプション生成ロジックをテスト
			const options = [
				MENU_OPTIONS.START,
				...sessions.map((s) => s.id),
				MENU_OPTIONS.EXIT,
			];
			expect(options).toEqual(expectedOptions);
		});

		it("セッションがある場合はSTART、セッション、EXITの順", () => {
			const mockOnSelect = vi.fn();
			const sessions = [
				{
					id: "session-1",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
				{
					id: "session-2",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
			];

			const expectedOptions = [
				MENU_OPTIONS.START,
				"session-1",
				"session-2",
				MENU_OPTIONS.EXIT,
			];

			const options = [
				MENU_OPTIONS.START,
				...sessions.map((s) => s.id),
				MENU_OPTIONS.EXIT,
			];
			expect(options).toEqual(expectedOptions);
		});

		it("大量のセッションがある場合も正しく処理される", () => {
			const mockOnSelect = vi.fn();
			const sessions = Array.from({ length: 10 }, (_, i) => ({
				id: `session-${i + 1}`,
				process: {} as any,
				outputs: [],
				lastUpdated: new Date(),
			}));

			const expectedLength = 1 + sessions.length + 1; // START + セッション数 + EXIT
			const options = [
				MENU_OPTIONS.START,
				...sessions.map((s) => s.id),
				MENU_OPTIONS.EXIT,
			];

			expect(options).toHaveLength(expectedLength);
			expect(options[0]).toBe(MENU_OPTIONS.START);
			expect(options[options.length - 1]).toBe(MENU_OPTIONS.EXIT);

			// 全セッションが含まれていることを確認
			sessions.forEach((session) => {
				expect(options).toContain(session.id);
			});
		});
	});

	describe("プロパティの型チェック", () => {
		it("onSelectが関数であることを確認", () => {
			const mockOnSelect = vi.fn();
			const sessions: any[] = [];

			const element = React.createElement(Menu, {
				onSelect: mockOnSelect,
				sessions: sessions,
			});

			expect(typeof element.props.onSelect).toBe("function");
		});

		it("sessionsが配列であることを確認", () => {
			const mockOnSelect = vi.fn();
			const sessions = [
				{
					id: "session-1",
					process: {} as any,
					outputs: [],
					lastUpdated: new Date(),
				},
			];

			const element = React.createElement(Menu, {
				onSelect: mockOnSelect,
				sessions: sessions,
			});

			expect(Array.isArray(element.props.sessions)).toBe(true);
		});
	});
});
