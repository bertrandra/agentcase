import { defineCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import type { TeamRow } from '@/domain/types/state';

const FTE_STEP = 0.5;
export const snapFTE = (v: unknown): number => { const n = parseFloat(String(v)); return isNaN(n) || n < 0 ? 0 : Math.round(n / FTE_STEP) * FTE_STEP; };

const addRowCmd = defineCommand<Partial<TeamRow>>({
  type: 'team.addRow', label: () => 'Add a team row',
  run(d, p) { d.teamIn.push({ skill: 'Dev', grade: 'B1', loc: 'France', etp: FTE_STEP, pins: [], ...p }); },
});
const updateRowCmd = defineCommand<{ index: number; field: 'skill' | 'grade' | 'loc' | 'etp'; value: string | number }>({
  type: 'team.updateRow', label: (p) => `Change team row ${p.index + 1}: ${p.field}`, coalesceKey: (p) => `team.updateRow:${p.index}:${p.field}`,
  run(d, p) {
    const r = d.teamIn[p.index]; if (!r) return;
    if (p.field === 'etp') r.etp = snapFTE(p.value); else r[p.field] = String(p.value);
  },
});
const removeRowCmd = defineCommand<{ index: number }>({
  type: 'team.removeRow', label: (p) => `Remove team row ${p.index + 1}`,
  run(d, p) { if (d.teamIn.length > 1) d.teamIn.splice(p.index, 1); },
});

export const addTeamRow = (row: Partial<TeamRow> = {}): void => appStore().dispatch(addRowCmd(row));
export const updateTeamRow = (index: number, field: 'skill' | 'grade' | 'loc' | 'etp', value: string | number): void =>
  appStore().dispatch(updateRowCmd({ index, field, value }));
export const removeTeamRow = (index: number): void => appStore().dispatch(removeRowCmd({ index }));
