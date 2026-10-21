import { describe, expect, it } from 'vitest';
import { runMcs } from '@/domain/model/mcs';
import { convergenceChecks } from '@/domain/pdc/verifConvergence';
import { ctxOf, pdc } from '../helpers/pdc';

const row = (id: string, rt = {}) => convergenceChecks(ctxOf('golden'), rt).find((x) => x.id === id)!;

describe('convergence checks that read session state, not the case', () => {
  it('a clean page (no Monte Carlo run, no registry supplied) holds all 67 rows of the legacy table', () => {
    const rows = convergenceChecks(ctxOf('golden'));
    expect(rows.map((r) => r.id)).toEqual(pdc<{ conv: string[][] }>('pdc_verif', 'golden').conv.slice(1).map((r) => r[0]));
    expect(rows.every((r) => r.pass)).toBe(true);
  });
  it('CC-MC-01 fails on a short run (n < 500) with the legacy message, and the numbers are the legacy ones for seed 777', () => {
    const run = runMcs(ctxOf('golden'), 300, 777), r = row('CC-MC-01', { mcsLast: run });
    expect(r.pass).toBe(false);
    // the page state the oracle used to record before the extra was made hermetic: seed=777 n=300 p10=834716 p50=883135 p90=934725
    expect(r.detail).toBe('seed/draws/ordering violated: seed=777 n=300 p10=834716 p50=883135 p90=934725');
  });
  it('CC-MC-01 / CC-MC-02 hold on a run of at least 500 draws, which CC-MC-02 reproduces with the same seed', () => {
    const run = runMcs(ctxOf('golden'), 500, 7), rt = { mcsLast: run };
    expect([row('CC-MC-01', rt).pass, row('CC-MC-02', rt).pass]).toEqual([true, true]);
  });
  it('CC-DEP-01 / CC-DEP-02 report dangling edges and a `drives` section without an outgoing edge', () => {
    const sections = [{ id: 'a', label: 'A', group: 'g', groupSeq: 1, tag: 'drives' }, { id: 'b', label: 'B', group: 'g', groupSeq: 2 }];
    expect(row('CC-DEP-01', { sections, deps: { a: { b: 'S' } } }).pass).toBe(true);
    expect(row('CC-DEP-01', { sections, deps: { a: { zz: 'S' }, gone: { b: 'I' } } }).detail).toBe('2 dangling edge reference(s): a→zz, gone (source)');
    expect(row('CC-DEP-02', { sections, deps: {} }).detail).toBe('1 tag/edge disagreement(s) — a: tagged drives but has no outgoing edge');
  });
  it('CC-MP-03 flags a playback whose horizon differs from the case horizon', () => {
    expect(row('CC-MP-03', { playbackHorizon: 5 }).detail).toBe('Monthly Playback: horizon changed while playing without resetting to idle (advisory)');
    expect(row('CC-MP-03', { playbackHorizon: 3 }).pass).toBe(true);
  });
});
