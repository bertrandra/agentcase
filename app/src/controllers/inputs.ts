import { defineCommand } from '@/store/commands';
import { refitPotential } from '@/store/derive';
import { appStore } from '@/store/instance';

const setInputCmd = defineCommand<{ id: string; value: string }>({
  type: 'input.set', label: (p) => `Set ${p.id} to ${p.value}`, coalesceKey: (p) => `input.set:${p.id}`,
  run(d, p) { d.dom.values[p.id] = p.value; if (p.id === 'autoCapPct') refitPotential(d); },
});
const setCheckedCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'input.check', label: (p) => `${p.on ? 'Enable' : 'Disable'} ${p.id}`,
  run(d, p) { d.dom.checked[p.id] = p.on; if (p.id === 'fitAuto') refitPotential(d); },
});

/** Write a form input (legacy: the DOM value read by P()/V()). Fit-to-scope is re-applied where it matters. */
export const setInput = (id: string, value: string | number): void => appStore().dispatch(setInputCmd({ id, value: String(value) }));
export const setChecked = (id: string, on: boolean): void => appStore().dispatch(setCheckedCmd({ id, on }));
