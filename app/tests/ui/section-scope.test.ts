import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECTIONS } from '@/ui/zones/registry';
import { SECTION_AGGREGATES } from '@/ui/sections/aggregates';
import { SECTION_COMPONENTS } from '@/ui/sections';
import { SECTION_KINDS, SECTION_KIND_IDS, followsView, sectionKind } from '@/ui/zones/sectionScope';

describe('sectionScope.json: the kind of every section (aggregate view)', () => {
  it('covers exactly the 89 catalogue ids, each with a known kind, and nothing else', () => {
    const ids = SECTIONS.map((s) => s.id).sort();
    expect(ids).toHaveLength(89);
    expect([...SECTION_KIND_IDS].sort()).toEqual(ids);
    for (const id of ids) expect(SECTION_KINDS, id).toContain(sectionKind(id));
  });
  it('the Portfolio group is P-portfolio and only it', () => {
    for (const s of SECTIONS) expect(sectionKind(s.id) === 'P-portfolio', s.id).toBe(s.group === 'portfolio');
  });
  it('the counts documented in docs/VUE_AGREGEE.md', () => {
    const count = (k: string) => SECTIONS.filter((s) => sectionKind(s.id) === k).length;
    const doc = readFileSync('../docs/VUE_AGREGEE.md', 'utf8');
    for (const k of SECTION_KINDS) expect(doc, k).toContain(`| \`${k}\` | ${count(k)} |`);
  });
  it('an id outside the catalogue (dynamic section) is independent of the View', () => {
    expect(sectionKind('dyn-123')).toBe('S-static');
    expect(followsView('S-static')).toBe(false);
    expect(followsView('P-portfolio')).toBe(false);
    for (const k of ['R-conso', 'R-rollup', 'I-input'] as const) expect(followsView(k)).toBe(true);
  });
  it('an aggregate is registered only for a section that follows the View and has a component', () => {
    for (const id of Object.keys(SECTION_AGGREGATES)) {
      expect(followsView(sectionKind(id)), id).toBe(true);
      expect(SECTION_COMPONENTS[id], id).toBeTypeOf('function');
    }
    expect(Object.keys(SECTION_AGGREGATES)).toEqual(expect.arrayContaining(['financial', 'team-in']));
  });
});
