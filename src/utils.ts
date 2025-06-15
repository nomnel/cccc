import * as os from "node:os";
import { MENU_OPTIONS } from "./constants.js";
import type { MenuOption } from "./types.js";

export const getShell = (): string => {
	return os.platform() === "win32"
		? "powershell.exe"
		: process.env.SHELL || "bash";
};

export const isMenuOption = (
	option: string,
): option is keyof typeof MENU_OPTIONS => {
	return (Object.values(MENU_OPTIONS) as string[]).includes(option);
};

export const isSessionId = (option: string): boolean => {
	return !isMenuOption(option);
};
