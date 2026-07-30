"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasPendingActions } from "@/lib/action-tracker";

// Re-renders the server components on an interval so every open session
// (e.g. several waiters) sees the data changes made by the others. Client
// component state (carts, dialogs, form inputs) survives router.refresh().
export default function AutoRefresh({ interval = 10000 }: { interval?: number }) {
    const router = useRouter();

    useEffect(() => {
        const tick = () => {
            // Skip the tick while this terminal has a server action in
            // flight: the refresh would compete with it for the database
            // pool and could land without the action's own change.
            if (document.visibilityState === "visible" && !hasPendingActions()) router.refresh();
        };
        const id = setInterval(tick, interval);
        // Catch up immediately when the tab becomes visible again.
        document.addEventListener("visibilitychange", tick);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", tick);
        };
    }, [router, interval]);

    return null;
}
