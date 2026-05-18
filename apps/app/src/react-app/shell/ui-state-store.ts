import { create } from "zustand";
import * as z from "zod";

import { clamp } from "@/lib/utils";

export const PERSISTED_UI_STATE_KEY = "openwork:ui-state:v1";
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const LEGACY_WORKSPACE_LEFT_SIDEBAR_WIDTH_KEY = "openwork.workspace-shell.left-width.v1";
const LEGACY_WORKSPACE_RIGHT_SIDEBAR_EXPANDED_KEY = "openwork.workspace-shell.right-expanded.v3";
const LEGACY_WORKSPACE_RIGHT_SIDEBAR_WIDTH_KEY = "openwork.workspace-shell.right-width.v1";

export const DEFAULT_WORKSPACE_LEFT_SIDEBAR_WIDTH = 260;
export const MIN_WORKSPACE_LEFT_SIDEBAR_WIDTH = 220;
export const MAX_WORKSPACE_LEFT_SIDEBAR_WIDTH = 420;
export const DEFAULT_WORKSPACE_RIGHT_SIDEBAR_COLLAPSED_WIDTH = 72;
export const DEFAULT_WORKSPACE_RIGHT_SIDEBAR_EXPANDED_WIDTH = 520;
export const MIN_WORKSPACE_RIGHT_SIDEBAR_WIDTH = 320;
export const MAX_WORKSPACE_RIGHT_SIDEBAR_WIDTH = 960;

export type PersistedUiState = {
  sidebarOpen: boolean;
  browserPanelOpen?: boolean;
  applicationMenuVisible?: boolean;
  workspaceLeftSidebarWidth?: number;
  workspaceRightSidebarExpanded?: boolean;
  workspaceRightSidebarExpandedWidth?: number;
};

export type UiState = {
  sidebarOpen: boolean;
  browserPanelOpen: boolean;
  applicationMenuVisible: boolean;
  workspaceLeftSidebarWidth: number;
  workspaceLeftSidebarResizing: boolean;
  workspaceRightSidebarExpanded: boolean;
  workspaceRightSidebarExpandedWidth: number;
};

const initialState: UiState = {
  sidebarOpen: true,
  browserPanelOpen: false,
  applicationMenuVisible: false,
  workspaceLeftSidebarWidth: DEFAULT_WORKSPACE_LEFT_SIDEBAR_WIDTH,
  workspaceLeftSidebarResizing: false,
  workspaceRightSidebarExpanded: false,
  workspaceRightSidebarExpandedWidth: DEFAULT_WORKSPACE_RIGHT_SIDEBAR_EXPANDED_WIDTH,
};

function readSidebarCookieOpen(): boolean | null {
  if (globalThis.window === undefined) {
    return null;
  }

  const prefix = `${SIDEBAR_COOKIE_NAME}=`;
  const cookie = window.document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return cookie.slice(prefix.length) === "true";
}

function readLegacyNumber(raw: string | null, min: number, max: number) {  
  const parsed = z.coerce.number().transform((value) => clamp(value, min, max)).safeParse(raw);

  return parsed.success ? parsed.data : null;
}

function readLegacyWorkspaceShellState() {
  if (globalThis.window === undefined) {
    return {};
  }

  const rightSidebarExpanded = window.localStorage.getItem(LEGACY_WORKSPACE_RIGHT_SIDEBAR_EXPANDED_KEY);
  const leftSidebarWidth = window.localStorage.getItem(LEGACY_WORKSPACE_LEFT_SIDEBAR_WIDTH_KEY);
  const rightSidebarWidth = window.localStorage.getItem(LEGACY_WORKSPACE_RIGHT_SIDEBAR_WIDTH_KEY);

  return {
    workspaceLeftSidebarWidth:
      readLegacyNumber(
        leftSidebarWidth,
        MIN_WORKSPACE_LEFT_SIDEBAR_WIDTH,
        MAX_WORKSPACE_LEFT_SIDEBAR_WIDTH,
      ) ?? undefined,
    workspaceRightSidebarExpanded: rightSidebarExpanded == null ? undefined : rightSidebarExpanded === "1",
    workspaceRightSidebarExpandedWidth:
      readLegacyNumber(
        rightSidebarWidth,
        MIN_WORKSPACE_RIGHT_SIDEBAR_WIDTH,
        MAX_WORKSPACE_RIGHT_SIDEBAR_WIDTH,
      ) ?? undefined,
  };
}

