# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CLI wrapper for Claude (Anthropic's AI assistant) that provides a terminal UI for managing multiple Claude sessions. Built with TypeScript and Ink (React for CLI), it enables easy session management and switching through an interactive menu interface.

## Development Commands

This project uses pnpm as the package manager and Biome for linting/formatting.

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
- Main entry point: `src/index.tsx`

### Core Architecture Patterns
- **Custom Hooks Pattern**: Business logic extracted into reusable hooks
  - `useSessionManager`: Manages Claude session lifecycle
  - `useEventListeners`: Handles terminal event management
  - `useTerminalController`: Controls terminal processes via node-pty
- **Functional Components**: All React components are functional with hooks
- **Type Safety**: Comprehensive TypeScript types in `src/types.ts`

### Key Dependencies
- `node-pty`: Creates pseudo-terminal processes for running Claude CLI
- `strip-ansi`: Handles ANSI escape sequences in terminal output
- `ink-text-input`: Provides text input component for terminal UI
- Testing: Vitest with @testing-library/react and ink-testing-library

### Code Style
- Uses Biome for formatting and linting with tab indentation
- Double quotes for JavaScript/TypeScript strings
- Import organization enabled
- Git integration enabled for VCS-aware operations
- All imports use `.js` extension (ES modules requirement)