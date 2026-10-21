import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

/** Whether the plan-vs-actual tracker is expanded: view state (not undoable, not in the case) that survives leaving the section, like the legacy session flag. */
const store = createStore<{ open: boolean }>(() => ({ open: false }));
export const useTrackerOpen = (): boolean => useSyncExternalStore(store.subscribe, () => store.getState().open);
export const toggleTracker = (): void => store.setState((s) => ({ open: !s.open }));
