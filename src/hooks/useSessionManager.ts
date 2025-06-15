import * as React from "react";
import { SESSION_PREFIX } from "../constants.js";
import type { Screen, Session } from "../types.js";

export const useSessionManager = () => {
	const [sessions, setSessions] = React.useState<Session[]>([]);
	const [currentScreen, setCurrentScreen] = React.useState<Screen>("menu");
	const [currentSessionId, setCurrentSessionId] = React.useState<string | null>(
		null,
	);
	const sessionCounter = React.useRef(0);

	const generateSessionId = React.useCallback(() => {
		sessionCounter.current += 1;
		return `${SESSION_PREFIX}${sessionCounter.current}`;
	}, []);

	const addSession = React.useCallback((session: Session) => {
		setSessions((prev) => [...prev, session]);
	}, []);

	const removeSession = React.useCallback((sessionId: string) => {
		setSessions((prev) => prev.filter((s) => s.id !== sessionId));
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
	}, []);

	const switchToSession = React.useCallback((sessionId: string) => {
		setCurrentScreen("claude");
		setCurrentSessionId(sessionId);
	}, []);

	const killAllSessions = React.useCallback(() => {
		for (const session of sessions) {
			session.process.kill();
		}
		setSessions([]);
	}, [sessions]);

	const appendOutput = React.useCallback(
		(sessionId: string, output: Buffer) => {
			setSessions((prev) =>
				prev.map((session) =>
					session.id === sessionId
						? {
								...session,
								outputs: [...session.outputs, output],
								lastUpdated: new Date(),
							}
						: session,
				),
			);
		},
		[],
	);

	return {
		sessions,
		currentScreen,
		currentSessionId,
		generateSessionId,
		addSession,
		removeSession,
		findSession,
		switchToMenu,
		switchToSession,
		killAllSessions,
		appendOutput,
	};
};