function readPersistedUiState(): UiState {
  if (globalThis.window === undefined) {
    return initialState;
  }

  try {
    const raw = window.localStorage.getItem(PERSISTED_UI_STATE_KEY);
    const legacyWorkspaceShellState = readLegacyWorkspaceShellState();

    if (!raw) {
      const sidebarOpen = readSidebarCookieOpen();
      const migratedState: UiState = {
        ...initialState,
        browserPanelOpen:
          legacyWorkspaceShellState.workspaceRightSidebarExpanded ?? initialState.browserPanelOpen,
        workspaceLeftSidebarWidth:
          legacyWorkspaceShellState.workspaceLeftSidebarWidth ?? initialState.workspaceLeftSidebarWidth,
        workspaceRightSidebarExpanded:
          legacyWorkspaceShellState.workspaceRightSidebarExpanded ?? initialState.workspaceRightSidebarExpanded,
        workspaceRightSidebarExpandedWidth:
          legacyWorkspaceShellState.workspaceRightSidebarExpandedWidth ??
          initialState.workspaceRightSidebarExpandedWidth,
      };

      if (sidebarOpen === null) {
        return migratedState;
      }

      return { ...migratedState, sidebarOpen };
    }

    const parsed: PersistedUiState = JSON.parse(raw);

    return {
      ...initialState,
      sidebarOpen: parsed.sidebarOpen,
      browserPanelOpen:
        parsed.browserPanelOpen ??
        legacyWorkspaceShellState.workspaceRightSidebarExpanded ??
        initialState.browserPanelOpen,
      applicationMenuVisible: parsed.applicationMenuVisible ?? initialState.applicationMenuVisible,
      workspaceLeftSidebarWidth:
        parsed.workspaceLeftSidebarWidth ??
        legacyWorkspaceShellState.workspaceLeftSidebarWidth ??
        initialState.workspaceLeftSidebarWidth,
      workspaceRightSidebarExpanded:
        parsed.workspaceRightSidebarExpanded ??
        legacyWorkspaceShellState.workspaceRightSidebarExpanded ??
        initialState.workspaceRightSidebarExpanded,
      workspaceRightSidebarExpandedWidth:
        parsed.workspaceRightSidebarExpandedWidth ??
        legacyWorkspaceShellState.workspaceRightSidebarExpandedWidth ??
        initialState.workspaceRightSidebarExpandedWidth,
    };
  } catch {
    return initialState;
  }
}

export function persistUiState(state: UiState): void {
  if (globalThis.window === undefined) {
    return;
  }

  try {
    window.localStorage.setItem(
      PERSISTED_UI_STATE_KEY,
      JSON.stringify({
        sidebarOpen: state.sidebarOpen,
        browserPanelOpen: state.browserPanelOpen,
        applicationMenuVisible: state.applicationMenuVisible,
        workspaceLeftSidebarWidth: state.workspaceLeftSidebarWidth,
        workspaceRightSidebarExpanded: state.workspaceRightSidebarExpanded,
        workspaceRightSidebarExpandedWidth: state.workspaceRightSidebarExpandedWidth,
      } satisfies PersistedUiState),
    );
  } catch {
    return;
  }
}

export function setSidebarOpen(state: UiState, open: boolean): UiState {
  if (state.sidebarOpen === open) {
    return state;
  }

  return {
    ...state,
    sidebarOpen: open,
  };
}

export function toggleSidebar(state: UiState): UiState {
  return setSidebarOpen(state, !state.sidebarOpen);
}

export function setBrowserPanelOpen(state: UiState, open: boolean): UiState {
  if (state.browserPanelOpen === open) {
    return state;
  }

  return {
    ...state,
    browserPanelOpen: open,
  };
}

export function toggleBrowserPanel(state: UiState): UiState {
  return setBrowserPanelOpen(state, !state.browserPanelOpen);
}

