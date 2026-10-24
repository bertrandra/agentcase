/** @calc-zone time-engine */
import { createStore } from 'zustand/vanilla';
import { makeCtx } from '@/domain';
import { mcsOf } from '@/domain/model/modelState';
import { runMcs, type McsResult } from '@/domain/model/mcs';
import { activeDoc } from '@/store/editBase';

/**
 * The last stochastic run (legacy MCS_LAST): session-only, never part of the case and never undoable, so it lives beside the
 * controllers rather than in the document. The Evidence ledger reads its tornado as influence weights.
 */
export const mcsRunStore = createStore<{ last: McsResult | null; running: boolean }>(() => ({ last: null, running: false }));

/**
 * Run the simulation on the active product's case (`activeDoc`, like every result) (synchronous, ~1 s at the default 2 000 draws). Returns the
 * elapsed milliseconds.
 */
export function runMcsSync(minDraws = 100): number {
  const t0 = Date.now(), doc = activeDoc(), mc = mcsOf(doc.MODEL);
  mcsRunStore.setState({ running: true });
  try {
    const last = runMcs(makeCtx(doc), Math.max(minDraws, mc.draws || 2000), mc.seed);
    mcsRunStore.setState({ last, running: false });
  } catch (e) {
    mcsRunStore.setState({ running: false });
    throw e;
  }
  return Date.now() - t0;
}

/** Same, after yielding one turn so the "running" state can paint before the synchronous loop starts (legacy mcsRunAndRender). */
export async function runMcsAsync(minDraws = 100): Promise<number> {
  mcsRunStore.setState({ running: true });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return runMcsSync(minDraws);
}
