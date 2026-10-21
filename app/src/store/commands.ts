import type { Command, Doc } from './types';

export interface CommandDef<P> {
  type: string;
  label: (p: P) => string;
  run: (draft: Doc, p: P) => void;
  coalesceKey?: (p: P) => string;
  undoable?: boolean;
}

/** Registry of every command type — a test asserts each has a label and round-trips through undo. */
export const COMMAND_REGISTRY = new Map<string, { type: string; undoable: boolean }>();

/** Declare a command: returns its factory `(payload) => Command`. */
export function defineCommand<P>(def: CommandDef<P>): (payload: P) => Command<P> {
  if (COMMAND_REGISTRY.has(def.type)) throw new Error(`duplicate command type ${def.type}`);
  COMMAND_REGISTRY.set(def.type, { type: def.type, undoable: def.undoable ?? true });
  return (payload) => ({
    type: def.type, payload, label: def.label(payload), coalesceKey: def.coalesceKey?.(payload),
    undoable: def.undoable ?? true, run: def.run as Command<P>['run'],
  });
}
