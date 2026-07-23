import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Device-specific settings.
 *
 * Unlike the business-wide settings (lib/actions/settings.ts) these never
 * touch the server: they describe THIS browser/terminal and are persisted to
 * localStorage, so each device keeps its own values. Reading `hydrated` lets
 * components avoid a server/client mismatch on first paint.
 */
interface DeviceSettingsState {
    deviceName: string;
    hydrated: boolean;
    setDeviceName: (name: string) => void;
    markHydrated: () => void;
}

export const useDeviceSettings = create<DeviceSettingsState>()(
    persist(
        (set) => ({
            deviceName: "",
            hydrated: false,
            setDeviceName: (deviceName) => set({ deviceName }),
            markHydrated: () => set({ hydrated: true }),
        }),
        {
            name: "device-settings",
            storage: createJSONStorage(() => localStorage),
            // Only the actual preferences are persisted, never the transient
            // hydration flag or the action functions.
            partialize: (state) => ({ deviceName: state.deviceName }),
            // Rehydrate manually after mount (see useDeviceSettingsHydration):
            // localStorage would otherwise be read synchronously on the client
            // while the server rendered the defaults, causing a hydration
            // mismatch.
            skipHydration: true,
            onRehydrateStorage: () => (state) => {
                state?.markHydrated();
            },
        }
    )
);

// Kicks off the one-time localStorage read on the client, after the first
// render has matched the server output. Call once from a client component.
export function useDeviceSettingsHydration() {
    useEffect(() => {
        useDeviceSettings.persist.rehydrate();
    }, []);
}
