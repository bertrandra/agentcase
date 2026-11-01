import { withoutStoredValues } from '@/domain/process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { LOOP_PAIRS, PHASES, REG_ARTEFACTS, REG_NORMS, SDLC_ARTEFACTS } from '@/domain/catalog';
import { buildProcess, catalogueProcess, CROSS_PHASE, normalKeys, readProcess, scopeKeysOf, scopeOf, serialize, TODAYS_CATALOGUE,
  viewsOf } from '@/domain/process';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import { CROSS_CUTTING } from '@/domain/scopeView';
import { makeDefaultDoc } from '@/store/instance';
import { DEFAULT_PROCESS_FILE, defaultProcessText } from '../../../scripts/lib/defaultProcess';

/** docs/SPEC_BPMN.md § 6.3: the checked-in default process is the generator's output, byte for byte; its views are today's catalogues. */
const file = readFileSync(DEFAULT_PROCESS_FILE, 'utf8');

describe('default process (catalog/defaultProcess.bpmn)', () => {
  it('is up to date: regenerating it gives the same bytes (else: npm run process:gen)', () => expect(defaultProcessText()).toBe(file));
  it('is the process of the default case (a new case holds it; v4 adds the stored values), deterministic', () => {
    expect(serialize(withoutStoredValues(makeDefaultDoc().BPMN))).toBe(file);
    expect(serialize(buildProcess(TODAYS_CATALOGUE))).toBe(serialize(buildProcess(TODAYS_CATALOGUE)));
  });
  it('gives back the default case keys (the legacy default, normalised: document order, complete edit lists)', () => {
    const legacy = defaultDoc as unknown as Record<string, unknown>, k = scopeOf(makeDefaultDoc());
    expect(k).toStrictEqual(normalKeys(readProcess(catalogueProcess()), scopeKeysOf(legacy)));
    expect([...k.selectedArtefacts].sort()).toEqual([...(legacy.selectedArtefacts as string[])].sort());
    expect([...k.phaseOff].sort()).toEqual([...(legacy.phaseOff as string[])].sort());
    expect(k.artefactsEdited).toEqual(legacy.artefactsEdited);
  });
  it('its catalogue views are exactly the JSON catalogues the engine reads today', () => {
    const v = viewsOf(catalogueProcess());
    expect(v.sdlc).toStrictEqual(SDLC_ARTEFACTS);
    expect(v.reg).toStrictEqual(REG_ARTEFACTS);
    expect(v.phases).toStrictEqual(PHASES);
    expect(v.norms).toStrictEqual(REG_NORMS);
    expect(v.loopPairs).toStrictEqual(LOOP_PAIRS);
    expect(v.crossCutting).toStrictEqual(CROSS_CUTTING);
    expect(CROSS_PHASE).toStrictEqual(CROSS_CUTTING);
  });
  it('holds every catalogue item once: 11 phases + Cross-cutting, 53 + 370 activities, 47 norms, 3 rework flows, unique ids', () => {
    const v = readProcess(catalogueProcess());
    expect(v.phases.map((p) => p.id)).toEqual([...PHASES.map((p) => p.id), 'Cross-cutting']);
    expect(v.activities).toHaveLength(SDLC_ARTEFACTS.length + REG_ARTEFACTS.length);
    expect(v.norms).toHaveLength(47);
    expect(v.flows.filter((f) => f.rework).map((f) => f.id)).toEqual(['LP001', 'LP003', 'LP002']);
    const ids = [...file.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[A-Za-z_][\w.-]*$/.test(id ?? ''))).toBe(true);
  });
  it('types tasks by activity type (Human → userTask, Manual → manualTask, Agent → serviceTask, with an agent performer)', () => {
    const v = readProcess(catalogueProcess()), all = [...SDLC_ARTEFACTS, ...REG_ARTEFACTS] as { id: string; agentActivityType?: string }[];
    const type = new Map(all.map((a) => [a.id, a.agentActivityType]));
    for (const a of v.activities) {
      expect(a.type, a.id).toBe(type.get(a.id));
      expect(a.element, a.id).toBe({ Human: 'userTask', Manual: 'manualTask', Agent: 'serviceTask' }[a.type]);
      expect(a.performer?.startsWith('agent-') ?? false, a.id).toBe(a.type === 'Agent');
      expect(a.humanPerformer, a.id).toBeDefined();
    }
  });
  it('size: reported raw and gzipped; imported once, by the catalogue (SPEC_FIXES FX-02: the one source of the catalogue lists)', () => {
    const raw = Buffer.byteLength(file), gz = gzipSync(file, { level: 9 }).length;
    expect(raw).toBeLessThan(600 * 1024);
    expect(gz).toBeLessThan(60 * 1024);
    const code = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => /\.tsx?$/.test(f)).map((f) => join('src', f));
    const importers = code.filter((f) => /(from|import\()\s*['"][^'"]*defaultProcess\.bpmn/.test(readFileSync(f, 'utf8')));
    expect(importers).toEqual([join('src', 'domain/catalog/index.ts')]);
  });
});
