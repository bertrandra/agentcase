import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';

// ---- Assumptions register -----------------------------------------------------------------------------------------------
const assumptOkCmd = defineCommand<{ id: string; on: boolean }>({
  type: 'pdc.setAssumptValidated', label: (p) => `${p.on ? 'Mark' : 'Unmark'} ${p.id} as validated with the client`,
  run(d, p) {
    const ok = { ...((d.assumptValidated as Record<string, boolean> | undefined) ?? {}) };
    if (p.on) ok[p.id] = true; else delete ok[p.id];
    d.assumptValidated = ok;
  },
});
export const setAssumptValidated = (id: string, on: boolean): void => appStore().dispatch(assumptOkCmd({ id, on }));
