import { create } from 'zustand';

interface AppState {
  // vars
  count: number;
  userName: string;
  // Actions
  increment: (qty: number) => void;
  setUserName: (name: string) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  // Initial State
  count: 0,
  userName: 'Guest',

  // Actions
  increment: (qty) => set((state) => ({ count: state.count + qty })),
  
  setUserName: (name) => set({ userName: name }),

  reset: () => set({ count: 0, userName: 'Guest' }),
}));

