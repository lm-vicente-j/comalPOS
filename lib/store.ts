import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AppState {
    count: number;
  userName: string;
  subMenu: string;
  increment: (qty: number) => void;
  setUserName: (name: string) => void;
  setSubMenu: (moduleName: string) => void;
  reset: () => void;
}

interface SidebarState {
  subMenu: string;
  setSubMenu: (name: string) => void;
}


type userState = {
  id: number | null
}

type userAction = {
    updateID :(id: number)=> void
}

export const useUserStore = create<userState & userAction>((set)=>({
    id: null,
    subMenu: "",

    updateID: (newID: number) => set(()=>({id: newID}))
}))




export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial State
      count: 0,
      userName: '',
      subMenu: "",

      // Actions
      increment: (qty) => set((state) => ({ count: state.count + qty })),
      setUserName: (name) => set({ userName: name }),
      setSubMenu: (moduleName) => set({ subMenu: moduleName }),
      reset: () => set({ count: 0, userName: '', subMenu: "" }),
    }),
    {
      name: 'app-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
