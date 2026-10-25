import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { clearSharedPins, removeSharedLine, setSharedPins } from '@/controllers/sharedTeam';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { ENV } from '../helpers/excelParams';
import { docNow, pfNow, sharedSetup, xlsxFile } from '../helpers/sharedTeamStore';
import { snapUndoable } from './helpers';

const pf = pfNow, doc = docNow, setup = sharedSetup, file = xlsxFile;

describe('pins on a shared team line: commands', () => {
  it('pin, unpin, a whole phase and clear are one undo step each; undo restores the exact portfolio', () => {
    const { s, id } = setup();
    const steps: (() => boolean)[] = [() => setSharedPins(id, ['A001'], true), () => setSharedPins(id, ['A002', 'A003', 'A004'], true),
      () => setSharedPins(id, ['A001'], false), () => clearSharedPins(id)];
    for (const run of steps) {
      const before = snapUndoable(s);
      expect(run()).toBe(true);
      s.undo();
      expect(snapUndoable(s)).toBe(before);
      s.redo();
    }
    expect(pf().sharedTeam![0]).not.toHaveProperty('pins');
    expect(clearSharedPins(id)).toBe(false);   // nothing to clear: no step
  });

  it('the active product’s case sees the pins on its share row; its own team is untouched', () => {
    const { id } = setup(), own = JSON.stringify(pf().products[0]!.teamIn);
    setSharedPins(id, ['A001', 'A002'], true);
    expect(doc().teamIn.find((r) => r.shared === id)!.pins).toEqual(['A001', 'A002']);
    expect(JSON.stringify(pf().products[0]!.teamIn)).toBe(own);
  });
});

describe('pins on a shared team line: persistence', () => {
  it('a portfolio file keeps the pins; bad pins are repaired with a note; a file without pins has none', () => {
    const { id } = setup(), plain = JSON.parse(JSON.stringify(toPortfolioSnapshot(pf())));
    expect(openSnapshot(plain).sharedTeam![0]).not.toHaveProperty('pins');
    setSharedPins(id, ['A001', 'A002'], true);
    const raw = JSON.parse(JSON.stringify(toPortfolioSnapshot(pf())));
    expect(openSnapshot(raw).sharedTeam).toEqual(pf().sharedTeam);
    const bad = JSON.parse(JSON.stringify(raw)) as { sharedTeam: { pins: unknown }[] };
    bad.sharedTeam[0]!.pins = ['A001', 7, 'A001'];
    let r = openChecked(bad);
    expect(r.portfolio.sharedTeam![0]!.pins).toEqual(['A001']);
    expect(r.notes.join('\n')).toMatch(/pin 7 is not valid/);
    bad.sharedTeam[0]!.pins = 'A001';
    r = openChecked(bad);
    expect(r.portfolio.sharedTeam![0]).not.toHaveProperty('pins');
    expect(r.notes.join('\n')).toMatch(/pins is not a list/);
  });

  it('the parameters workbook exports the pins (SharedTeam sheet, column H) and imports them back', async () => {
    const { id } = setup();
    setSharedPins(id, ['A001', 'A003'], true);
    const before = pf().sharedTeam, b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    removeSharedLine(id);
    await importParamsWorkbook(file(b), ENV);
    expect(pf().sharedTeam).toEqual(before);
    expect(pf().sharedTeam![0]!.pins).toEqual(['A001', 'A003']);
  });
});
