"use client"

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface InfiniteScrollProps {
    /** Called when the sentinel becomes visible and more data remains. */
    onLoadMore: () => void;
    hasMore: boolean;
    loading: boolean;
    className?: string;
}

/**
 * Sentinel placed at the end of a list: when it scrolls into view it asks
 * for the next page. Works inside nested scroll containers (ScrollArea)
 * because IntersectionObserver accounts for ancestor clipping.
 */
export function InfiniteScroll({ onLoadMore, hasMore, loading, className }: InfiniteScrollProps) {
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Keep latest values without re-creating the observer on every render.
    const stateRef = useRef({ onLoadMore, hasMore, loading });
    useEffect(() => {
        stateRef.current = { onLoadMore, hasMore, loading };
    });

    // Re-created whenever a fetch settles: observing always reports the
    // current intersection, so if the sentinel is still visible after a
    // page loads (short lists), the next page is requested immediately.
    useEffect(() => {
        if (!hasMore || loading) return;
        const el = sentinelRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const { onLoadMore, hasMore, loading } = stateRef.current;
                if (entries.some((e) => e.isIntersecting) && hasMore && !loading) {
                    onLoadMore();
                }
            },
            // Start fetching slightly before the user reaches the very end.
            { rootMargin: "120px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loading]);

    if (!hasMore && !loading) return null;

    return (
        <div
            ref={sentinelRef}
            className={cn("flex w-full items-center justify-center py-3", className)}
        >
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
    );
}
