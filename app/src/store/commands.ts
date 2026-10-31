import { current } from 'immer';
import { programmeInStore } from './persistence/bpmn/programmeDoc';
import { syncDraft } from './syncDraft';
import type { Command, Doc, PortfolioDoc } from './types';

export interface CommandDef<P> {
  type: string;
  label: (p: P) => string;
  run: (draft: Doc, p: P) => void;
  coalesceKey?: (p: P) => string;
  undoable?: boolean;
}
/** `apply` is a pure function of the portfolio; the store turns the difference into minimal Immer patches (`syncDraft`). */
export interface PortfolioCommandDef<P> extends Omit<CommandDef<P>, 'run'> { apply: (pf: PortfolioDoc, p: P) => PortfolioDoc }

/** Registry of every command type — a test asserts each has a label and round-trips through undo. */
export const COMMAND_REGISTRY = new Map<string, { type: string; undoable: boolean }>();

function register(type: string, undoable: boolean | undefined): boolean {
  if (COMMAND_REGISTRY.has(type)) throw new Error(`duplicate command type ${type}`);
  COMMAND_REGISTRY.set(type, { type, undoable: undoable ?? true });
  return undoable ?? true;
}

/** Declare a case command (acts on the active product's effective case): returns its factory `(payload) => Command`. */
export function defineCommand<P>(def: CommandDef<P>): (payload: P) => Command<P> {
  const undoable = register(def.type, def.undoable);
  return (payload) => ({ type: def.type, payload, label: def.label(payload), coalesceKey: def.coalesceKey?.(payload), undoable,
    run: def.run as Command<P>['run'] });
}

/** Declare a portfolio command (products, waves, overrides, hub): a pure `apply` on the portfolio, applied to the draft as a minimal diff. */
export function definePortfolioCommand<P>(def: PortfolioCommandDef<P>): (payload: P) => Command<P> {
  const undoable = register(def.type, def.undoable);
  const runPortfolio = (d: PortfolioDoc, p: P): void => {
    const cur = current(d) as PortfolioDoc, out = def.apply(cur, p), common = programmeInStore(out.common);
    // schema v4: a programme value a portfolio command wrote into the common form values belongs to the common document
    const next = common === out.common ? out : { ...out, common };
    syncDraft(d as unknown as Record<string, unknown>, cur as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>);
  };
  return (payload) => ({ type: def.type, payload, label: def.label(payload), coalesceKey: def.coalesceKey?.(payload), undoable, run: () => undefined,
    runPortfolio });
}
