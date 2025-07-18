import * as React from "react";
import { SESSION_PREFIX } from "../constants.js";
import type { Screen, Session } from "../types.js";
import { getSessionPreview, getSessionStatus } from "../utils/sessionUtils.js";
import { killSession } from "../utils/tmuxUtils.js";

export const useSessionManager = () => {
	const [sessions, setSessions] = React.useState<Session[]>([]);
	const [currentScreen, setCurrentScreen] = React.useState<Screen>("menu");
	const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(
		null,
	);
	const [error, setError] = React.useState<string | null>(null);
	const sessionCounter = React.useRef(0);

	const generateSessionId = React.useCallback(() => {
		sessionCounter.current += 1;
		return `${SESSION_PREFIX}${sessionCounter.current}`;
	}, []);

	const addSession = React.useCallback((session: Session) => {
		setSessions((prev) => [...prev, session]);
	}, []);

	const removeSession = React.useCallback((sessionId: string) => {
		setSessions((prev) => {
			const sessionToRemove = prev.find((s) => s.id === sessionId);
			if (sessionToRemove) {
				if (sessionToRemove.dataDisposable) {
					sessionToRemove.dataDisposable.dispose();
				}
				if (sessionToRemove.exitCheckInterval) {
					clearInterval(sessionToRemove.exitCheckInterval);
				}
			}
			return prev.filter((s) => s.id !== sessionId);
		});
	}, []);

	const findSession = React.useCallback(
		(sessionId: string) => {
			return sessions.find((s) => s.id === sessionId);
		},
		[sessions],
	);

	const switchToMenu = React.useCallback(() => {
		setCurrentScreen("menu");
		setCurrentSessionId(null);
		setError(null);
	}, []);

	const switchToSession = React.useCallback((sessionId: string) => {
		setCurrentScreen("claude");
		setCurrentSessionId(sessionId);
	}, []);

	const switchToWorktree = React.useCallback(() => {
		setCurrentScreen("worktree");
		setCurrentSessionId(null);
	}, []);

	const switchToSettingsSelect = React.useCallback(() => {
		setCurrentScreen("settings_select");
		setCurrentSessionId(null);
	}, []);

	const switchToWorktreeManager = React.useCallback(() => {
		setCurrentScreen("worktree_manager");
		setCurrentSessionId(null);
	}, []);

	const switchToSessionSelector = React.useCallback(() => {
		setCurrentScreen("session_selector");
		setCurrentSessionId(null);
	}, []);

	const killAllSessions = React.useCallback(() => {
		for (const session of sessions) {
			if (session.dataDisposable) {
				session.dataDisposable.dispose();
			}
			if (session.exitCheckInterval) {
				clearInterval(session.exitCheckInterval);
			}
			killSession(session.tmuxSession);
		}
		setSessions([]);
	}, [sessions]);

	const appendOutput = React.useCallback(
		(sessionId: string, output: Buffer) => {
			setSessions((prev) =>
				prev.map((session) => {
					if (session.id === sessionId) {
						const newOutputs = [...session.outputs, output];
						const newStatus = getSessionStatus(newOutputs);

						return {
							...session,
							outputs: newOutputs,
							lastUpdated: new Date(),
							status: newStatus,
							preview: getSessionPreview(newOutputs),
						};
					}
					return session;
				}),
			);
		},
		[],
	);

	return {
		sessions,
		currentScreen,
		currentSessionId,
		error,
		setError,
		generateSessionId,
		addSession,
		removeSession,
		findSession,
		switchToMenu,
		switchToSession,
		switchToWorktree,
		switchToSettingsSelect,
		switchToWorktreeManager,
		switchToSessionSelector,
		killAllSessions,
		appendOutput,
	};
};
