# Claude CLI Wrapper

Node.js製のターミナルUIを使った Claude CLI のラッパーアプリケーション。

## 機能

- **メニューナビゲーション**: 矢印キーでメニューを操作
- **セッション管理**: 複数のClaudeセッションを同時に管理
- **セッション切り替え**: 実行中のセッション間で簡単に切り替え
- **キーボードショートカット**: Ctrl+Q でメニューに戻る

## インストール

```bash
pnpm install
```

## 実行

```bash
pnpm dev
```

## テスト

このプロジェクトは **Vitest** を使用して包括的なテストスイートを提供しています。
**全24テストが正常に動作** ✅

### テスト実行

```bash
# 全テスト実行
pnpm test

# ウォッチモードでテスト実行
pnpm test:watch

# カバレッジ付きでテスト実行
pnpm test:coverage
```

### テスト構成

#### ✅ ユーティリティ関数テスト (`src/utils.test.ts`)

- `getShell()` - OS別シェル判定
- `isMenuOption()` - メニューオプション判定
- `isSessionId()` - セッションID判定

#### ✅ カスタムフックテスト

- **`useSessionManager`** (`src/hooks/useSessionManager.test.ts`)
  - セッション追加・削除・検索
  - 画面状態管理
  - セッション終了処理

- **`useEventListeners`** (`src/hooks/useEventListeners.test.ts`)
  - イベントリスナー設定・クリーンアップ
  - メモリリーク防止
  - 自動リスナー管理

- **`useTerminalController`** (`src/hooks/useTerminalController.test.ts`)
  - ターミナルプロセス作成
  - 画面クリア処理
  - リサイズ・入出力処理

#### ✅ コンポーネントテスト

- **`Menu`** (`src/Menu.test.tsx`)
  - オプション表示
  - 選択状態管理
  - セッション一覧表示

- **`App`** (`src/index.test.tsx`)
  - 画面遷移
  - キーボードショートカット
  - コンポーネント統合

### テストカバレッジ

テストは以下をカバーしています：

- **関数型コンポーネント**: React Testing Library
- **カスタムフック**: React Hooks Testing Library
- **純粋関数**: 単体テスト
- **統合テスト**: コンポーネント間の連携

## アーキテクチャ

### 📁 ファイル構成

```
src/
├── constants.ts           # 定数定義
├── types.ts              # 型定義
├── utils.ts              # ユーティリティ関数
├── hooks/                # カスタムフック
│   ├── useSessionManager.ts
│   ├── useEventListeners.ts
│   └── useTerminalController.ts
├── Menu.tsx              # メニューコンポーネント
├── index.tsx             # メインアプリケーション
└── test/                 # テストファイル
    ├── setup.ts
    ├── utils.test.ts
    ├── Menu.test.tsx
    ├── App.test.tsx
    └── hooks/
        ├── useSessionManager.test.ts
        ├── useEventListeners.test.ts
        └── useTerminalController.test.ts
```

### 🏗️ 設計原則

- **単一責任原則**: 各モジュールが明確な役割を担う
- **関数型アプローチ**: クラスを使用せず、フック + 純粋関数
- **型安全性**: TypeScriptによる静的型チェック
- **テスタビリティ**: モックしやすい設計
- **保守性**: 責任分離による変更影響の最小化

## 開発

### リント・フォーマット

```bash
# コードチェック
pnpm check

# リント修正
pnpm lint

# フォーマット
pnpm format
```

### 技術スタック

- **Runtime**: Node.js
- **UI Framework**: Ink (React for CLI)
- **Language**: TypeScript
- **Test Framework**: Vitest
- **Test Libraries**: Vitest (Node.js環境)
- **Process Management**: node-pty
- **Linter**: Biome
