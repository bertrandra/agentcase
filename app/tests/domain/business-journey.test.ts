import { describe, expect, it } from 'vitest';
import deps from '@/generated/dependencies.json';
import catalog from '@/domain/zones/catalog.json';
import { BUILTIN_PERSONAS, BUILTIN_STRUCTURES, unplaced, type MenuStructure } from '@/domain/nav/structures';
import { flatten } from '@/domain/nav/sequence';
import type { Persona } from '@/domain/pdc/personas';
import defaultDoc from '@/store/defaults/defaultDoc.json';
import groupsJson from '@/ui/zones/data/groups.json';
import sectionGroups from '@/ui/zones/data/sectionGroups.json';
import { DEFAULT_PERSONA_SECTIONS, LEGACY_SECTIONS, SECTIONS } from '@/ui/zones/registry';
import { isPortfolioSection } from '@/ui/zones/portfolioNav';

/** The "nothing is missed" guarantee of the Business journey menu structure (DEV-MENU-STRUCTURES), checked against the generated dependency graph. */
const BJ = BUILTIN_STRUCTURES.find((s) => s.id === 'business-journey')!, PERSONA = BUILTIN_PERSONAS.find((p) => p.id === 'business-journey')!;
const IDS = SECTIONS.map((s) => s.id), stops = flatten(PERSONA.seq!), core = new Set(stops.map((s) => s.sec));
const STANDARD: MenuStructure = { id: 'standard', label: 'Standard', groups: groupsJson, colors: {},
  placement: Object.fromEntries(sectionGroups.map((r) => [r.id, { group: r.group, groupSeq: r.groupSeq }])) };
const graphSections = deps.sections.map((s) => s.id);
const range = (spec: string): number[] =>
  spec.split(',').filter(Boolean).flatMap(
  (p) => { const [a, b] = p.split('-').map(Number); return b == null ? [a!] : Array.from({ length: b - a! + 1 }, (_, i) => a! + i); });

describe('menu structures: coverage', () => {
  it.each([STANDARD, ...BUILTIN_STRUCTURES])('$id places every one of the $placement.length sections in exactly one of its own groups', (st) => {
    expect(IDS).toHaveLength(88);
    expect(unplaced(st, IDS)).toEqual([]);
    expect(Object.keys(st.placement).filter((id) => !IDS.includes(id))).toEqual([]);   // and nothing that is not a section
    expect(new Set(st.groups.map((g) => g.id)).size).toBe(st.groups.length);
  });
  it('the dependency graph knows the same 88 sections', () => expect([...graphSections].sort()).toEqual([...IDS].sort()));
  it('every input zone that a section writes has at least one writer in the guided sequence', () => {
    const inputs = catalog.zones.filter((z) => z.lane === 'input').map((z) => z.id), gaps: string[] = [];
    for (const z of inputs) {
      const writers = deps.edges.filter(([, to, k]) => k === 'w' && to === z).map(([from]) => String(from));
      if (writers.length && !writers.some((w) => core.has(w))) gaps.push(`${z} (writers: ${writers.join(', ')})`);
    }
    expect(gaps).toEqual([]);
  });
  it('every figure of the catalogue is displayed by a section of stage 5 (Read the result) or 6 (Defend & present)', () => {
    const late = new Set(IDS.filter((id) => ['result', 'defend-present'].includes(BJ.placement[id]!.group))), gaps: string[] = [];
    for (const f of deps.figures) if (!range(f.consumers).map((i) => graphSections[i]!).some((id) => late.has(id))) gaps.push(f.id);
    expect(catalog.figures.length).toBe(deps.figures.length);
    expect(gaps).toEqual([]);
  });
  it('the walk is short: at most 35 stops (28 with one product), every stop in the group of its step, Welcome and Reference not walked', () => {
    expect(stops.length).toBeLessThanOrEqual(35);
    expect(stops.filter((s) => !isPortfolioSection(s.sec))).toHaveLength(28);
    const byLabel = new Map(BJ.groups.map((g) => [g.label, g.id]));
    for (const s of stops) expect(BJ.placement[s.sec]!.group, s.sec).toBe(byLabel.get(s.step));
    expect(new Set(stops.map((s) => s.sec)).size).toBe(stops.length);
    expect(stops.some((s) => s.sec === 'home' || BJ.placement[s.sec]!.group === 'reference')).toBe(false);
  });
  it('each stage group puts its core sections first, the "go deeper" ones after; group descriptions are the business question', () => {
    for (const g of BJ.groups) {
      const inGroup = IDS.filter((id) => BJ.placement[id]!.group === g.id && id !== 'home')
        .sort((a, b) => BJ.placement[a]!.groupSeq - BJ.placement[b]!.groupSeq);
      const n = inGroup.filter((id) => core.has(id)).length;
      expect(inGroup.slice(0, n).every((id) => core.has(id)), g.id).toBe(true);
      expect(g.description, g.id).toMatch(/^[A-Z][^?]{5,80}\?/);
    }
  });
});

describe('the Business journey persona', () => {
  const docPersonas = defaultDoc.PERSONAS as Persona[], lists = defaultDoc.PERSONA_SECTIONS as Record<string, string[]>;
  it(
    'ships in the default case exactly as the built-in definition, seeing every section (the Portfolio ones join from two products on), compact nav, not ' +
      'the default persona', () => {
    expect(docPersonas.find((p) => p.id === 'business-journey')).toEqual(PERSONA);
    expect(PERSONA).toMatchObject({ label: 'Business journey', protected: false, compactNav: true, menuStructure: 'business-journey' });
    expect(PERSONA.default).toBeUndefined();
    expect(docPersonas.filter((p) => p.default).map((p) => p.id)).toEqual(['builder']);
    expect([...lists['business-journey']!].sort()).toEqual(LEGACY_SECTIONS.map((x) => x.id).sort());
    expect(DEFAULT_PERSONA_SECTIONS['business-journey']).toEqual(lists['business-journey']);
  });
  it('the other shipped personas keep the standard structure (no field)', () => {
    expect(docPersonas.filter((p) => p.id !== 'business-journey').every((p) => !('menuStructure' in p))).toBe(true);
    expect('MENU_STRUCTURES' in defaultDoc).toBe(false);
  });
});
