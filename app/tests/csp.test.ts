// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSnapshotHtml } from '@/store/persistence/html/embed';
import { REPORT_CSP, REPORT_POLICY } from '@/store/persistence/report/render';

/** The policy of the single HTML file (docs/ARCHITECTURE.md §9): nothing is loaded from the network. The browser gate is tools/e2e-smoke.mjs + e2e-flows.mjs. */
const html = readFileSync('index.html', 'utf8');
const directives = (policy: string) => Object.fromEntries(policy.split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k!, v.join(' ')]));
const policyOf = (page: string) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(page)?.[1] ?? '';

describe('Content-Security-Policy', () => {
  it('index.html declares it first in <head>, before any script, and it blocks every network load', () => {
    const at = html.indexOf('http-equiv="Content-Security-Policy"');
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(html.indexOf('<script'));
    expect(at).toBeLessThan(html.indexOf('<title'));
    expect(directives(policyOf(html))).toEqual({
      'default-src': "'none'", 'script-src': "'unsafe-inline'", 'style-src': "'unsafe-inline'", 'img-src': 'data: blob:', 'font-src': 'data:',
      'connect-src': "'none'", 'media-src': 'data: blob:', 'base-uri': "'none'", 'form-action': "'none'",
    });
    expect(policyOf(html)).not.toMatch(/https?:|\*|'unsafe-eval'/);
  });
  it('a saved HTML snapshot carries the policy of the page it copies', () => {
    const page = new DOMParser().parseFromString(html.replace('%APP_VER_TAG%', 'vX'), 'text/html').documentElement;
    expect(policyOf(buildSnapshotHtml(page, { a: 1 }))).toBe(policyOf(html));
  });
  it('the reports carry a stricter policy: no script at all, inline style and a data: logo only', () => {
    expect(REPORT_CSP).toBe(`<meta http-equiv="Content-Security-Policy" content="${REPORT_POLICY}">`);
    expect(directives(REPORT_POLICY)).toEqual({ 'default-src': "'none'", 'style-src': "'unsafe-inline'", 'img-src': 'data:', 'base-uri': "'none'", 'form-action': "'none'" });
  });
});
