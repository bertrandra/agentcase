import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIGURES, ZONES, ZONE_IDS } from '@/domain/zones';
import { tagOf } from '../../scripts/lib/zones';

/**
 * Calculation zones (docs/ARCHITECTURE.md section 12): every calculation-bearing module carries exactly one `@calc-zone`; each figure has exactly one
 * `@owner` module.
 */
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : []; });
const MUST_TAG = ['src/domain', 'src/controllers', 'src/store/persistence/excel', 'src/store/persistence/report', 'src/store/persistence/html',
  'src/store/persistence/bpmn'];
const read = (f: string): string => readFileSync(f, 'utf8');
const all = ['src/domain', 'src/controllers', 'src/store'].flatMap(walk);
const required = all.filter((f) => MUST_TAG.some((m) => f.startsWith(`${m}/`)) || /^src\/store\/(selectionHooks\w*|\w*Hooks)\.ts$/.test(f));

describe('calculation zones: tags', () => {
  it('has modules to check', () => expect(required.length).toBeGreaterThan(300));
  it('every domain module, controller, export module and zone hook has exactly one valid @calc-zone on its first line', () => {
    const bad = required.filter((f) => { const t = tagOf(read(f)); return !t || !ZONE_IDS.includes(t.zone); });
    expect(bad, 'add `/** @calc-zone <zone-id> */` as the first line (zones: src/domain/zones/catalog.json)').toEqual([]);
  });
  it('no second tag hides below the first line, and no UI or test module carries one', () => {
    const second = all.filter((f) => read(f).split('\n').slice(1).some((l) => l.startsWith('/** @calc-zone')));
    const stray = [...walk('src/ui'), ...walk('tests')].filter((f) => read(f).startsWith('/** @calc-zone'));
    expect([...second, ...stray]).toEqual([]);
  });
  it('the catalogue is well formed: unique ids, valid lanes, entry modules exist and carry their zone', () => {
    expect(new Set(ZONE_IDS).size).toBe(ZONES.length);
    for (const z of ZONES) {
      expect(['input', 'calc', 'result', 'shared'], z.id).toContain(z.lane);
      expect(z.description.length, z.id).toBeGreaterThan(20);
      for (const e of z.entry) { expect(existsSync(`src/${e}`), `${z.id}: ${e}`).toBe(true); expect(tagOf(read(`src/${e}`))?.zone,
        `${z.id}: ${e}`).toBe(z.id); }
    }
  });
  it('every @owner names a catalogue figure, each figure has exactly one owner module, in the figure zone', () => {
    const owners = new Map<string, string[]>(), ids = new Set(FIGURES.map((f) => f.id));
    for (const f of all) for (const o of tagOf(read(f))?.owners ?? []) { expect(ids.has(o),
      `${f} owns unknown figure ${o}`).toBe(true); owners.set(o, [...(owners.get(o) ?? []), f]); }
    for (const fig of FIGURES) {
      const mods = owners.get(fig.id) ?? [];
      expect(mods.length, `figure ${fig.id} must have exactly one owner module, found [${mods.join(', ')}]`).toBe(1);
      expect(tagOf(read(mods[0]!))?.zone, `${fig.id}: ${mods[0]}`).toBe(fig.zone);
      expect(existsSync(mods[0]!)).toBe(true);
    }
  });
  it('the tag format is strict (negative checks)', () => {
    expect(tagOf('/** @calc-zone time-engine */\nx')).toEqual({ zone: 'time-engine', owners: [] });
    expect(tagOf('/** @calc-zone economics-headline @owner net, roi */\nx')?.owners).toEqual(['net', 'roi']);
    expect(tagOf('// @calc-zone time-engine\nx')).toBeNull();
    expect(tagOf('import x from "y";\n/** @calc-zone time-engine */')).toBeNull();
  });
});
