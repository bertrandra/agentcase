/** @calc-zone run-setup-taxes */
import { COEF_DEFAULT, STATUS_LIFECYCLE, TOKEN_MODELS_DEFAULT } from '@/domain/catalog';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { Doc } from '@/store/types';

/* Commands of the "tune B" sections: coefficients (COEF), token model rows, lifecycle posture. Plain form inputs use controllers/inputs. */

const setCoefCmd = defineCommand<{ key: string; value: number; domId?: string }>({
  type: 'tuneB.coef.set', label: (p) => `Set coefficient ${p.key} to ${p.value}`, coalesceKey: (p) => `tuneB.coef.set:${p.key}`,
  run(d, p) {
    if (!(p.key in COEF_DEFAULT) || isNaN(p.value)) return;
    d.COEF[p.key] = p.value;
    if (p.domId) d.dom.values[p.domId] = String(p.value);   // the legacy input element keeps the typed value in the snapshot
  },
});
/** Edit an embedded coefficient (legacy coefSet); `domId` is the legacy input that mirrors it. Invalid numbers are ignored. */
export const setCoef = (key: string, value: string | number, domId?: string): void => appStore().dispatch(setCoefCmd({ key, value: typeof value === 'number' ? value : parseFloat(value), domId }));

type TokField = 'name' | 'mix' | 'priceIn' | 'priceOut';
const setTokFieldCmd = defineCommand<{ index: number; field: TokField; value: string }>({
  type: 'tuneB.token.setField', label: (p) => `Set model ${p.index + 1} ${p.field} to ${p.value}`, coalesceKey: (p) => `tuneB.token.setField:${p.index}:${p.field}`,
  run(d, p) {
    const m = d.TOKEN_MODELS[p.index]; if (!m) return;
    if (p.field === 'name') { m.name = p.value; return; }
    let n = parseFloat(p.value); if (isNaN(n)) n = 0; if (n < 0) n = 0; if (p.field === 'mix' && n > 100) n = 100;
    m[p.field] = n;
  },
});
const addTokenCmd = defineCommand<Record<string, never>>({
  type: 'tuneB.token.add', label: () => 'Add a token model', run(d) { d.TOKEN_MODELS.push({ name: 'New model', mix: 0, priceIn: 0, priceOut: 0 }); },
});
const removeTokenCmd = defineCommand<{ index: number }>({
  type: 'tuneB.token.remove', label: (p) => `Remove token model ${p.index + 1}`, run(d, p) { d.TOKEN_MODELS.splice(p.index, 1); },
});
const resetTokensCmd = defineCommand<Record<string, never>>({
  type: 'tuneB.token.reset', label: () => 'Reset the token models to defaults',
  run(d) { d.TOKEN_MODELS = TOKEN_MODELS_DEFAULT.map((r) => ({ ...r })); d.TOK_OUT_SHARE = 35; d.dom.values.tokOutShare = '35'; },
});
const setOutShareCmd = defineCommand<{ value: number }>({
  type: 'tuneB.token.setOutShare', label: (p) => `Set the output token share to ${p.value}%`, coalesceKey: () => 'tuneB.token.setOutShare',
  run(d, p) { const n = isNaN(p.value) ? 35 : Math.max(0, Math.min(100, p.value)); d.TOK_OUT_SHARE = n; d.dom.values.tokOutShare = String(n); },
});
export const setTokenField = (index: number, field: TokField, value: string): void => appStore().dispatch(setTokFieldCmd({ index, field, value }));
export const addTokenModel = (): void => appStore().dispatch(addTokenCmd({}));
export const removeTokenModel = (index: number): void => appStore().dispatch(removeTokenCmd({ index }));
export const resetTokenModels = (): void => appStore().dispatch(resetTokensCmd({}));
export const setTokenOutShare = (value: string | number): void => appStore().dispatch(setOutShareCmd({ value: typeof value === 'number' ? value : parseFloat(value) }));

function statusOf(d: Doc, id: string) {
  let s = d.statusLifecycle.find((x) => x.id === id);
  if (!s) { const def = STATUS_LIFECYCLE.find((x) => x.id === id); if (!def) return undefined; s = { id, autoPosture: def.autoPosture, weights: { ...def.weights } }; d.statusLifecycle.push(s); }
  return s;
}
const setPostureCmd = defineCommand<{ status: string; value: number }>({
  type: 'tuneB.lifecycle.setPosture', label: (p) => `Set the ${p.status} automation posture to ${p.value}`, coalesceKey: (p) => `tuneB.lifecycle.setPosture:${p.status}`,
  run(d, p) { const s = statusOf(d, p.status); if (s && !isNaN(p.value) && p.value >= 0) s.autoPosture = p.value; },
});
const resetLifecycleCmd = defineCommand<Record<string, never>>({
  type: 'tuneB.lifecycle.reset', label: () => 'Reset the product profile coefficients to defaults',
  run(d) { d.statusLifecycle = STATUS_LIFECYCLE.map((s) => ({ id: s.id, autoPosture: s.autoPosture, weights: { ...s.weights } })); },
});
/** Automation posture of a product status (legacy setStatusPosture): negative or invalid values are ignored. */
export const setStatusPosture = (status: string, value: string | number): void => appStore().dispatch(setPostureCmd({ status, value: typeof value === 'number' ? value : parseFloat(value) }));
export const resetLifecycleCoefficients = (): void => appStore().dispatch(resetLifecycleCmd({}));
