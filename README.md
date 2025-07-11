# Claude Code Control Center (cccc)

[![npm version](https://badge.fury.io/js/@nomnel%2Fcccc.svg)](https://www.npmjs.com/package/@nomnel/cccc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A terminal UI wrapper for Claude CLI that enables efficient management of multiple Claude sessions across multiple Git repositories with worktree integration. Perfect for developers who need to work on multiple projects and branches simultaneously with Claude's assistance.

## Features

### Session Management
- **Multiple Sessions**: Run multiple Claude CLI sessions simultaneously
- **Session Persistence**: Sessions continue running in the background
- **Status Tracking**: Shows "Idle", "Running", or "Awaiting Input" status
- **Session Preview**: Displays last 200 characters of meaningful output
- **Activity Timestamps**: Shows relative time since last activity (e.g., "5m ago")
- **Exit Confirmation**: Prompts for confirmation when exiting with active sessions
- **Priority Sorting**: Sessions are sorted by status priority (Awaiting Input > Idle > Running) and age

### Multi-Repository Support
- **Multiple Repositories**: Manage Claude sessions across different Git repositories
- **Repository Management**: Add, remove, and list repositories via CLI
- **Auto-Registration**: Current Git repository is automatically added when launching cccc (v0.2.6+)
- **Unified View**: See all repositories and their worktrees in one place

### Git Worktree Integration
- **Worktree Selection**: Start sessions in existing Git worktrees
- **Branch Creation**: Create new branches with worktrees in any configured repository
- **Automatic Branch Naming**: Press Enter with empty branch name to auto-generate timestamp-based names (e.g., `branch-20240701-142530`)
- **Worktree Manager**: View, manage, and delete Git worktrees
  - Status indicators (clean/modified/untracked)
  - Safe deletion with confirmation
  - Cannot delete current or main worktree

### Settings Management
- **Auto-discovery**: Finds `settings.*.json` files in `~/.claude/` and `./.claude/`
- **Repository-specific Settings**: Displays both global and repository-specific settings during session creation
- **Settings Selection**: Choose settings file when creating new sessions
- **Environment Integration**: Passes settings via `CLAUDE_SETTINGS_PATH`

### Navigation
- **Arrow Keys**: Navigate all menus
- **Vim-style**: Ctrl+N/P for next/previous item
- **Quick Return**: Ctrl+Q to return to menu from session
- **Escape**: Go back in submenus

## Prerequisites

- Node.js 18 or higher
- [Claude CLI](https://docs.anthropic.com/claude/docs/claude-cli) installed
- tmux (terminal multiplexer) installed

## Installation

### Global Installation

```bash
npm install -g @nomnel/cccc
```

### Run with npx

```bash
npx @nomnel/cccc
```

### Development Setup

```bash
git clone https://github.com/nomnel/cccc.git
cd cccc
pnpm install
pnpm run build
```

## Usage

### Command Line Interface

```bash
# Start the interactive UI
cccc

# Manage repositories
cccc add <path>      # Add a repository to configuration
cccc remove <repo>   # Remove a repository
cccc list           # List all configured repositories
```

### Interactive UI

After running `cccc` without arguments, you'll enter the interactive terminal UI:

### Main Menu

The main menu shows:
- Create new session (with optional worktree/settings)
- Select Git worktree for new session (across all configured repositories)
- Manage Git worktrees
- Resume existing sessions (shows status and preview)
- Exit (terminates all sessions)

### Keyboard Shortcuts

#### Global Navigation
- `↑` / `↓`: Navigate menu items
- `Ctrl+N` / `Ctrl+P`: Vim-style navigation (next/previous)
- `Enter`: Select/confirm
- `Escape`: Go back (in submenus)

#### Session Control
- `Ctrl+Q`: Return to menu from active session (preserves session)

#### Worktree Manager
- `D`: Delete selected worktree (with confirmation)
- `R`: Refresh worktree list

### Screens

1. **Main Menu**: Session list and options
2. **Claude Session**: Active Claude CLI interface
3. **Repository/Worktree Selection**: Choose from repositories and their worktrees
4. **Branch Input**: Create new branch with worktree in selected repository
5. **Settings Selection**: Choose from available settings files
6. **Worktree Manager**: View and manage Git worktrees

### Session Display

Each session in the menu shows:
- Session ID and status indicator
- Working directory (basename)
- Settings file name (if applicable)
- Last activity timestamp
- Preview of recent output (filtered for readability)

### Multi-Repository Workflow

1. **Configure Repositories**:
   ```bash
   cccc add ~/projects/repo1    # Add first repository
   cccc add ~/work/repo2        # Add another repository
   cccc list                    # View all repositories
   ```

2. **Create New Branch with Worktree**:
   - Select "start" from main menu
   - Choose repository from the list
   - Enter branch name (e.g., `feature/new-feature`)
   - Creates worktree in `.git/works/feature/new-feature/`
   - Starts Claude session in new worktree

3. **Use Existing Worktree**:
   - Select "worktree" from main menu
   - View all repositories and their worktrees
   - Choose from list of existing worktrees
   - Starts Claude session in selected worktree

4. **Manage Worktrees**:
   - Select "manage_worktrees" from main menu
   - View all worktrees with status indicators
   - Press `D` to delete (with confirmation)
   - Press `R` to refresh list

### Settings Files

Place settings files in either:
- `~/.claude/settings.<name>.json` (global)
- `./.claude/settings.<name>.json` (project-specific)

Example: `~/.claude/settings.dev.json`

When creating a new session, you can select a settings file which will be:
1. Copied to the worktree as `settings.local.json`
2. Passed to Claude via `CLAUDE_SETTINGS_PATH` environment variable

## Testing

This project uses **Vitest** for a comprehensive test suite.
**All 194 tests passing** ✅

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Test Structure

The project maintains comprehensive test coverage with **194 tests** across 15 test files, ensuring reliability of all components and utilities.

#### ✅ Utility Function Tests (`src/utils.test.ts`)

- `getShell()` - OS-specific shell detection
- `isMenuOption()` - Menu option validation
- `isSessionId()` - Session ID validation

#### ✅ Custom Hook Tests

- **`useSessionManager`** (`src/hooks/useSessionManager.test.ts`)
  - Session add/delete/search operations
  - Screen state management
  - Session termination handling

- **`useEventListeners`** (`src/hooks/useEventListeners.test.ts`)
  - Event listener setup and cleanup
  - Memory leak prevention
  - Automatic listener management

- **`useTerminalController`** (`src/hooks/useTerminalController.test.ts`)
  - Terminal process creation
  - Screen clearing
  - Resize and I/O handling

#### ✅ Component Tests

- **`Menu`** (`src/Menu.test.tsx`)
  - Option display
  - Selection state management
  - Session list display

- **`App`** (`src/index.test.tsx`)
  - Screen transitions
  - Keyboard shortcuts
  - Component integration

### Test Coverage

Tests cover:

- **Functional Components**: React Testing Library
- **Custom Hooks**: React Hooks Testing Library
- **Pure Functions**: Unit tests
- **Integration Tests**: Component interactions

## Architecture

### 📁 File Structure

```
src/
├── cli.tsx               # CLI command handler
├── constants.ts          # Constants
├── types.ts              # Type definitions
├── utils/                # Utility functions
│   ├── configUtils.ts    # Repository configuration
│   ├── gitUtils.ts       # Git operations
│   ├── tmuxUtils.ts      # Tmux integration
│   └── ...
├── hooks/                # Custom hooks
│   ├── useSessionManager.ts
│   ├── useEventListeners.ts
│   └── useTerminalController.ts
├── components/           # React components
│   ├── SessionSelector.tsx
│   └── ...
├── Menu.tsx              # Menu component
├── index.tsx             # Main application
└── test files (*.test.ts, *.test.tsx)
```

### 🏗️ Design Principles

- **Single Responsibility**: Each module has a clear, focused role
- **Functional Approach**: Hooks + pure functions instead of classes
- **Type Safety**: Static type checking with TypeScript
- **Testability**: Mock-friendly design with dependency injection
- **Maintainability**: Separation of concerns to minimize change impact
- **Memory Efficiency**: Only keeps last 100 outputs for status detection
- **Cross-Platform**: Automatic shell detection for Windows/Unix

## Troubleshooting

### Common Issues

1. **"claude: command not found"**
   - Ensure [Claude CLI](https://docs.anthropic.com/claude/docs/claude-cli) is installed and in your PATH

2. **Worktree creation fails**
   - Ensure the selected repository is a valid Git repository
   - Check that the parent directory is writable
   - Verify the branch name doesn't already exist

3. **"No repositories configured" message**
   - Add at least one repository using `cccc add <path>`
   - The current directory is automatically added if it's a Git repository (since v0.2.6)

4. **Settings file not found**
   - Check file naming: `settings.<name>.json`
   - Verify file location: `~/.claude/` or `./.claude/`

5. **Session not responding**
   - Press Ctrl+Q to return to menu
   - Session is preserved and can be resumed

## Changelog

### Version 0.3.0
- **Major Change**: Replaced node-pty with tmux for better terminal session management
- **Improved**: Real-time session output display with better performance
- **Fixed**: Session display width now automatically adjusts to window size
- **Fixed**: Proper cleanup of event listeners when tmux sessions exit naturally
- **Fixed**: Better handling of duplicate tmux session errors on startup
- **Enhanced**: More reliable session persistence and background process management

### Version 0.2.7
- **Removed**: Built-in notification feature in favor of Claude Code hooks - users can now configure notifications through Claude Code's hooks system for more flexibility

### Version 0.2.6
- **Added**: Automatic repository registration - when launching `cccc` from a Git repository that isn't managed yet, it's automatically added to cccc management

### Version 0.2.5
- **Added**: Automatic branch name generation - press Enter with empty branch name to generate timestamp-based names

### Version 0.2.4
- **Added**: Session priority sorting - sessions are now sorted by status (Awaiting Input > Idle > Running) and age
- **Added**: Exit confirmation dialog when active sessions exist

### Version 0.2.2
- **Fixed**: Branch names containing slashes (e.g., `feature/some-thing`) now create worktrees with sanitized paths (`.git/works/feature_some-thing`) to prevent nested directory creation
- **Added**: Worktree path preview when creating new branches, showing exactly where the worktree will be created
- **Fixed**: Settings file display order now correctly prioritizes repository-specific settings over global settings

## Development

### Development Commands

```bash
# Build TypeScript
pnpm run build

# Development mode (watch)
pnpm run dev

# Run the application
pnpm run start

# Code quality
pnpm check        # Run all checks
pnpm lint         # Fix lint issues
pnpm format       # Format code

# Testing
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm test:coverage # Coverage report

# Publishing preparation
pnpm prepublishOnly # Build and test before publish
```

### Tech Stack

- **Runtime**: Node.js 18+
- **UI Framework**: Ink v3 (React for CLI)
- **Language**: TypeScript
- **Test Framework**: Vitest
- **Process Management**: tmux (terminal multiplexer)
- **Linter/Formatter**: Biome
- **Key Libraries**:
  - `strip-ansi`: ANSI escape sequence handling
  - `ink-text-input`: Terminal text input component
  - React 19.1.0 with functional components and hooks

## License

MIT License - see [LICENSE](LICENSE) file for details
