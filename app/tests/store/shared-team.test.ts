import { describe, expect, it } from 'vitest';
import { exportParamsWorkbook, importParamsWorkbook } from '@/controllers/excelParams';
import { setTeamTotal } from '@/controllers/baseline';
import { removeProduct } from '@/controllers/product';
import { removeSharedLine, setSharedShare, updateSharedLine } from '@/controllers/sharedTeam';
import { addTeamRow, removeTeamRow, updateTeamRow } from '@/controllers/team';
import { teamEtp } from '@/domain/portfolio/alloc';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openChecked } from '@/store/persistence/schema';
import { toSnapshot } from '@/store/persistence/snapshot';
import { ENV } from '../helpers/excelParams';
import { docNow, pfNow, sharedSetup, xlsxFile } from '../helpers/sharedTeamStore';
import { snapUndoable } from './helpers';

const pf = pfNow, doc = docNow, setup = sharedSetup, file = xlsxFile;

describe('shared team commands (undoable)', () => {
  it('add / edit / share / remove are one undo step each and undo restores the exact portfolio', () => {
    const { s, ids, id } = setup();
    expect(pf().sharedTeam).toHaveLength(1);
    const steps: [() => boolean, string][] = [[() => updateSharedLine(id, 'etp', 4), 'etp'], [() => setSharedShare(id, ids[2], 0), 'noop'],
      [() => setSharedShare(id, ids[0], 30), 'share'], [() => removeSharedLine(id), 'remove']];
    for (const [run, what] of steps) {
      const before = snapUndoable(s), ok = run();
      if (what === 'noop') { expect(ok).toBe(false); continue; }
      expect(ok).toBe(true);
      s.undo();
      expect(snapUndoable(s)).toBe(before);
      s.redo();
    }
    expect(pf()).not.toHaveProperty('sharedTeam');
    s.undo();
    expect(pf().sharedTeam![0]!.allocations[ids[0]]).toBe(30);
  });

  it('the active product sees its share in its case; team edits never write the shared row into its own team', () => {
    const { ids } = setup(), own = pf().products[0]!.teamIn.length;
    expect(doc().teamIn).toHaveLength(own + 1);
    expect(doc().teamIn[own]).toMatchObject({ etp: 1, shared: pf().sharedTeam![0]!.id });
    addTeamRow(); updateTeamRow(0, 'etp', 7); updateTeamRow(own + 1, 'etp', 9);   // own + 1 = the shared row after the new row
    const mine = pf().products.find((p) => p.id === ids[0])!.teamIn;
    expect(mine).toHaveLength(own + 1);
    expect(mine.some((r) => r.shared !== undefined)).toBe(false);
    expect(mine[0]!.etp).toBe(7);
    removeTeamRow(own);   // the added own row
    expect(pf().products[0]!.teamIn).toHaveLength(own);
  });

  it('scaling the team total keeps the shared FTE and scales the own rows to the rest', () => {
    setup();
    setTeamTotal(21);
    expect(teamEtp(pf().products[0]!.teamIn)).toBeCloseTo(20, 9);
    expect(teamEtp(doc().teamIn)).toBeCloseTo(21, 9);
  });

  it('deleting a product drops its shares in the same undo step; undo brings them back', () => {
    const { s, ids, id } = setup(), before = snapUndoable(s);
    expect(removeProduct(ids[1])).toBe(true);
    expect(pf().sharedTeam![0]!.allocations).toEqual({ [ids[0]]: 50 });
    s.undo();
    expect(snapUndoable(s)).toBe(before);
    expect(pf().sharedTeam!.find((l) => l.id === id)!.allocations[ids[1]]).toBe(50);
  });
});

describe('shared team persistence', () => {
  it('a portfolio file keeps the shared lines; a damaged share is dropped with a note', () => {
    const { ids } = setup(), raw = toPortfolioSnapshot(pf());
    expect(openSnapshot(JSON.parse(JSON.stringify(raw))).sharedTeam).toEqual(pf().sharedTeam);
    const bad = JSON.parse(JSON.stringify(raw)) as { sharedTeam: { allocations: Record<string, unknown> }[] };
    bad.sharedTeam[0]!.allocations[ids[0]] = 300;
    const r = openChecked(bad);
    expect(r.portfolio.sharedTeam![0]!.allocations).toEqual({ [ids[1]]: 50 });
    expect(r.notes.join('\n')).toMatch(/share 300/);
  });

  it('a single case saved from an effective team keeps the share as an ordinary row of its own', () => {
    setup();
    const opened = openChecked(JSON.parse(JSON.stringify(toSnapshot(doc())))).portfolio.products[0]!.teamIn;
    expect(opened).toHaveLength(doc().teamIn.length);
    expect(opened.some((r) => 'shared' in r)).toBe(false);
  });

  it('the parameters workbook exports the shared lines (SharedTeam sheet) and imports them back', async () => {
    setup();
    const before = pf().sharedTeam, b = await (await exportParamsWorkbook('all', ENV)).blob.arrayBuffer();
    removeSharedLine(before![0]!.id);
    await importParamsWorkbook(file(b), ENV);
    expect(pf().sharedTeam).toEqual(before);
  });
});
