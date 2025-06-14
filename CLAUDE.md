# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses pnpm as the package manager and Biome for linting/formatting.

### Build and Development
- `pnpm run build` - Compile TypeScript to JavaScript (output in `dist/`)
- `pnpm run dev` - Start TypeScript compiler in watch mode for development
- `pnpm run start` - Run the compiled application from `dist/index.js`

### Code Quality
- `pnpm run format` - Format code using Biome
- `pnpm run lint` - Lint and auto-fix issues using Biome
- `pnpm run check` - Run Biome checks without auto-fixing

### Package Management
- Uses pnpm v10.11.0 as specified in packageManager field
- Workspace configuration in `pnpm-workspace.yaml` with built dependencies restriction

## Project Architecture

### TypeScript Configuration
- Target: ES2022 with CommonJS modules
- Strict mode enabled with additional safety checks (`noUncheckedIndexedAccess`, `noImplicitReturns`, etc.)
- Source files in `src/`, compiled output in `dist/`

### Code Style
- Uses Biome for formatting and linting with tab indentation
- Double quotes for JavaScript/TypeScript strings
- Import organization enabled
- Git integration enabled for VCS-aware operations