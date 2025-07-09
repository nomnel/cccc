# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CLI wrapper for Claude (Anthropic's AI assistant) that provides a terminal UI for managing multiple Claude sessions across multiple Git repositories. Built with TypeScript and Ink (React for CLI), it enables easy session management, repository management, Git worktree integration, and Claude CLI settings management through an interactive menu interface. The project uses tmux for terminal multiplexing and session management.

## Development Commands

This project uses pnpm as the package manager and Biome for linting/formatting.

### Custom Claude Commands

The project includes custom slash commands for Claude:
- `/publish <version>` - Update version, commit, tag, publish to npm, and push (see `.claude/commands/publish.md`)

### Build and Development
- `pnpm run build` - Compile TypeScript to JavaScript (output in `dist/`)
- `pnpm run dev` - Start TypeScript compiler in watch mode for development
- `pnpm run start` - Run the compiled application from `dist/index.js`

### Testing
- `pnpm test` - Run all tests using Vitest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate test coverage report

### Code Quality
- `pnpm run format` - Format code using Biome
- `pnpm run lint` - Lint and auto-fix issues using Biome
- `pnpm run check` - Run Biome checks without auto-fixing

### Package Management
- Uses pnpm v10.11.0 as specified in packageManager field
- Workspace configuration in `pnpm-workspace.yaml` with built dependencies restriction
- Published to npm as `@nomnel/cccc`

## Project Architecture

### TypeScript Configuration
- Target: ES2022 with ES modules (`"type": "module"` in package.json)
- Strict mode enabled with additional safety checks (`noUncheckedIndexedAccess`, `noImplicitReturns`, etc.)
- Source files in `src/`, compiled output in `dist/`
- Test files co-located with source files using `.test.ts(x)` extension

### UI Framework
- Uses Ink v3 - React-based framework for building CLI interfaces
- React 19.1.0 for component development
- Components located in `src/components/`
- Main entry point: `src/index.tsx` (interactive UI)
- CLI entry point: `src/cli.tsx` (command-line interface)
- Binary entry point: `bin/cccc` (dispatches to CLI or UI)

### Core Architecture Patterns
- **Custom Hooks Pattern**: Business logic extracted into reusable hooks
  - `useSessionManager`: Manages Claude session lifecycle
  - `useEventListeners`: Handles terminal event management
  - `useTerminalController`: Controls terminal processes via tmux
- **Functional Components**: All React components are functional with hooks
- **Type Safety**: Comprehensive TypeScript types in `src/types.ts`
- **Multi-Repository Support**: Configuration stored in `~/.config/cccc/settings.json`
- **CLI Command Handler**: Separate CLI entry point at `src/cli.tsx` for repository management

### Key Dependencies
- **tmux**: Terminal multiplexer for managing Claude CLI sessions (replaces node-pty)
- `strip-ansi`: Handles ANSI escape sequences in terminal output
- `ink-text-input`: Provides text input component for terminal UI
- Testing: Vitest with @testing-library/react and ink-testing-library

### Key Modules
- `configUtils`: Manages repository configuration in `~/.config/cccc/settings.json`
- `gitUtils`: Git operations with support for multiple repositories
- `tmuxUtils`: Tmux session management, pane control, and output monitoring
- `sessionUtils`: Session status detection and output filtering
- `settingsUtils`: Claude CLI settings file management (supports multiple settings.*.json files)

### Code Style
- Uses Biome for formatting and linting with tab indentation
- Double quotes for JavaScript/TypeScript strings
- Import organization enabled
- Git integration enabled for VCS-aware operations
- All imports use `.js` extension (ES modules requirement)

### Project Structure
```
bin/
└── cccc                     # Binary entry point
src/
├── cli.tsx                  # CLI command handler
├── index.tsx                # Main interactive UI
├── types.ts                 # TypeScript type definitions
├── constants.ts             # Application constants
├── utils.ts                 # General utility functions
├── test-setup.ts            # Test configuration for Vitest
├── components/              # React components
│   ├── ExitConfirmation.tsx # Exit confirmation dialog
│   ├── Menu.tsx             # Main menu component
│   ├── SessionSelector.tsx  # Claude session selector
│   ├── SettingsSelector.tsx # Claude CLI settings selector
│   ├── WorktreeManager.tsx  # Git worktree manager
│   └── WorktreeMenu.tsx     # Worktree menu interface
├── hooks/                   # Custom React hooks
│   ├── useSessionManager.ts
│   ├── useEventListeners.ts
│   └── useTerminalController.ts
└── utils/                   # Utility functions
    ├── configUtils.ts       # Repository configuration
    ├── gitUtils.ts          # Git operations
    ├── sessionUtils.ts      # Session management utilities
    ├── settingsUtils.ts     # Settings file management
    └── tmuxUtils.ts         # Tmux integration
.claude/
└── commands/                # Custom Claude commands
    └── publish.md           # npm publish workflow
```