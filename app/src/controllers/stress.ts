/** @calc-zone stress */
import { current } from 'immer';
import { LOCATIONS, makeCtx } from '@/domain';
import { locationMix } from '@/domain/location';
import { MC_PARAMS_DEFAULT, mcDrawsOf, mcSeedOf, mcFingerprint, runMonteCarlo, type McParam } from '@/domain/stress';
import { STRATEGY_DEFS_DEFAULT, STRAT_WEIGHTS_DEFAULT, strategyDefsOf, strategyPatch, stratWeightsOf, type LeverKey, type StrategyDef, type Weights } from '@/domain/verdict';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { simStore } from '@/store/simulation';
import type { Command, Doc } from '@/store/types';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const mcParams = (d: Doc): McParam[] => ((d as { mcParams?: McParam[] }).mcParams ??= clone(MC_PARAMS_DEFAULT));
const defs = (d: Doc): StrategyDef[] => ((d as { strategyDefs?: StrategyDef[] }).strategyDefs ??= clone(STRATEGY_DEFS_DEFAULT));
const weights = (d: Doc): Weights => ((d as { stratWeights?: Weights }).stratWeights ??= clone(STRAT_WEIGHTS_DEFAULT));
const strat = (d: Doc, id: string) => defs(d).find((s) => s.id === id);

const setSpreadCmd = defineCommand<{ id: string; value: string }>({
  type: 'mc.setSpread', label: (p) => `Set the Monte Carlo spread of ${p.id} to ±${p.value}`, coalesceKey: (p) => `mc.setSpread:${p.id}`,
  run(d, p) { const x = mcParams(d).find((q) => q.id === p.id), v = parseFloat(p.value); if (x && !isNaN(v) && v >= 0) x.spread = v; },
});
const resetMcCmd = defineCommand<Record<string, never>>({ type: 'mc.resetRanges', label: () => 'Reset the Monte Carlo ranges', run(d) { (d as { mcParams?: McParam[] }).mcParams = clone(MC_PARAMS_DEFAULT); } });
const setAutoCmd = defineCommand<{ on: boolean }>({
  type: 'mc.setAuto', label: (p) => `${p.on ? 'Enable' : 'Disable'} the automatic Monte Carlo re-run`, run(d, p) { (d as { mcAuto?: boolean }).mcAuto = p.on; },
});

