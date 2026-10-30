// @vitest-environment jsdom
/**
 * BPMN B2: a 2,000-activity AgentCase file (spec § 10 performance size, about 25,300 elements) is read with the DEFAULT F-B10 limits
 * (100,000 elements) and written back byte for byte; its typed read has the 2,000 activities.
 */
import { describe, expect, it } from 'vitest';
import { buildProcess, indent, LIMITS, readProcess, serialize, TODAYS_CATALOGUE, type CatArtefact, type ProcessCatalogue } from '@/domain/process';
import { parsed } from '../helpers/bpmnRoundTrip';

/** Today's catalogue with copies of its SDLC artefacts (new ids) up to `n` activities. */
function catalogueOf(n: number): ProcessCatalogue {
  const c = TODAYS_CATALOGUE, extra: CatArtefact[] = [];
  for (let i = 0; c.sdlc.length + c.reg.length + extra.length < n; i++) {
    const a = c.sdlc[i % c.sdlc.length] as CatArtefact;
    extra.push({ ...a, id: `X${i}`, name: `${a.name} ${i}` });
  }
  return { ...c, sdlc: [...c.sdlc, ...extra] };
}

describe('B2 round trip of a 2,000-activity file with the default limits', () => {
  it('more than 20,000 elements, under 5 MB and 100,000 elements: parse → write byte-identical, 2,000 activities read', () => {
    const d = buildProcess(catalogueOf(2000)), text = serialize({ ...d, root: indent(d.root) });
    const elements = (text.match(/<[A-Za-z]/g) ?? []).length;
    expect(elements).toBeGreaterThan(20000);
    expect(elements).toBeLessThan(LIMITS.elements);
    expect(text.length).toBeLessThan(LIMITS.bytes);
    const back = parsed(text);
    expect(serialize(back) === text).toBe(true);
    expect(readProcess(back).activities).toHaveLength(2000);
  }, 60000);
});
