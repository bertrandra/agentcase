import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criticalReport } from '@/controllers/report';
import { createAppStore } from '@/store/core';
import { makeDefaultDoc, setAppStore } from '@/store/instance';
import { buildCriticalReport, esc } from '@/store/persistence/report';
import { REG_ARTEFACTS } from '@/domain';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { loadFixture } from '../helpers/fixtures';
import { missingNumbers } from '../helpers/parity';
import { legacyMoney } from '../helpers/deviations';

const IDS = readdirSync('fixtures/reports').filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', ''));
const doc = (id: string) => fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')));

/** Visible text of a report page: styles and tags removed, entities decoded, whitespace collapsed. */
const text = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<title>[\s\S]*?<\/title>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const headings = (html: string) => [...html.matchAll(/<h[12]>([\s\S]*?)<\/h[12]>/g)].map((m) => text(m[1] as string));
const stampOf = (id: string) => { const n = readFileSync(`fixtures/reports/${id}.name.txt`, 'utf8').match(/(\d{4})(\d{2})(\d{2})\.html$/)!; return new Date(`${n[1]}-${n[2]}-${n[3]}T12:00:00Z`); };
/** The only wording that differs on purpose: the build tag, and the legacy's hard-coded catalogue size (stale: the catalogue has 370 artifacts, not 349). */
const unversion = (t: string) => legacyMoney(t).replace(/v18\.1[123]|v20\.0(?:\.0(?:-dev)?)?/g, 'vX').replace('349-artifact', `${REG_ARTEFACTS.length}-artifact`);

describe('Critical & Regulated Software Delivery report vs the legacy output', () => {
  it('has at least 8 recorded legacy reports, including the edge cases', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(8);
    expect(IDS).toEqual(expect.arrayContaining(['industry-med', 'combo-stress', 'frame-industry-cross']));   // MSI context + 5-year horizon + regulatory artifacts excluded
  });
  it.each(IDS)('%s: same sections, same figures, same wording', (id) => {
    const legacy = readFileSync(`fixtures/reports/${id}.html`, 'utf8');
    const r = buildCriticalReport(doc(id), stampOf(id));
    if (!r.ok) throw new Error(r.reason);
    expect(r.filename).toBe(readFileSync(`fixtures/reports/${id}.name.txt`, 'utf8'));
    expect(headings(r.html)).toEqual(headings(legacy));
    expect(missingNumbers(unversion(text(legacy)), text(r.html))).toEqual([]);   // every legacy figure is in ours …
    expect(missingNumbers(text(r.html), unversion(text(legacy)))).toEqual([]);   // … and ours adds none
    expect(unversion(text(r.html))).toBe(unversion(text(legacy)));    // the whole visible text, not just the numbers
  });
  it('is a standalone page: no script, no external resource', () => {
    const r = buildCriticalReport(doc('industry-aero'), new Date(0));
    if (!r.ok) throw new Error(r.reason);
    expect(r.html).not.toMatch(/<script|<link|<img|<iframe|src=|href=|@import|url\(/i);
  });
  it('refuses a case without the regulatory catalog or without a norm (the legacy gate)', () => {
    const d = makeDefaultDoc();
    expect(buildCriticalReport(d)).toEqual({ ok: false, reason: 'Enable the Regulatory catalog and select at least one norm first (Parameters).' });
    expect(buildCriticalReport({ ...doc('industry-med'), selectedNorms: [] }).ok).toBe(false);
    expect(buildCriticalReport({ ...doc('industry-med'), regUse: false } as ReturnType<typeof doc>).ok).toBe(false);
  });
  it('the controller reads the current case', () => {
    loadFixture('industry-med');
    expect(criticalReport(new Date(0)).ok).toBe(true);
    setAppStore(createAppStore(makeDefaultDoc()));
    expect(criticalReport().ok).toBe(false);
  });
});

describe('report: escaping', () => {
  it('escapes everything that comes from the case', () => {
    const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const d = { ...doc('industry-med'), selectedNorms: [evil, '"quoted" & \'single\''] };
    const r = buildCriticalReport(d, new Date(0));
    if (!r.ok) throw new Error(r.reason);
    expect(r.html).not.toContain('<script');
    expect(r.html).not.toContain('<img');
    expect(r.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(r.html).toContain('&quot;quoted&quot; &amp; &#39;single&#39;');
  });
  it('escapes the unknown engagement context key it is given', () => {
    expect(esc('<b onmouseover="x">&</b>')).toBe('&lt;b onmouseover=&quot;x&quot;&gt;&amp;&lt;/b&gt;');
  });
});

describe('legacy report text for the stale wording', () => {
  it('records which legacy wording is hard-coded', () => {
    const legacy = readFileSync('fixtures/reports/industry-med.html', 'utf8');
    expect(legacy).toContain('349-artifact certification catalogue');   // a literal in exportCriticalReport; ours counts the catalogue
    expect(REG_ARTEFACTS.length).toBe(370);
    expect(existsSync('fixtures/reports/industry-med.name.txt')).toBe(true);
  });
});
