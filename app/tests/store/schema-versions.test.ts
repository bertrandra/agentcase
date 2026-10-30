import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { envelopeCase } from '@/domain/portfolio';
import { parseCaseFile } from '@/store/persistence/html/legacy';
import { readPortfolio } from '@/store/persistence/portfolioRead';
import { isPortfolioSnapshot, openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { migrate, MIGRATIONS, NewerFileError, openChecked, SNAPSHOT_SCHEMA_VERSION, VERSION_KEY } from '@/store/persistence/schema';
import { fromSnapshot, sanitize } from '@/store/persistence/snapshot';

/**
 * Every committed case file: legacy cases, JSON / HTML snapshots (this build's and v18.x), portfolios, a v20.0 French portfolio (open-fit.json is a
 * table of expected values, not a case).
 */
const files = (dir: string, ext: RegExp) => readdirSync(dir).filter((f) => ext.test(f)).map((f) => `${dir}/${f}`);
const ALL = [...files('fixtures/cases', /\.json$/), ...files('fixtures/snapshots', /\.(json|html)$/).filter((f) => !f.endsWith('open-fit.json')),
  ...files('fixtures/portfolios', /\.json$/), 'tests/store/data/pf-v20-french.json'];
const rawOf = (f: string): unknown => parseCaseFile(readFileSync(f, 'utf8')).raw;
/**
 * The migration chain then the strict readers alone, as every file was opened before the validators (the persona aside: view state since D3). Since
 * v3 the chain is not a no-op (v2 -> v3 writes the process document, in the case and in its snapshot library): the validators must add nothing.
 */
const strict = (file: unknown) => {
  const raw = migrate(sanitize(file) as Record<string, unknown>);
  return isPortfolioSnapshot(raw) ? readPortfolio(raw) : envelopeCase(fromSnapshot(raw));
};

describe('file schema: versions, migrations, validation', () => {
  it(`opens every fixture (${ALL.length} files) exactly as before: no correction, the same work`, () => {
    expect(ALL.length).toBeGreaterThan(110);
    for (const f of ALL) {
      const raw = rawOf(f), { portfolio, notes } = openChecked(raw);
      expect(notes, f).toEqual([]);
      const { persona: _p, ...work } = portfolio; void _p;
      expect(work, f).toEqual(strict(raw));
    }
  });
  it('the chain covers every version below the current one, and the v1 -> v2 step is a no-op on the fixtures', () => {
    expect(SNAPSHOT_SCHEMA_VERSION).toBe(3);
    for (let v = 1; v < SNAPSHOT_SCHEMA_VERSION; v++) expect(typeof MIGRATIONS[v]).toBe('function');
    for (const f of ALL) { const s = sanitize(rawOf(f)) as Record<string, unknown>; expect(MIGRATIONS[1]!(s), f).toBe(s); }
    expect(MIGRATIONS[1]!({ _schema: ' AgentCase.Portfolio.V1 ' })._schema).toBe('agentcase.portfolio.v1');
  });
  it('written files carry the schema version; write -> read -> write is stable', () => {
    for (const f of ['fixtures/cases/golden.json', 'fixtures/portfolios/pf-three-products.json']) {
      const pf = openSnapshot(rawOf(f)), a = toPortfolioSnapshot(pf, () => new Date(0));
      expect(a[VERSION_KEY], f).toBe(3);
      const b = toPortfolioSnapshot(openSnapshot(JSON.parse(JSON.stringify(a))), () => new Date(0));
      expect(JSON.stringify(b), f).toBe(JSON.stringify(a));
    }
  });
  it('a file from a newer AgentCase is refused with a clear message', () => {
    const raw = { ...(rawOf('fixtures/cases/golden.json') as object), [VERSION_KEY]: 99 };
    expect(() => openChecked(raw)).toThrow(NewerFileError);
    expect(() => openChecked(raw)).toThrow(/made with a newer AgentCase \(file format v99; this version reads up to v3\)/);
  });
  it('v2 -> v3 (BPMN B3): the scope keys become the process document (key BPMN) and are removed, in the case, the common values and the overrides', () => {
    const KEYS = ['selectedArtefacts', 'artefactsEdited', 'selectedRegArtefacts', 'regArtefactsEdited', 'phaseOff', 'selectedNorms', 'phaseSeq',
      'regInclude', 'skillMap'];
    for (const f of ALL) {
      const s = MIGRATIONS[1]!(sanitize(rawOf(f)) as Record<string, unknown>), out = MIGRATIONS[2]!(s);
      const parts = (out.common ? [out.common, ...((out.products as { overrides: Record<string, unknown> }[]).map((p) => p.overrides))] : [out]) as
        Record<string, unknown>[];
      for (const p of parts) for (const k of KEYS) expect(k in p, `${f}: ${k}`).toBe(false);
      expect(((out.common ?? out) as { BPMN: { kind: string } }).BPMN.kind, f).toBe('document');
    }
  });
  it('only what is not an AgentCase file is refused (not an object, no form inputs)', () => {
    expect(() => openChecked([1])).toThrow(/JSON object/);
    expect(() => openChecked({ n: 1 })).toThrow(/no AgentCase case/);
  });
});
