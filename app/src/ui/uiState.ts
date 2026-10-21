import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

/** The guided-sequence walk: where the user is in the flattened sequence and which stops were visited. */
export interface WizState { active: boolean; pos: number; visited: number[] }
const IDLE: WizState = { active: false, pos: 0, visited: [] };

/** View state — never undoable, never persisted in the case (current section, toast, dock, hidden menu, guided walk). */
export interface UiState { activeSection: string; toast: string; dockOpen: boolean; menuHidden: boolean; wiz: WizState; openGroup: string | null; fastPath: boolean }
export const uiStore = createStore<UiState>(() => ({ activeSection: 'home', toast: '', dockOpen: false, menuHidden: false, wiz: IDLE, openGroup: null, fastPath: false }));

export const useUi = <T,>(select: (s: UiState) => T): T => useSyncExternalStore(uiStore.subscribe, () => select(uiStore.getState()));
export const goSection = (id: string): void => uiStore.setState({ activeSection: id });
export const toggleDock = (): void => uiStore.setState((s) => ({ dockOpen: !s.dockOpen }));
/** Hide-menu mode: the sidebar collapses and a group bar above the section replaces it (legacy `body.menu-hidden`). */
export const setMenuHidden = (hidden: boolean): void => uiStore.setState({ menuHidden: hidden });
export const toggleMenuHidden = (): void => uiStore.setState((s) => ({ menuHidden: !s.menuHidden }));

/** Sidebar accordion (legacy toggleGroup): opening a group closes the others, toggling the open one closes it. Session-only, like the legacy. */
export const toggleGroup = (id: string): void => uiStore.setState((s) => ({ openGroup: s.openGroup === id ? null : id }));
export const openGroup = (id: string): void => { if (uiStore.getState().openGroup !== id) uiStore.setState({ openGroup: id }); };
/** Fast Path filter (legacy FAST_TRACK): the menu, group bar and guided walk keep only minimum-viable-path sections. Session-only view preference. */
export const setFastPath = (on: boolean): void => uiStore.setState({ fastPath: on });

/** Start the walk on the first stop of `stops` (section ids in walking order). */
export function wizStart(stops: string[]): void {
  if (stops.length) uiStore.setState({ wiz: { active: true, pos: 0, visited: [0] }, activeSection: stops[0]! });
}
/** Jump to stop `i` (clamped) and open its section. */
export function wizGo(i: number, stops: string[]): void {
  const { wiz } = uiStore.getState();
  if (!wiz.active || !stops.length) return;
  const pos = Math.max(0, Math.min(stops.length - 1, i));
  uiStore.setState({ wiz: { active: true, pos, visited: wiz.visited.includes(pos) ? wiz.visited : [...wiz.visited, pos] }, activeSection: stops[pos]! });
}
export const wizExit = (): void => { if (uiStore.getState().wiz.active) uiStore.setState({ wiz: IDLE }); };

let timer: ReturnType<typeof setTimeout> | null = null;
/** Short announcement in the live region ("Undone: …"). */
export function toast(message: string, ms = 2500): void {
  uiStore.setState({ toast: message });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => uiStore.setState({ toast: '' }), ms);
}
