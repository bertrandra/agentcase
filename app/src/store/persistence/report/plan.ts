/** @calc-zone exports */
import { fmtK } from '@/domain/format';
import { fteOf } from '@/domain/programme/histogram';
import type { PlanViews } from '@/domain/programme/planBundle';
import { tokIn, type ThemeValues } from '@/domain/theme';
import { esc, REPORT_CSP, reportStyle } from './render';

const r1 = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
const heads = (xs: string[]): string => `<tr>${xs.map((x) => `<th>${x}</th>`).join('')}</tr>`;
const cells = (xs: unknown[]): string => `<tr>${xs.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`;
const page = 'style="page-break-before:always"';

/** The Gantt page: one bar per work package on the plan's calendar (critical bars outlined), then the schedule table. */
function ganttPage(v: PlanViews, ink: string, bar: string, crit: string): string {
  const total = Math.max(1, ...v.plan.tasks.map((t) => t.start + t.dur)), at = (m: number) => ((m / total) * 100).toFixed(2);
  const rows = v.dictionary.map((d) => {
    const t = v.wbs.find((n) => n.code === d.code)!.task!, w = t.milestone ? '0.8' : Math.max(0.4, +at(t.dur)).toFixed(2);
    return `<tr><td>${esc(d.code)}</td><td>${esc(d.name)}</td><td style="width:55%"><div style="position:relative;height:10px">`
      + `<div style="position:absolute;left:${at(t.start)}%;width:${w}%;height:10px;background:${t.critical ? crit : bar}"></div></div></td></tr>`;
  }).join('');
  return `<h2>1 · Gantt</h2><p>From the programme process: bars placed by the one timing owner, critical path in <span style="color:${crit}">this colour`
    + `</span>. Start ${esc(v.plan.startDate)}.</p><table style="color:${ink}">${heads(['WBS', 'Work package', 'Calendar'])}${rows}</table>`
    + `<table>${heads(['WBS', 'Work package', 'Start', 'Finish', 'Months', 'Predecessors', 'Critical'])}${v.dictionary.map((d) => cells([d.code, d.name,
      d.start, d.milestone ? '◆' : d.finish, d.milestone ? '—' : r1(d.months), d.predecessors || '—', d.critical ? 'Yes' : ''])).join('')}</table>`;
}

function wbsPage(v: PlanViews): string {
  return `<h2 ${page}>2 · Work breakdown structure</h2><table>${heads(['Code', 'Element', 'Level'])}${v.wbs.map((n) => cells([n.code,
    `${'· '.repeat(n.level - 1)}${n.name}`, n.level])).join('')}</table><h3>WBS dictionary</h3><table>${heads(['Code', 'Work package', 'Deliverable',
    'Accountable', 'Roles', 'Effort (days)', 'Cost'])}${v.dictionary.map((d) => cells([d.code, d.name, d.deliverable, d.accountable, d.roles,
    d.effortDays === null ? '—' : r1(d.effortDays), d.cost === null ? '—' : fmtK(d.cost)])).join('')}</table>`;
}

function histogramPage(v: PlanViews): string {
  const h = v.histogram, rows: string[] = [];
  for (let i = 0; i <= h.to - h.from; i++) {
    const days = h.roles.reduce((s, r) => s + r.days[i]!, 0);
    if (days > 1e-9) rows.push(cells([`M${h.from + i}`, ...h.roles.map((r) => r1(fteOf(r.days[i]!, h.wdMonth))), r1(fteOf(days, h.wdMonth))]));
  }
  const flags = h.flags.length ? `<p>${h.flags.length} over-allocated role-month(s) (diagnostics only, no levelling).</p>` : '<p>No over-allocation.</p>';
  return `<h2 ${page}>3 · Resource histogram (FTE)</h2><p>The programme's labour per month by role, from its cost profile.</p>${flags}`
    + `<table>${heads(['Month', ...h.roles.map((r) => esc(r.label)), 'Total'])}${rows.join('')}</table>`;
}

/**
 * The plan report (docs/SPEC_BPMN.md § 19.8 F-B77; phase B9d): a standalone, scriptless page with the Gantt, WBS and histogram pages of the
 * plan views of a display scope, in the print theme. A separate file: the Critical & Regulated report stays the legacy one.
 */
export function renderPlanReport(v: PlanViews, print: Readonly<ThemeValues>, title: string, stamp: string): string {
  const ink = tokIn(print, 'report-ink'), bar = tokIn(print, 'report-rule'), crit = tokIn(print, 'report-heading');
  return '<!DOCTYPE html><html><head><meta charset="utf-8">' + REPORT_CSP
    + `<title>Transformation programme plan — ${esc(title)}</title><style>${reportStyle(print)}</style></head><body>`
    + `<h1>Transformation programme plan — ${esc(title)}</h1><p><span class="tag">${esc(stamp)}</span> <span class="tag">Derived from the BPMN `
    + 'programme: a documented mapping, not a standard conversion</span></p>'
    + ganttPage(v, ink, bar, crit) + wbsPage(v) + histogramPage(v) + '</body></html>';
}
