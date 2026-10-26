import { describe, expect, it } from 'vitest';
import { newDashboard, type BoardRow, type DynSection } from '@/domain/pdc/board';
import { bindable, freshId, moveRow, newCard, newRow, sortedRows } from '@/domain/pdc/boardRows';
import { NO_RUNTIME, VARIABLES } from '@/domain/pdc/variables';
import { cardModel, renderDynamicSection, rowDisplay } from '@/ui/sections/configure/board/dynamic';
import { formatValue } from '@/ui/sections/configure/board/format';
import { SECTIONS, GROUPS } from '@/ui/zones/registry';
import { ctxOf } from '../helpers/pdc';

const row = (id: string, seq?: number): BoardRow => ({ id, label: id, seq });
const ids = (rows: BoardRow[]) => sortedRows(rows).map((r) => r.id);

describe('board body rows (pure helpers)', () => {
  it('rows display by seq, ties and missing seq keep their stored order', () => {
    expect(ids([row('c', 3), row('a', 1), row('b', 1), row('d')])).toEqual(['d', 'a', 'b', 'c']);
  });
  it('new rows and cards get unique, replayable ids and go last', () => {
    expect(freshId('row-', ['row-1', 'row-2'], 1)).toBe('row-3');
    const rows = [row('row-1', 1), row('row-3', 4)];
    expect(newRow('knowledge', rows)).toMatchObject({ id: 'row-4', seq: 5, label: 'New row', var: null, source: 'knowledge', format: null, defaultValue: '' });
    const card = newCard('knowledge', []);
    expect(card).toMatchObject({ CARD_ID: 'card-knowledge-1', CARD_SEQ: 1, CARD_ENABLED: false, CARD_NAME_VALUE: 'New card', CARD_IMPACT_VAR: null });
  });
  it('moving a row swaps it with its neighbour, even when the stored seq values are equal or missing', () => {
    const rows = [row('a'), row('b'), row('c')];
    moveRow(rows, 'c', -1);
    expect(ids(rows)).toEqual(['a', 'c', 'b']);
    moveRow(rows, 'a', -1);   // already first: the order stays
    expect(ids(rows)).toEqual(['a', 'c', 'b']);
    moveRow(rows, 'a', 1);
    expect(ids(rows)).toEqual(['c', 'a', 'b']);
  });
  it('a variable is bindable from its own section and from GLOBAL, not from another one', () => {
    expect(bindable('knowledge', 'khMultiplier')).toBe(true);
    expect(bindable('knowledge', 'netSavY3')).toBe(true);
    expect(bindable('knowledge', 'setupTotal')).toBe(false);
    expect(bindable('knowledge', null)).toBe(true);
  });
});

describe('a stored dynamic section as its tab shows it', () => {
  const sections = SECTIONS.map((s) => ({ id: s.id, group: s.group, label: s.label }));
  const dash = (all: boolean): DynSection => newDashboard({ groupIds: ['tune'], allGroups: all, existing: [], groups: GROUPS, sections, maxOrder: 0 })!;

  it('every card shows the live value of the variable it is bound to, in the card format', () => {
    const c = ctxOf('golden'), d = dash(true), m = renderDynamicSection(d, c);
    expect(m.cards).toHaveLength(d.cards.length);
    const by = (id: string) => VARIABLES.find((v) => v.id === id)!;
    d.cards.forEach((card, i) => {
      const v = card.CARD_IMPACT_VAR ? by(card.CARD_IMPACT_VAR) : null;
      expect(m.cards[i]!.impact).toBe(v ? formatValue(v.get(c), v.format) : null);
    });
    expect(m.cards[0]!.impact).toBe('€892K');
  });
  it('binds every variable of the registry: any one can sit in a card slot or a row and reads its value', () => {
    const c = ctxOf('golden');
    for (const v of VARIABLES) {
      const card = { ...newCard('x', []), CARD_IMPACT_VAR: v.id };
      const expected = formatValue(v.get(c, NO_RUNTIME), v.format);
      expect(cardModel(c, card).impact, v.id).toBe(expected);
      expect(rowDisplay(c, { ...newRow('x', []), var: v.id }), v.id).toBe(expected);
    }
  });
  it('a row shows its variable in its own format, else the default text', () => {
    const c = ctxOf('golden');
    expect(rowDisplay(c, { ...newRow('x', []), var: 'artefactsInScope' })).toBe('10');
    expect(rowDisplay(c, { ...newRow('x', []), var: 'artefactsInScope', format: 'PCT' })).toBe('10%');
    expect(rowDisplay(c, { ...newRow('x', []), defaultValue: 'n/a' })).toBe('n/a');
    expect(rowDisplay(c, { ...newRow('x', []), var: 'noSuchVariable', defaultValue: 'n/a' })).toBe('n/a');
    expect(rowDisplay(c, newRow('x', []))).toBe('—');
  });
  it('cards and rows come in seq order and the section is described', () => {
    const c = ctxOf('golden'),
      d = { ...dash(false), description: 'Steering', rows: [{ ...row('b', 2), var: 'baseFte' }, { ...row('a', 1), defaultValue: 'x' }] };
    d.cards = [{ ...d.cards[1]!, CARD_SEQ: 1 }, { ...d.cards[0]!, CARD_SEQ: 2 }];
    const m = renderDynamicSection(d, c);
    expect(m.description).toBe('Steering');
    expect(m.cards.map((x) => x.name)).toEqual([d.cards[0]!.CARD_NAME_VALUE, d.cards[1]!.CARD_NAME_VALUE]);
    expect(m.rows.map((r) => [r.label, r.display])).toEqual([['a', 'x'], ['b', formatValue(VARIABLES.find((v) => v.id === 'baseFte')!.get(c), 'DEC1')]]);
  });
});
