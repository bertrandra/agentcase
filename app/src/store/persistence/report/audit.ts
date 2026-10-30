/** @calc-zone exports */
import { auditReport, BLOCK_LABELS, type AuditReport } from '@/domain/audit';
import { auditEvidence, evidenceRows, EVIDENCE_LEDGER_HEADERS, type AuditDriverEvidence } from '@/domain/model/auditEvidence';
import { evalDay } from '@/domain/model/evidenceTiers';
import type { XDocument } from '@/domain/process';
import type { ThemeValues } from '@/domain/theme';
import { esc, REPORT_CSP, reportStyle } from './render';

/**
 * The audit report (docs/SPEC_BPMN.md F-B34): a standalone, scriptless HTML page to print or save as PDF, in the report theme. Header, coverage
 * and progress per phase, tooling map, observed versus modelled, top pain points, the calibration log and the audited evidence of the ledger, all
 * from `auditReport` and `auditEvidence` (domain).
 * Marked "Contains audit data" (F-B35) in its title, its first line and its file name.
 */
const heads = (xs: string[]): string => `<tr>${xs.map((x) => `<th>${esc(x)}</th>`).join('')}</tr>`;
const cells = (xs: unknown[]): string => `<tr>${xs.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`;
const table = (h: string[], rows: unknown[][], empty: string): string =>
  (rows.length ? `<table>${heads(h)}${rows.map(cells).join('')}</table>` : `<p>${esc(empty)}</p>`);
const pct = (x: number): string => `${Math.round(x * 1000) / 10} %`;
const opt = (x: number | null | undefined, unit = ''): string => (x === null || x === undefined ? '—' : `${Math.round(x * 100) / 100}${unit}`);

function body(r: AuditReport, customer: string, stamp: string, evidence: readonly AuditDriverEvidence[]): string {
  const h = r.header, c = r.coverage;
  return `<p class="tag">Contains audit data</p><h1>Audit report — ${esc(customer || 'case')}</h1>`
    + `<p>${h ? `${esc(h.code)} · ${esc(h.status)} · as of ${esc(h.asOf)}${h.client ? ` · ${esc(h.client)}` : ''}${h.scope ? ` · ${esc(h.scope)}` : ''}`
      : 'No audit header yet.'} · printed ${esc(stamp)} · tool catalogue as of ${esc(r.catalogAsOf)}`
    + `${r.catalogUpdated ? ' (catalogue updated since this audit)' : ''}</p>`
    + (h?.auditors.length ? `<p>Auditors: ${h.auditors.map((a) => esc(a.organisation ? `${a.name} (${a.organisation})` : a.name)).join(', ')}</p>` : '')
    + (h?.interviews.length ? table(['Interview', 'Role', 'Date'], h.interviews.map((i) => [i.code, i.role, i.date]), '') : '')
    + `<h2>1 · Coverage</h2><p>${c.audited} of ${c.inScope} in-scope activities audited (${pct(c.share)}); ${pct(c.byEffort)} of the in-scope effort.</p>`
    + table(['Phase', 'In scope', 'Audited'], r.phases.map((p) => [`${p.phase} · ${p.name}`, p.inScope, p.audited]), 'No in-scope activity.')
    + '<h2>2 · Tooling map</h2>'
    + table(['Capability', 'In-scope activities', 'Audited', 'Tools in use', 'Gap', 'Overlap'],
      r.tooling.map((t) => [t.capability, t.activities, t.audited, t.tools.join(', ') || '—', t.gap ? 'yes' : '', t.overlap ? 'yes' : '']), 'No capability.')
    + table(['Activity', 'Capability', 'Tool', 'AI features', 'Integration'], r.tools.map((t) => [`${t.activity} · ${t.name}`, t.capability,
      t.toolName, t.aiFeatures || '—', t.integration || '—']), 'No tool recorded yet.')
    + `<h2>3 · Observed versus modelled</h2><p>Observed values never change a figure: only an accepted calibration does (section 5). ${esc(BLOCK_LABELS.time)}:
      observed person-hours per month; ${esc(BLOCK_LABELS.quality)}: observed rework rate against the rework flows it would calibrate.</p>`
    + table(['Activity', 'Modelled effort', 'Observed h/month', 'Rework observed', 'Rework modelled', 'Automation → authority', 'Modelled authority',
      'FTE share observed / modelled'], r.observed.map((o) => [`${o.id} · ${o.name}`, o.effort, opt(o.hoursPerMonth),
      o.reworkRate === null ? '—' : pct(o.reworkRate),
      o.reworkFlows.map((f) => `${f.id} ${pct(f.probability)}`).join(', ') || '—', o.automation ? `${o.automation} → ${o.impliedAuthority ?? '?'}` : '—',
      o.aiAuthority, o.fte.map((f) => `${f.role} ${opt(f.observed, '%')} / ${opt(f.modelled, '%')}`).join(', ') || '—']), 'No observed value to compare yet.')
    + '<h2>4 · Top pain points</h2>'
    + table(['Severity', 'Activity', 'AI candidate', 'Pain point'], r.pains.map((p) => [p.severity, `${p.activity} · ${p.name}`, p.aiCandidate || '—', p.text]),
      'No pain point recorded.')
    + '<h2>5 · Calibration log</h2>'
    + table(['Calibration', 'Date', 'Source', 'Element', 'Parameter', 'Before', 'After', 'Formula'], r.calibrations.flatMap((k) => k.changes.map((x) =>
      [k.code, k.date, k.source ?? '', x.element, x.param, x.from, x.to, x.formula])), 'No calibration: the figures are the model\'s own.')
    + `<h2>6 · Evidence ledger</h2><p>Audited observations count as evidence for the driver they support, evaluated on ${esc(stamp)}; the
      ledger uses the stronger of the declared and the audited tier.</p>`
    + table([...EVIDENCE_LEDGER_HEADERS], evidenceRows(evidence), 'No observation supports a driver of the evidence ledger.');
}

/** The audit report of a process document as a standalone HTML file. */
export function buildAuditReport(d: XDocument, print: Readonly<ThemeValues>, customer: string, now: Date = new Date()): { filename: string; html: string } {
  const stamp = now.toISOString().slice(0, 10), tag = customer.trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'case';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">${REPORT_CSP}<title>Audit report (contains audit data) — ${esc(customer)}</title>`
    + `<style>${reportStyle(print)}</style></head><body>${body(auditReport(d), customer, stamp, auditEvidence(d, evalDay(now)))}</body></html>`;
  return { filename: `AgentCase_Audit_report_${tag}_${stamp.replace(/-/g, '')}_contains_audit_data.html`, html };
}
