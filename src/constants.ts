export const TERMINAL_CONFIG = {
	DEFAULT_COLS: 80,
	DEFAULT_ROWS: 24,
	CLEAR_SCREEN_SEQUENCE: "\x1b[2J\x1b[H",
	PROCESS_NAME: "claude",
	XTERM_NAME: "xterm-color",
} as const;

export const SCREENS = {
	MENU: "menu",
	CLAUDE: "claude",
	WORKTREE: "worktree",
	BRANCH_INPUT: "branch_input",
	SETTINGS_SELECT: "settings_select",
	WORKTREE_MANAGER: "worktree_manager",
} as const;

export const SESSION_PREFIX = "session-";

export const MENU_OPTIONS = {
	START: "start",
	WORKTREE: "worktree",
	MANAGE_WORKTREES: "manage_worktrees",
	EXIT: "exit",
} as const;
