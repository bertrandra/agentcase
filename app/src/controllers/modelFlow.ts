/** @calc-zone time-engine */
import { DEFAULT_DISCOUNT_RATE } from '@/domain/economics/cashflow';
import { ensureNs } from '@/domain/model/modelState';
import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { clampNum, parseNum } from './modelKit';

/** P5 (flow and value): measured inputs and the sponsor-owned margin. Setting a real margin IS the enable action (no seeded default). */
type Val = { value: string | number };
type Key = 'marginPerMonth' | 'discountRate' | 'throughputInShare' | 'cycleTime' | 'wip';
const cmd = (type: string, name: string, key: Key, dflt: number, lo: number, hi: number, enable = false) => defineCommand<Val>({
  type, label: (p) => `Set ${name} to ${p.value}`, coalesceKey: () => type,
  run(d, p) {
    ensureNs(d.MODEL, 'FLOW')[key] = clampNum(parseNum(p.value, dflt), lo, hi);
    if (enable) d.MODEL.FLAGS.flow = true;
  },
});
const marginCmd = cmd('model.flow.setMargin', 'margin per month', 'marginPerMonth', 0, 0, Infinity, true);
const discountCmd = cmd('model.flow.setDiscount', 'time-to-market discount rate', 'discountRate', DEFAULT_DISCOUNT_RATE, 0, 1);
const shareCmd = cmd('model.flow.setShare', 'throughput-in share', 'throughputInShare', 0, 0, 100);
const ctCmd = cmd('model.flow.setCycleTime', 'measured lead time', 'cycleTime', 0, 0, Infinity);
const wipCmd = cmd('model.flow.setWip', 'measured WIP', 'wip', 0, 0, Infinity);
const resetCmd = defineCommand<Record<string, never>>({
  type: 'model.flow.reset', label: () => 'Reset / hide the time-to-market valuation',
  run(d) { const f = ensureNs(d.MODEL, 'FLOW'); d.MODEL.FLAGS.flow = false; f.marginPerMonth = 0; f.throughputInShare = 0; f.cycleTime = 0; f.wip = 0; },
});

export const setFlowMargin = (value: string | number): void => appStore().dispatch(marginCmd({ value }));
export const setFlowDiscount = (value: string | number): void => appStore().dispatch(discountCmd({ value }));
export const setFlowShare = (value: string | number): void => appStore().dispatch(shareCmd({ value }));
export const setFlowCycleTime = (value: string | number): void => appStore().dispatch(ctCmd({ value }));
export const setFlowWip = (value: string | number): void => appStore().dispatch(wipCmd({ value }));
export const resetFlow = (): void => appStore().dispatch(resetCmd({}));
