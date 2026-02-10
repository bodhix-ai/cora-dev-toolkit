import { create } from "zustand";

interface SidebarState {
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  focusMode: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  setFocusMode: (focusMode: boolean) => void;
  toggleFocusMode: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
}

// Default and constraint values for sidebar widths
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_LEFT_SIDEBAR_WIDTH = 280;
const DEFAULT_RIGHT_SIDEBAR_WIDTH = 320;
const COLLAPSED_SIDEBAR_WIDTH = 64;

export const useSidebarStore = create<SidebarState>((set, get) => ({
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false, // "Context First" - start with right sidebar expanded
  focusMode: false,
  leftSidebarWidth: DEFAULT_LEFT_SIDEBAR_WIDTH,
  rightSidebarWidth: DEFAULT_RIGHT_SIDEBAR_WIDTH,

  setLeftSidebarCollapsed: (collapsed: boolean) =>
    set({ leftSidebarCollapsed: collapsed }),
  setRightSidebarCollapsed: (collapsed: boolean) =>
    set({ rightSidebarCollapsed: collapsed }),
  setFocusMode: (focusMode: boolean) => set({ focusMode }),

  setLeftSidebarWidth: (width: number) => {
    const constrainedWidth = Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(MAX_SIDEBAR_WIDTH, width)
    );
    set({ leftSidebarWidth: constrainedWidth });
  },

  setRightSidebarWidth: (width: number) => {
    const constrainedWidth = Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(MAX_SIDEBAR_WIDTH, width)
    );
    set({ rightSidebarWidth: constrainedWidth });
  },

  toggleFocusMode: () => {
    const currentFocusMode = get().focusMode;
    const newFocusMode = !currentFocusMode;

    set({
      focusMode: newFocusMode,
      leftSidebarCollapsed: newFocusMode, // Hide left sidebar in focus mode
      rightSidebarCollapsed: true, // Always keep right sidebar hidden in focus mode
    });
  },
}));

// Export constants for use in components
export { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH, COLLAPSED_SIDEBAR_WIDTH };
