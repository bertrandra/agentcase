import { addDashboard } from '@/controllers/pdcBoard';
import { addCard, addRow, moveBodyRow, removeCard, removeRow, setCardField, setCardSource, setDescription, setRowField, setRowSeq, setRowSource } from '@/controllers/pdcBoardRows';
import { newDashboard } from '@/domain/pdc/board';
import type { Sample } from './types';

const dash = newDashboard({ groupIds: ['tune'], allGroups: false, existing: [], groups: [{ id: 'tune', label: '4 · Tune' }], sections: [{ id: 'knowledge', group: 'tune', label: '🧠 Knowledge hub' }], maxOrder: 170 })!;
const card = dash.cards[0]!.CARD_ID;
const prep = () => addDashboard(dash);
/** A dashboard with three body rows (row-1..row-3), the middle one bound to a variable of its source. */
const rows = () => { prep(); addRow(dash.id); addRow(dash.id); addRow(dash.id); setRowField(dash.id, 'row-2', 'var', 'khMultiplier'); };

export const samples: Record<string, Sample> = {
  'board.setDescription': { prep, run: () => setDescription(dash.id, 'Steering view') },
  'board.addRow': { prep, run: () => addRow(dash.id) },
  'board.removeRow': { prep: rows, run: () => removeRow(dash.id, 'row-2', 'New row') },
  'board.moveRow': { prep: rows, run: () => moveBodyRow(dash.id, 'row-2', -1) },
  'board.setRowSeq': { prep: rows, run: () => setRowSeq(dash.id, 'row-1', 9) },
  'board.setRowField': { prep: rows, run: () => setRowField(dash.id, 'row-1', 'label', 'Savings') },
  'board.setRowSource': { prep: rows, run: () => setRowSource(dash.id, 'row-2', 'financial') },
  'board.addCard': { prep, run: () => addCard(dash.id) },
  'board.removeCard': { prep, run: () => removeCard(dash.id, card, 'Headlines') },
  'board.setCardField': { prep, run: () => setCardField(dash.id, card, 'CARD_ENABLED', false) },
  'board.setCardSource': { prep, run: () => setCardSource(dash.id, card, 'financial') },
};
