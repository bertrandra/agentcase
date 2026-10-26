/** @calc-zone exports */
import { fmtK } from '@/domain/format';
import { esc, GLASS_FORMULA, logoHtml, REPORT_CSP, reportStyle } from '../render';
import type { PortfolioReportData } from './data';
import { renderStress } from './stress';
import { glassTable, headlineText, lines, payback, regTable, supervisionTable, yearsTable } from './tables';
import { tokIn, type ThemeValues } from '@/domain/theme';

const row = (cells: string[]): string => `<tr>${cells.map((x, i) => `<td${i > 1 ? ' style="text-align:right"' : ''}>${x}</td>`).join('')}</tr>`;

function ktTable(d: PortfolioReportData): string {
  const k = d.kt, body = k.rows.map((r) =>
    row([esc(r.name), r.usesHub ? 'yes' : r.locked ? 'locked by context' : 'no', `${r.asisCC} → ${r.targetCC}${r.capped ? ' (capped)' : ''}`,
    esc(r.domains.map((x) => `${x.label} ${x.weightPct}%`).join('; ') || '—'), r.prepMonth === null ? 'not scheduled' : `month ${r.prepMonth}`, fmtK(r.setup),
    fmtK(r.annual), r.ktDays.toFixed(0), fmtK(r.ktAvoided), fmtK(r.hubDeltaSav)])).join('');
  const tot = k.totals;
  return '<table><tr><th>Product</th><th>Hub</th><th>CC initial → target</th><th>Domains</th><th>Preparation</th><th>KT setup</th><th>Annual ' +
    'cost</th><th>KT days / year</th><th>KT avoided</th><th>Hub effect</th></tr>'
    + `${body}${row(['<strong>Total</strong>', '', '', '', '', fmtK(tot.setup), fmtK(tot.annual), tot.ktDays.toFixed(0), fmtK(tot.ktAvoided),
      fmtK(tot.hubDeltaSav)])}</table>`;
}

function effectsTable(d: PortfolioReportData): string {
  return '<table><tr><th>Wave</th><th>Products</th><th>Hub users</th><th>KT setup</th><th>Annual cost</th><th>Hub effect (vs no hub)</th></tr>'
    + `${d.kt.effects.map((w) => row([esc(w.name), String(w.products), String(w.users), fmtK(w.setup), fmtK(w.annual), fmtK(w.hubDeltaSav)]))
      .join('')}</table>`;
}

/** The standalone portfolio report: the six sections of the critical-delivery report, for a portfolio or a wave. No script, no external resource. */
export function renderPortfolioReport(d: PortfolioReportData, print: Readonly<ThemeValues>): string {
  const note = tokIn(print, 'report-note');
  const norms = [...new Set(d.reg.flatMap((r) => r.data?.norms ?? []))].sort(), what = d.kind === 'wave' ? `Wave: ${d.label}` : d.label;
  const notes = d.diagnostics.length ? `<h3>Diagnostics</h3><ul>${d.diagnostics.map((i) => `<li>${esc(i.message)}</li>`).join('')}</ul>` : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + REPORT_CSP
    + `<title>Critical &amp; Regulated Software Delivery — ${esc(what)} — AgentCase ${esc(d.version)}</title><style>${reportStyle(print)}</style></head><body>`
    + logoHtml(d.logo) + '<h1>Critical &amp; Regulated Software Delivery Model — Portfolio</h1>'
    + `<p><span class="tag">AgentCase ${esc(d.version)}</span> <span class="tag">${esc(d.stamp)}</span> <span class="tag">Scope: ${esc(what)}</span> <span ` +
      `class="tag">${d.productRows.length} planned product(s)</span></p>`
    + `<h2>1 · Portfolio and regulatory context</h2><p>${esc(what)}: ${d.productRows.length} planned product(s)${d.kind === 'portfolio' ? ` in ${d.waves} ` +
      `wave(s)` : ''}, calendar horizon ${d.horizon} months from ${esc(d.start)}.`
    + ` Active norms: <strong>${norms.map(esc).join(', ') || '—'}</strong>.</p>${regTable(d)}`
    + `<h2>2 · Glass Ceiling Model</h2><p>${GLASS_FORMULA}, per product; weighted by entry headcount for ${esc(what)}: `
    + `<strong>${d.headline.eff.toFixed(1)}% effective</strong> under a ${Math.round(d.headline.ceiling)}% ceiling.</p>${glassTable(d)}`
    + `<h2>3 · Supervision floors &amp; AI authorization</h2><p>Each product follows the posture and the agent-authority cap of its own engagement ` +
      `context.</p>${supervisionTable(d)}`
    + `<h2>4 · Consolidated ` +
      `economics</h2><p>${headlineText(d)}</p>${lines('Wave', d.waveRows, d.horizon)}${lines('Product', d.productRows, d.horizon)}${yearsTable(d.years)}`
    + `<p style="font-size:11px;color:${note}">NPV is discounted month by month from the portfolio's first month, so the products add up to the total; ` +
      `payback is the first calendar month the consolidated cash is ≥ 0 (${payback(d.headline.paybackMonth, d.horizon)}).</p>`
    + `<h2>5 · Knowledge transfer</h2><p>Knowledge Hub ${d.hub.enabled ? 'on' : 'off'} · infrastructure ${fmtK(d.hub.infraMonthly)}/month ` +
      `charged ${d.hub.infraAllocation === 'byBaseEtp' ? 'in proportion to entry headcount' : 'in full to each product'}.</p>${ktTable(d)}${effectsTable(d)}`
    + '<h2>6 · Gated trajectory</h2><p>Each product follows Discover → Calibrate → Validate (assumptions signed, Monte Carlo P50 above threshold)'
    + ' → Pilot &amp; Prove (KPIs ≥ 80% of Y1 targets) → Decide &amp; Scale (Decision Intelligence verdict, risk bar raised by the premium of its context,'
    + ' section 1); products start with their wave, shifted by their own offset.</p>'
    + `${renderStress(d.stress, what)}${notes}<p style="font-size:11px;color:${note};margin-top:2rem">Generated by AgentCase ${esc(d.version)} — values ` +
      `reflect the loaded portfolio; estimates to validate with client teams.</p></body></html>`;
}
