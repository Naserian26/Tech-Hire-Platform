import { create } from 'zustand';

interface Notification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
}

type Theme = 'dark' | 'light';

interface UiState {
  notifications: Notification[];
  addNotification: (notif: Notification) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const savedTheme = (localStorage.getItem('theme') as Theme) || 'dark';

export const useUiStore = create<UiState>((set) => ({
  notifications: [],
  addNotification: (notif) => set((state) => ({
    notifications: [notif, ...state.notifications]
  })),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  theme: savedTheme,
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    return { theme: next };
  }),
}));