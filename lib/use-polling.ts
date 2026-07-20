"use client";
import { useEffect, useRef } from "react";

// Runs the callback on an interval while the tab is visible, plus once when
// the tab regains visibility. For pages that fetch their data client-side,
// where the layout-level router.refresh() cannot reach.
export function usePolling(callback: () => void, interval = 10000) {
    const saved = useRef(callback);

    useEffect(() => {
        saved.current = callback;
    }, [callback]);

    useEffect(() => {
        const tick = () => {
            if (document.visibilityState === "visible") saved.current();
        };
        const id = setInterval(tick, interval);
        document.addEventListener("visibilitychange", tick);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [interval]);
}
