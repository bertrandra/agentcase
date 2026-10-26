import { addDashboard, bindCardVariable, removeDashboard, renameCard, renameDashboard, setDashboardGroup } from '@/controllers/pdcBoard';
import { newDashboard } from '@/domain/pdc/board';
import type { Sample } from './types';

const dash = newDashboard({ groupIds: ['tune'], allGroups: false, existing: [], groups: [{ id: 'tune', label: '4 · Tune' }],
  sections: [{ id: 'knowledge', group: 'tune', label: '🧠 Knowledge hub' }], maxOrder: 170 })!;
const prep = () => addDashboard(dash);

export const samples: Record<string, Sample> = {
  'board.addDashboard': () => prep(),
  'board.removeDashboard': { prep, run: () => removeDashboard(dash.id, dash.title) },
  'board.renameDashboard': { prep, run: () => renameDashboard(dash.id, 'My board') },
  'board.setDashboardGroup': { prep, run: () => setDashboardGroup(dash.id, 'verify') },
  'board.bindCardVariable': { prep, run: () => bindCardVariable(dash.id, dash.cards[0]!.CARD_ID, 'CARD_IMPACT_VAR', 'npv8') },
  'board.renameCard': { prep, run: () => renameCard(dash.id, dash.cards[0]!.CARD_ID, 'My headline') },
};
