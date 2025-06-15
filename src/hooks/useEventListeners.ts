import * as React from "react";
import type { EventListeners } from "../types.js";

export const useEventListeners = () => {
	const [activeListeners, setActiveListeners] = React.useState<EventListeners>(
		{},
	);
	const activeListenersRef = React.useRef<EventListeners>({});

	React.useEffect(() => {
		activeListenersRef.current = activeListeners;
	}, [activeListeners]);

	const cleanupListeners = React.useCallback(() => {
		const current = activeListenersRef.current;
		if (current.handleInput) {
			process.stdin.removeListener("data", current.handleInput);
		}
		if (current.handleResize) {
			process.removeListener("SIGWINCH", current.handleResize);
		}
		if (current.dataDisposable) {
			current.dataDisposable.dispose();
		}
		setActiveListeners({});
	}, []);

	const setListeners = React.useCallback(
		(listeners: EventListeners) => {
			cleanupListeners();
			setActiveListeners(listeners);
		},
		[cleanupListeners],
	);

	// クリーンアップをeffectで自動化
	React.useEffect(() => {
		return () => {
			cleanupListeners();
		};
	}, [cleanupListeners]);

	return {
		setListeners,
		cleanupListeners,
		activeListeners,
	};
};
