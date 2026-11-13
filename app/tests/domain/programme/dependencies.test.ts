import { describe, expect, it } from 'vitest';
import { makeCtx } from '@/domain';
import { groupByDependency, programmeParents, programmeProcess, programmeTable } from '@/domain/programme';
import { opened } from '../../helpers/processCases';

/** The dependencies between the programme's lines (📋 Programme grouping, the Gantt's links): who follows whom, and the grouped order. */
const golden = () => { const c = makeCtx(opened('golden')); return programmeTable(c, programmeProcess(c)).rows; };

describe('programme dependencies', () => {
  it('stages in order, the pilot in Pilot & Prove, run / AgentOps / gates after the build, the hub run after its setup', () => {
    const p = programmeParents(golden().map((r) => r.kind));
    expect(p.get('stage-calibrate')).toBe('stage-discover');
    expect(p.get('stage-validate')).toBe('stage-calibrate');
    expect(p.get('stage-pilotProve')).toBe('stage-validate');
    expect(p.get('stage-decide')).toBe('stage-pilotProve');
    expect(p.get('pilot')).toBe('stage-pilotProve');
    for (const k of ['run', 'agentops', 'govGates', 'gate-L2', 'gate-L3', 'gate-L4']) expect(p.get(k)).toBe('build');
    expect(p.get('hubRun')).toBe('hubSetup');
    expect(p.get('capabilityTarget')).toBe('setupTraining');
    expect(p.has('stage-discover') || p.has('build') || p.has('setupTooling') || p.has('hypercare')).toBe(false);
  });
  it('a line whose parent is absent heads its own group; a skipped stage links to the previous one present', () => {
    expect(programmeParents(['run', 'agentops']).size).toBe(0);
    expect(programmeParents(['stage-discover', 'stage-validate']).get('stage-validate')).toBe('stage-discover');
  });
  it('groups: every line once, each head then its dependents depth first, the input order kept', () => {
    const rows = golden(), g = groupByDependency(rows, (r) => r.kind);
    expect(g.map((l) => l.index).sort((a, b) => a - b)).toEqual(rows.map((_, i) => i));
    const name = (i: number) => rows[i]!.kind, heads = g.filter((l) => l.depth === 0);
    const discover = heads.find((l) => name(l.index) === 'stage-discover')!;
    expect(discover.dependents.map(name)).toEqual(['stage-calibrate', 'stage-validate', 'stage-pilotProve', 'stage-decide', 'pilot']);
    const build = heads.find((l) => name(l.index) === 'build')!;
    expect(build.dependents.map(name)).toEqual(['run', 'agentops', 'govGates', 'gate-L2', 'gate-L3', 'gate-L4']);
    expect(heads.find((l) => name(l.index) === 'hubSetup')!.dependents.map(name)).toEqual(['hubRun']);
    expect(heads.find((l) => name(l.index) === 'setupTooling')!.dependents).toEqual([]);
    expect(g.find((l) => name(l.index) === 'pilot')!.depth).toBe(4);   // discover › calibrate › validate › Pilot & Prove › pilot
  });
});
