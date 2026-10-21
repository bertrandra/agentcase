import { appStore } from '@/store/instance';

/** Undo / redo — the only way the UI moves through history. */
export const undo = (): boolean => appStore().undo();
export const redo = (): boolean => appStore().redo();
export const jumpToStep = (index: number): void => appStore().jumpTo(index);
