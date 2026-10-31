/** @calc-zone exports */
import { laneDef, type LaneRole } from './lanes';
import { programmeRates } from './profile';
import type { Plan } from './plan';
import type { WbsNode } from './wbs';
import type { DictionaryRow } from './wbsDictionary';
import { duration, linkLag, standardCalendar, workSpan, type WorkSpan } from './mspdiTime';

/**
 * The programme as an MS Project XML file (MSPDI, Microsoft Project XML Data Interchange; docs/SPEC_BPMN.md § 19.8 F-B77, decision D-B36:
 * export only — AgentCase stays the source, D-B1). One task per WBS node in outline order (WBS code, outline number and level; the groups and
 * products as summary tasks), each work package with its start (a "start no earlier than" constraint holding the timing owner's placement),
 * finish, duration in working days, its predecessors (finish-to-start with their lag), a generic work resource per role (the activity's lane, at
 * the programme's role rate) and an assignment carrying the activity's effort. A derived view, not a standard conversion: the project's
 * comments say so. Validated against Microsoft's schema (`docs/bpmn/microsoft/mspdi_pj12.xsd`, tests/domain/programme/mspdi.test.ts).
 */
export const MSPDI_NS = 'http://schemas.microsoft.com/project';
const esc = (s: string): string => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]!);
const tag = (n: string, v: string | number): string => `<${n}>${typeof v === 'number' ? v : esc(v)}</${n}>`;
const r2 = (n: number): number => Math.round(n * 100) / 100;

interface Row { node: WbsNode; span: WorkSpan; summary: boolean }
function rowsOf(p: Plan, wbs: readonly WbsNode[]): Row[] {
  const own = wbs.map((n) => (n.task ? workSpan(p.startDate, n.task.start, n.task.dur, n.task.milestone) : null));
  return wbs.map((node, i) => {
    if (own[i]) return { node, span: own[i]!, summary: false };
    let j = i + 1, s = '9999', f = '0000', days = 0;
    for (; j < wbs.length && wbs[j]!.level > node.level; j++) {
      const x = own[j];
      if (x) { s = x.start < s ? x.start : s; f = x.finish > f ? x.finish : f; days = Math.max(days, x.days); }
    }
    return { node, span: s === '9999' ? workSpan(p.startDate, 0, 0, true) : { start: s, finish: f, days }, summary: true };
  });
}

export function mspdiXml(p: Plan, wbs: readonly WbsNode[], dict: readonly DictionaryRow[], name: string): string {
  const rows = rowsOf(p, wbs), uid = new Map(rows.flatMap((r, i) => (r.node.task ? [[r.node.task.id, i + 1] as const] : [])));
  const byCode = new Map(dict.map((d) => [d.code, d])), rate = programmeRates(p.c).role, lanes: LaneRole[] = [];
  const tasks = rows.map((r, i) => {
    const t = r.node.task, d = byCode.get(r.node.code), hours = r.summary ? 0 : r.span.days * 8;
    const preds = (t?.preds ?? []).filter((x) => uid.has(x.id)).map((x) => `<PredecessorLink>${tag('PredecessorUID', uid.get(x.id)!)}${tag('Type', 1)}`
      + `${tag('CrossProject', 0)}${tag('LinkLag', linkLag(x.lag))}${tag('LagFormat', 7)}</PredecessorLink>`).join('');
    const notes = d ? `${d.description} Deliverable: ${d.deliverable}.`
      : 'Derived from the AgentCase transformation programme (a view, not a standard conversion).';
    return `<Task>${tag('UID', i + 1)}${tag('ID', i + 1)}${tag('Name', r.node.name)}${tag('Type', 1)}${tag('IsNull', 0)}${tag('WBS', r.node.code)}`
      + `${tag('OutlineNumber', r.node.code)}${tag('OutlineLevel', r.node.level)}${tag('Start', r.span.start)}${tag('Finish', r.span.finish)}`
      + `${tag('Duration', duration(r.summary ? r.span.days * 8 : hours))}${tag('DurationFormat', 7)}${tag('Milestone', t?.milestone ? 1 : 0)}`
      + `${tag('Summary', r.summary ? 1 : 0)}${tag('Critical', t?.critical ? 1 : 0)}${tag('ConstraintType', r.summary ? 0 : 4)}`
      + `${r.summary ? '' : tag('ConstraintDate', r.span.start)}${tag('Notes', notes)}${preds}</Task>`;
  }).join('');
  const work = rows.filter((r) => !r.summary && r.node.task && (byCode.get(r.node.code)?.effortDays ?? 0) > 0 && r.span.days > 0);
  for (const r of work) if (!lanes.includes(r.node.task!.lane)) lanes.push(r.node.task!.lane);
  const resources = lanes.map((l, i) => `<Resource>${tag('UID', i + 1)}${tag('ID', i + 1)}${tag('Name', laneDef(l).name)}${tag('Type', 1)}`
    + `${tag('IsNull', 0)}${tag('Group', 'Transformation team')}${tag('StandardRate', r2(rate / 8))}${tag('StandardRateFormat', 2)}`
    + `${tag('CalendarUID', 1)}${tag('IsGeneric', 1)}</Resource>`).join('');
  const assignments = work.map((r, i) => {
    const e = byCode.get(r.node.code)!.effortDays!;
    return `<Assignment>${tag('UID', i + 1)}${tag('TaskUID', uid.get(r.node.task!.id)!)}${tag('ResourceUID', lanes.indexOf(r.node.task!.lane) + 1)}`
      + `${tag('Finish', r.span.finish)}${tag('Start', r.span.start)}${tag('Units', r2(e / r.span.days))}${tag('Work', duration(e * 8))}</Assignment>`;
  }).join('');
  const first = rows[0]?.span;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + `<Project xmlns="${MSPDI_NS}">${tag('SaveVersion', 12)}${tag('Name', `${name}.xml`)}${tag('Title', name)}`
    + `${tag('Subject', 'Transformation programme, derived from the AgentCase BPMN document (a view, not a standard conversion)')}`
    + `${tag('Author', 'AgentCase')}${tag('ScheduleFromStart', 1)}${tag('StartDate', first?.start ?? `${p.startDate}T08:00:00`)}`
    + `${first ? tag('FinishDate', first.finish) : ''}${tag('CurrencySymbol', '€')}${tag('CurrencyCode', 'EUR')}${tag('CalendarUID', 1)}`
    + `${tag('MinutesPerDay', 480)}${tag('MinutesPerWeek', 2400)}`
    + `${tag('DaysPerMonth', 20)}${tag('DurationFormat', 7)}${standardCalendar()}<Tasks>${tasks}</Tasks><Resources>${resources}</Resources>`
    + `<Assignments>${assignments}</Assignments></Project>\n`;
}
