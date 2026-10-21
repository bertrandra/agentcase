import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

/** View state — never undoable, never persisted in the case (current section, toast, dock). */
export interface UiState { activeSection: string; toast: string; dockOpen: boolean }
export const uiStore = createStore<UiState>(() => ({ activeSection: 'home', toast: '', dockOpen: false }));

export const useUi = <T,>(select: (s: UiState) => T): T => useSyncExternalStore(uiStore.subscribe, () => select(uiStore.getState()));
export const goSection = (id: string): void => uiStore.setState({ activeSection: id });
export const toggleDock = (): void => uiStore.setState((s) => ({ dockOpen: !s.dockOpen }));
let timer: ReturnType<typeof setTimeout> | null = null;
/** Short announcement in the live region ("Undone: …"). */
export function toast(message: string, ms = 2500): void {
  uiStore.setState({ toast: message });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => uiStore.setState({ toast: '' }), ms);
}
