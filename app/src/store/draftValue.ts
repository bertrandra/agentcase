import { current, type Draft } from 'immer';

/**
 * The plain value of a draft inside a command (immer's `current`), typed on the value the commands receive: since immer 11 `current` takes a
 * `Draft<T>`, while a command's `run(d)` is typed on the stored document. Same behaviour as `current` (it throws on a non-draft).
 */
export const currentOf = <T>(d: T): T => current(d as Draft<T>) as T;