export function setApplicationMenuVisible(state: UiState, visible: boolean): UiState {
  if (state.applicationMenuVisible === visible) {
    return state;
  }

  return {
    ...state,
    applicationMenuVisible: visible,
  };
}

export function setWorkspaceLeftSidebarWidth(state: UiState, width: number): UiState {
  const nextWidth = clamp(width, MIN_WORKSPACE_LEFT_SIDEBAR_WIDTH, MAX_WORKSPACE_LEFT_SIDEBAR_WIDTH);

  if (state.workspaceLeftSidebarWidth === nextWidth) {
    return state;
  }

  return {
    ...state,
    workspaceLeftSidebarWidth: nextWidth,
  };
}

export function setWorkspaceLeftSidebarResizing(state: UiState, resizing: boolean): UiState {
  if (state.workspaceLeftSidebarResizing === resizing) {
    return state;
  }

  return {
    ...state,
    workspaceLeftSidebarResizing: resizing,
  };
}

export function setWorkspaceRightSidebarExpanded(state: UiState, expanded: boolean): UiState {
  if (state.workspaceRightSidebarExpanded === expanded) {
    return state;
  }

  return {
    ...state,
    workspaceRightSidebarExpanded: expanded,
  };
}

export function toggleWorkspaceRightSidebar(state: UiState): UiState {
  return setWorkspaceRightSidebarExpanded(state, !state.workspaceRightSidebarExpanded);
}

export function setWorkspaceRightSidebarExpandedWidth(state: UiState, width: number): UiState {
  const nextWidth = clamp(width, MIN_WORKSPACE_RIGHT_SIDEBAR_WIDTH, MAX_WORKSPACE_RIGHT_SIDEBAR_WIDTH);

  if (state.workspaceRightSidebarExpandedWidth === nextWidth) {
    return state;
  }

  return {
    ...state,
    workspaceRightSidebarExpandedWidth: nextWidth,
  };
}

function syncApplicationMenuVisible(visible: boolean): void {
  void globalThis.window?.__OPENWORK_ELECTRON__?.invokeDesktop?.("__setApplicationMenuVisible", visible);
}

type UiStateStore = UiState & {
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  openBrowserPanel: () => void;
  closeBrowserPanel: () => void;
  toggleBrowserPanel: () => void;
  setApplicationMenuVisible: (visible: boolean) => void;
  setWorkspaceLeftSidebarWidth: (width: number) => void;
  setWorkspaceLeftSidebarResizing: (resizing: boolean) => void;
  setWorkspaceRightSidebarExpanded: (expanded: boolean) => void;
  toggleWorkspaceRightSidebar: () => void;
  setWorkspaceRightSidebarExpandedWidth: (width: number) => void;
};

export const useUiStateStore = create<UiStateStore>((set) => ({
  ...readPersistedUiState(),
  setSidebarOpen: (open) => set((state) => setSidebarOpen(state, open)),
  toggleSidebar: () => set((state) => toggleSidebar(state)),
  openBrowserPanel: () => set((state) => setBrowserPanelOpen(state, true)),
  closeBrowserPanel: () => set((state) => setBrowserPanelOpen(state, false)),
  toggleBrowserPanel: () => set((state) => toggleBrowserPanel(state)),
  setApplicationMenuVisible: (visible) => {
    set((state) => setApplicationMenuVisible(state, visible));
    syncApplicationMenuVisible(visible);
  },
  setWorkspaceLeftSidebarWidth: (width) => set((state) => setWorkspaceLeftSidebarWidth(state, width)),
  setWorkspaceLeftSidebarResizing: (resizing) => set((state) => setWorkspaceLeftSidebarResizing(state, resizing)),
  setWorkspaceRightSidebarExpanded: (expanded) => set((state) => setWorkspaceRightSidebarExpanded(state, expanded)),
  toggleWorkspaceRightSidebar: () => set((state) => toggleWorkspaceRightSidebar(state)),
  setWorkspaceRightSidebarExpandedWidth: (width) =>
    set((state) => setWorkspaceRightSidebarExpandedWidth(state, width)),
}));

const currentUiState = useUiStateStore.getState();

syncApplicationMenuVisible(currentUiState.applicationMenuVisible);
persistUiState(currentUiState);
useUiStateStore.subscribe((state) => persistUiState(state));
