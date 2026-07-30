// Tiny client-side counter of in-flight server actions. The layout's
// AutoRefresh checks it before each tick: refreshing while an action runs
// would compete with it for the database pool and, worse, the refreshed
// payload can still arrive without the action's own change (the action
// commits after the refresh was rendered).
let pendingActions = 0;

// Wraps a server-action promise; the counter covers its whole round-trip.
export function trackAction<T>(promise: Promise<T>): Promise<T> {
    pendingActions += 1;
    return promise.finally(() => {
        pendingActions = Math.max(0, pendingActions - 1);
    });
}

export function hasPendingActions(): boolean {
    return pendingActions > 0;
}