const setLeverCmd = defineCommand<{ id: string; key: LeverKey; value: string }>({
  type: 'strategy.setLever', label: (p) => `Set ${p.key} of strategy ${p.id}`, coalesceKey: (p) => `strategy.setLever:${p.id}:${p.key}`,
  run(d, p) {
    const s = strat(d, p.id); if (!s) return;
    const n = parseFloat(p.value);
    if (p.value === '') s.levers[p.key] = null; else if (!isNaN(n)) s.levers[p.key] = n;
  },
});
const setDeclaredCmd = defineCommand<{ id: string; key: 'risk' | 'agility'; value: string }>({
  type: 'strategy.setDeclared', label: (p) => `Set the declared ${p.key} of strategy ${p.id}`,
  run(d, p) { const s = strat(d, p.id); if (s) s.declared[p.key] = Math.max(1, Math.min(5, Math.round(parseFloat(p.value) || 3))); },
});
const setModeCmd = defineCommand<{ id: string; mode: 'inherit' | 'asis' | 'custom' }>({
  type: 'strategy.setSplitMode', label: (p) => `Set the location split of strategy ${p.id} to ${p.mode}`,
  run(d, p) {
    const s = strat(d, p.id); if (!s) return;
    if (p.mode === 'inherit') s.locSplit = null;
    else if (p.mode === 'asis') s.locSplit = 'ASIS';
    else if (!s.locSplit || typeof s.locSplit !== 'object') {
      const mx = locationMix(current(d) as Doc).pct, out: Record<string, number> = {};
      LOCATIONS.forEach((l) => { out[l.name] = Math.round(((mx[l.name] as number) || 0) * 10) / 10; });
      s.locSplit = out;
    }
  },
});
const setSplitCmd = defineCommand<{ id: string; loc: string; value: string }>({
  type: 'strategy.setSplit', label: (p) => `Set ${p.loc} share of strategy ${p.id}`, coalesceKey: (p) => `strategy.setSplit:${p.id}:${p.loc}`,
  run(d, p) {
    const s = strat(d, p.id); if (!s || !s.locSplit || typeof s.locSplit !== 'object') return;
    const n = parseFloat(p.value); s.locSplit[p.loc] = isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  },
});
const resetStratCmd = defineCommand<Record<string, never>>({ type: 'strategy.resetAll', label: () => 'Reset all strategies', run(d) { (d as { strategyDefs?: StrategyDef[] }).strategyDefs = clone(STRATEGY_DEFS_DEFAULT); } });
const setWeightCmd = defineCommand<{ key: keyof Weights; value: string }>({
  type: 'strategy.setWeight', label: (p) => `Set the ${p.key} weight to ${p.value}`, coalesceKey: (p) => `strategy.setWeight:${p.key}`,
  run(d, p) { weights(d)[p.key] = Math.max(0, Math.min(100, parseFloat(p.value) || 0)); },
});
const resetWeightsCmd = defineCommand<Record<string, never>>({ type: 'strategy.resetWeights', label: () => 'Reset the strategy weights', run(d) { (d as { stratWeights?: Weights }).stratWeights = clone(STRAT_WEIGHTS_DEFAULT); } });
const applyCmd = defineCommand<{ id: string }>({
  type: 'strategy.apply', label: (p) => `Apply strategy ${p.id} to the live case`,
  run(d, p) {
    const c = makeCtx(current(d) as Doc), S = strategyDefsOf(c.s).find((x) => x.id === p.id);
    if (!S) return;
    const patch = strategyPatch(c, S);
    Object.assign(d.dom.values, patch.values);
    if (patch.fitAutoOff) d.dom.checked.fitAuto = false;
    if (patch.forceCeiling) d.forceGlassCeiling = true;
    if (patch.targetLocPct) d.targetLocPct = patch.targetLocPct;
    (d as { stratApplied?: unknown }).stratApplied = patch.applied;
  },
});

const go = <P,>(cmd: (p: P) => Command<P>, p: P): void => appStore().dispatch(cmd(p));
export const setMcSpread = (id: string, value: string): void => go(setSpreadCmd, { id, value });
export const resetMcRanges = (): void => go(resetMcCmd, {});
export const setMcAuto = (on: boolean): void => go(setAutoCmd, { on });
export const setStratLever = (id: string, key: LeverKey, value: string): void => go(setLeverCmd, { id, key, value });
export const setStratDeclared = (id: string, key: 'risk' | 'agility', value: string): void => go(setDeclaredCmd, { id, key, value });
export const setStratSplitMode = (id: string, mode: 'inherit' | 'asis' | 'custom'): void => go(setModeCmd, { id, mode });
export const setStratSplit = (id: string, loc: string, value: string): void => go(setSplitCmd, { id, loc, value });
export const resetStrategies = (): void => go(resetStratCmd, {});
export const setStratWeight = (key: keyof Weights, value: string): void => go(setWeightCmd, { key, value });
export const resetStratWeights = (): void => go(resetWeightsCmd, {});
export const applyStrategy = (id: string): void => go(applyCmd, { id });
export const currentWeights = (): Weights => stratWeightsOf(appStore().getState().doc);

/**
 * Run the seeded Monte Carlo on the current case and keep the distribution (derived data: never in the document or the history).
 * `draws` defaults to the mcDraws input; the verdict screens ask for 1000 like the legacy "Run now" buttons.
 */
export function runSimulation(draws?: number): void {
  const doc = appStore().getState().doc, c = makeCtx(doc);
  const r = runMonteCarlo(c, draws ?? mcDrawsOf(c), mcSeedOf(c));
  simStore.setState({ run: { ...r, fingerprint: mcFingerprint(doc) } });
}
