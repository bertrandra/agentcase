import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criticalReport } from '@/controllers/report';
import { setDisplayScope } from '@/controllers/displayScope';
import { addProduct } from '@/controllers/product';
import { fmtRoiPct } from '@/domain/economics';
import { fmtK } from '@/domain/format';
import { consolidate, consolidationView, corePortfolio, envelopeCase, knowledgeTable, resolveProduct, waveHeadline, type SummaryRow } from '@/domain/portfolio';
import { buildCriticalReport, buildScopedReport } from '@/store/persistence/report';
import { fromSnapshot } from '@/store/persistence/snapshot';
import { fourProducts, pfNow, regulatedPortfolio } from '../helpers/portfolioFixtures';
import { loadFixture } from '../helpers/fixtures';
import { THEME_DEFAULT } from '@/domain/theme';
import { setScopeOverride } from '../helpers/scope';

const IDS = readdirSync('fixtures/reports').filter((f) => f.endsWith('.html')).map((f) => f.replace('.html', ''));
const doc = (id: string) => fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')));
const NOW = new Date('2026-10-22T12:00:00Z');
const text = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/g, ' ').replace(/<title>[\s\S]*?<\/title>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ok = (r: ReturnType<typeof buildCriticalReport>): string => { if (!r.ok) throw new Error(r.reason); return r.html; };
const money = (r: SummaryRow): string[] => [fmtK(r.npv), fmtK(r.net), fmtK(r.setup), fmtK(r.savings), fmtK(r.run), r.etp.toFixed(1), r.vfte.toFixed(1)];

describe('Product scope = today’s report, text for text', () => {
  it.each(IDS)('%s: a one-product portfolio gives exactly the legacy-parity report', (id) => {
    const legacy = ok(buildCriticalReport(doc(id), THEME_DEFAULT, NOW)), pf = envelopeCase(doc(id));
    expect(ok(buildScopedReport(pf, { kind: 'product' }, THEME_DEFAULT, NOW))).toBe(legacy);
    // a plain case ignores the portfolio scopes: there is no portfolio to report on
    expect(ok(buildScopedReport(pf, { kind: 'portfolio' }, THEME_DEFAULT, NOW))).toBe(legacy);
  });
  it('the controller follows the display scope of the store (product by default), with an explicit scope for tests', () => {
    loadFixture('industry-med');
    expect(ok(criticalReport(NOW))).toBe(ok(buildCriticalReport(doc('industry-med'), THEME_DEFAULT, NOW)));
    const pf = regulatedPortfolio(), other = pf.products[1]!;
    expect(ok(criticalReport(NOW))).toBe(ok(buildCriticalReport(resolveProduct(pf, pf.activeProductId), THEME_DEFAULT, NOW)));
    expect(ok(buildScopedReport(pf, { kind: 'product' }, THEME_DEFAULT, NOW, other.id)))
      .toBe(ok(buildCriticalReport(resolveProduct(pf, other.id), THEME_DEFAULT, NOW)));
    setDisplayScope({ kind: 'portfolio' });
    expect(ok(criticalReport(NOW))).toContain('Model — Portfolio');
    expect(ok(criticalReport(NOW, { kind: 'product' }))).not.toContain('Model — Portfolio');
  });
});

describe('Portfolio scope', () => {
  const html = (): string => ok(buildScopedReport(regulatedPortfolio(), { kind: 'portfolio' }, THEME_DEFAULT, NOW));
  it('keeps the six sections of the report family', () => {
    const h = [...html().matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1] as string));
    expect(h.map((x) => x.replace(/^\d · /, ''))).toEqual(['Portfolio and regulatory context', 'Glass Ceiling Model', 'Supervision floors & AI authorization',
      'Consolidated economics', 'Knowledge transfer', 'Gated trajectory']);
  });
  it('contains every figure of the consolidation view', () => {
    const out = html(), t = text(out), pf = corePortfolio(pfNow()), c = consolidate(pf), v = consolidationView(pf, c), h = v.headline;
    for (const s of [fmtK(h.npv), fmtK(h.totalBenefit), fmtK(h.setup), fmtK(h.net), fmtRoiPct(h.roi), `month ${h.paybackMonth}`,
      `+${Math.round(h.velocityPct)}%`, `${h.eff.toFixed(1)}%`, `${Math.round(h.ceiling)}%`]) expect(t).toContain(s);
    for (const r of [...v.waves, ...v.products]) for (const s of [r.name, ...money(r)]) expect(t).toContain(s);
    for (const y of v.years) for (const s of [y.label, fmtK(y.savings), fmtK(y.run), fmtK(y.setup), fmtK(y.net)]) expect(t).toContain(s);
    expect(v.totals.npv).toBe(h.npv);
    v.diagnostics.forEach((d) => expect(t).toContain(d.message));
  });
  it('contains the knowledge-transfer table and the wave effects', () => {
    const t = text(html()), kt = knowledgeTable(pfNow());
    for (const r of kt.rows) for (const s of [r.name, fmtK(r.setup), fmtK(r.annual), fmtK(r.ktAvoided), fmtK(r.hubDeltaSav),
      `${r.asisCC} → ${r.targetCC}`]) expect(t).toContain(s);
    for (const s of [fmtK(kt.totals.setup), fmtK(kt.totals.annual), fmtK(kt.totals.hubDeltaSav)]) expect(t).toContain(s);
    expect(t).toContain('Docs 100%');
  });
  it('lists each product with its own norms and context, and survives a product the gate refuses', () => {
    const pf = regulatedPortfolio(), t = text(ok(buildScopedReport(pf, { kind: 'portfolio' }, THEME_DEFAULT, NOW)));
    pf.products.filter((p) => p.waveId !== null).forEach((p) => expect(t).toContain(p.name));
    expect(t).toContain('Archive (no wave) has no wave');   // the unscheduled product is outside the consolidation tables and named in the diagnostics
    const none = regulatedPortfolio(); setScopeOverride(none.products[1]!.id, { selectedNorms: [] });
    expect(text(ok(buildScopedReport(pfNow(), { kind: 'portfolio' }, THEME_DEFAULT, NOW)))).toContain('catalogue off or no norm selected');
  });
  it('is a standalone page: no script, no external resource, everything escaped', () => {
    regulatedPortfolio();
    const id = addProduct('<script>alert(1)</script><img src=x onerror=alert(2)>', pfNow().waves[0]!.id)!;
    expect(id).toBeTruthy();
    const out = ok(buildScopedReport(pfNow(), { kind: 'portfolio' }, THEME_DEFAULT, NOW));
    expect(out).not.toMatch(/<(script|link|img|iframe|a)\b|\s(src|href)=["']|@import|url\(/i);
    expect(out).toContain('&lt;script&gt;');
  });
  it('is refused when no product of the scope has the catalogue and a norm (the legacy gate)', () => {
    fourProducts();
    expect(buildScopedReport(pfNow(), { kind: 'portfolio' }, THEME_DEFAULT, NOW))
      .toEqual({ ok: false, reason: 'Enable the Regulatory catalog and select at least one norm first (Parameters).' });
  });
});

describe('Wave scope', () => {
  it('reports only the products of the wave, with the wave’s own headline', () => {
    const pf = regulatedPortfolio(), w2 = pf.waves[1]!, c = consolidate(corePortfolio(pf)), h = waveHeadline(c, w2.id)!;
    const r = buildScopedReport(pf, { kind: 'wave', id: w2.id }, THEME_DEFAULT, NOW);
    const t = text(ok(r));
    expect(t).toContain('Scope: Wave: Wave 2');
    for (const s of [fmtK(h.npv), fmtK(h.setup), fmtK(h.net), fmtRoiPct(h.roi)]) expect(t).toContain(s);
    expect(t).toContain('Billing');
    expect(t).not.toContain('Payroll');
    expect(r.ok && r.filename).toBe('AgentCase_Critical_Regulated_Report_Wave_Wave_2_20261022.html');
    h.years.savings.forEach((s) => expect(t).toContain(fmtK(s)));
  });
  it('an unknown wave is refused with a message', () => {
    const pf = regulatedPortfolio();
    expect(buildScopedReport(pf, { kind: 'wave', id: 'nope' }, THEME_DEFAULT, NOW)).toEqual({ ok: false, reason: 'That wave does not exist any more.' });
  });
  it('an empty wave has no planned product to report', () => {
    const pf = regulatedPortfolio(), empty = pf.waves[1]!;
    setScopeOverride(pf.products[2]!.id, { selectedNorms: [] });
    expect(buildScopedReport(pfNow(), { kind: 'wave', id: empty.id }, THEME_DEFAULT, NOW))
      .toEqual({ ok: false, reason: 'Enable the Regulatory catalog and select at least one norm first (Parameters).' });
  });
});
