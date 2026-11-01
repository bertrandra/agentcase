// @vitest-environment jsdom
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { THEME_DEFAULT } from '@/domain/theme';
import { reportData } from '@/store/persistence/report/data';
import { renderReport } from '@/store/persistence/report/render';
import { adding, custom, opened, withDoc } from '../helpers/processCases';

/**
 * SPEC_FIXES FX-58: the legacy `tools/xss-test.mjs` fuzz, ported as a property test. The application renders through React (no innerHTML
 * anywhere in src/), so the remaining string-built HTML is the reports: whatever a user types into a name (here an activity's, which the report lists
 * when its AI authority is above the cap, and the customer's), the report holds it as text — no element, no event handler, no script URL appears.
 */
const PAYLOADS = ['<script>window.__xss=1</script>', '"><img src=x onerror=alert(1)>', "'><svg onload=alert(1)>", '<a href="javascript:alert(1)">x</a>',
  '</td></tr><iframe srcdoc="<script>alert(1)</script>">', '&lt;script&gt;', '${alert(1)}', '<style>*{display:none}</style>'];
const hostile = fc.oneof(fc.constantFrom(...PAYLOADS), fc.tuple(fc.string({ maxLength: 12 }), fc.constantFrom(...PAYLOADS)).map(([a, b]) => a + b));

const base = opened('industry-med');
const html = (name: string): string => {
  const s = withDoc(base, adding(base.BPMN, custom('C977', { name, aiAuth: 'Autonomous' })));
  return renderReport(reportData({ ...s, dom: { ...s.dom, values: { ...s.dom.values, customerName: name } } } as typeof s, new Date(0)), THEME_DEFAULT);
};
const shape = (h: string): { scripts: number; handlers: number; jsUrls: number; text: string } => {
  const d = new DOMParser().parseFromString(h, 'text/html'), all = [...d.querySelectorAll('*')];
  return { scripts: d.querySelectorAll('script, iframe, object, embed').length,
    handlers: all.filter((e) => [...e.attributes].some((a) => /^on/i.test(a.name))).length,
    jsUrls: all.filter((e) => [...e.attributes].some((a) => /^\s*javascript:/i.test(a.value))).length, text: d.body.textContent ?? '' };
};

describe('report HTML and hostile names (FX-58)', () => {
  it('no element, handler or script URL comes from a name; the name is kept as text', () => {
    const clean = shape(html('Plain activity'));
    fc.assert(fc.property(hostile, (name) => {
      const s = shape(html(name));
      expect([s.scripts, s.handlers, s.jsUrls]).toEqual([clean.scripts, clean.handlers, clean.jsUrls]);
      expect(s.text).toContain(name.trim().slice(0, 20));
    }), { numRuns: 25, seed: 58 });
  }, 120_000);
});
