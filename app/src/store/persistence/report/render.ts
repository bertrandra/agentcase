/** @calc-zone exports */
import { fmtK } from '@/domain/format';
import { tokIn, type ThemeValues, type TokenName } from '@/domain/theme';
import type { ReportData } from './data';

/** Escape a value for HTML text and attributes. Every string that comes from the case goes through this. */
export const esc = (v: unknown): string => String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
/** A table row; cells from index `centerFrom` on are centred. */
const row = (cells: string[], centerFrom = 99): string => `<tr>${cells.map((x, i) => `<td${i >= centerFrom ? ' style="text-align:center"' : ''}>${x}</td>`).join('')}</tr>`;

/** Printable by itself: no script, no external resource. Colours and fonts are the report tokens of `print`, the base theme of the export (always light). */
export const reportStyle = (print: Readonly<ThemeValues>): string => {
  const printTok = (n: TokenName): string => tokIn(print, n);
  return `body{font-family:${printTok('report-font-body')};color:${printTok('report-ink')};max-width:900px;margin:2rem auto;padding:0 1.5rem;line-height:1.55}`
  + `h1,h2,h3{font-family:${printTok('report-font-heading')};font-weight:300;color:${printTok('report-heading')}}h1{border-bottom:3px solid ${printTok('report-rule')};padding-bottom:.4rem}`
  + `table{border-collapse:collapse;width:100%;font-size:13px;margin:.6rem 0}th,td{border:1px solid ${printTok('report-line')};padding:5px 8px;text-align:left}th{background:${printTok('report-head-bg')};color:${printTok('report-head-text')}}`
  + `.tag{display:inline-block;background:${printTok('report-tag-bg')};color:${printTok('report-tag-text')};border-radius:10px;padding:1px 10px;font-size:11px;font-weight:700}@media print{body{margin:0}}`;
};

/** The customer logo above the title (a validated PNG / JPEG data URL; nothing when the case has none). */
export const logoHtml = (l?: { src: string; alt: string }): string => (l ? `<p><img src="${esc(l.src)}" alt="${esc(l.alt)}" style="height:48px;max-width:240px;object-fit:contain"></p>` : '');

/** The report is scriptless and loads nothing: its policy allows only its inline style and a data: logo (defence in depth, docs/ARCHITECTURE.md §9). */
export const REPORT_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
// built by a function so the bundled code holds no literal CSP meta (the single-file build would read it as a policy of the app page)
const cspMeta = (policy: string): string => `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
export const REPORT_CSP = cspMeta(REPORT_POLICY);

/** The Glass Ceiling formula, as both reports print it. */
export const GLASS_FORMULA = '<code>Effective Automation = Potential × (1 − Ceiling) × Posture × Context factor × Hub multiplier</code>';

/** The standalone report page (six sections, same figures and wording as the legacy report), in the print theme `print`. */
export function renderReport(d: ReportData, print: Readonly<ThemeValues>): string {
  const note = tokIn(print, 'report-note');
  const k = esc(d.context), cap = d.authorityCap, n = d.blocked.length;
  const sup = d.supervision.map((r) => row([esc(r.phase), `${Math.round(r.floor)}%`, esc(r.posture)], 1)).join('');
  const blocked = n
    ? `<table><tr><th>Artifact</th><th>Phase</th><th>Requires</th></tr>${d.blocked.slice(0, 40).map((a) => row([esc(a.name), esc(a.phase), esc(a.aiAuth)])).join('')}</table>`
      + (n > 40 ? `<p style="font-size:11px;color:${note}">First 40 of ${n} artifacts shown.</p>` : '')
    : '';
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + REPORT_CSP
    + `<title>Critical &amp; Regulated Software Delivery — AgentCase ${esc(d.version)}</title><style>${reportStyle(print)}</style></head><body>`
    + logoHtml(d.logo) + '<h1>Critical &amp; Regulated Software Delivery Model</h1>'
    + `<p><span class="tag">AgentCase ${esc(d.version)}</span> <span class="tag">${esc(d.stamp)}</span> <span class="tag">Context: ${k}</span></p>`
    + `<h2>1 · Regulatory context</h2><p>Active norms: <strong>${d.norms.map(esc).join(', ')}</strong> — ${d.artefactsInScope} regulatory artifacts in scope out of the ${d.catalogueSize}-artifact certification catalogue.</p>`
    + `<h2>2 · Glass Ceiling Model</h2><p>${GLASS_FORMULA}: potential ${Math.round(d.potential)}% × ceiling ${Math.round(d.ceiling)}%`
    + ` → <strong>${d.effective.toFixed(1)}% effective</strong>, never above the compliance headroom (${Math.round(d.headroom)} pts).</p>`
    + `<h2>3 · Supervision floors &amp; postures</h2><table><tr><th>Phase</th><th>Floor</th><th>Posture</th></tr>${sup}</table>`
    + `<h2>4 · AI authorization under the ${k} context</h2><p>Agent authority is capped at <strong>A${cap}</strong>. ${n ? `${n} in-scope artifact(s) require a higher level and remain fully human-led:` : 'No in-scope artifact exceeds the cap.'}</p>${blocked}`
    + `<h2>5 · Economic impact of compliance</h2><p>Setup ${fmtK(d.setup)} (billable share ${Math.round(d.billablePct)}% under ${k}) · Run ${d.endLabel} ${fmtK(d.endRun)} · Saving ${d.endLabel} ${fmtK(d.endSaving)} vs baseline ${fmtK(d.baselineRun)}/yr.</p>`
    + `<h2>6 · Gated trajectory</h2><p>Discover → Calibrate → Validate (assumptions signed, Monte Carlo P50 above threshold) → Pilot &amp; Prove (KPIs ≥ 80% of Y1 targets) → Decide &amp; Scale (Decision Intelligence verdict, risk bar raised by +${d.riskPremium} pts under ${k}).</p>`
    + `<p style="font-size:11px;color:${note};margin-top:2rem">Generated by AgentCase ${esc(d.version)} — values reflect the loaded case; estimates to validate with client teams.</p></body></html>`;
}
