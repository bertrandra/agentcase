import { activityAudits, auditProgressOf } from '@/domain/audit';
import { decisionLabels } from '@/domain/dmn';
import type { Drawing, DrawShape, XDocument } from '@/domain/process';
import type { ActFacts } from './DiagramOptions';
import { counted, type Row } from './tableModel';

/** What the delivery-process diagram draws besides the shapes (🧩 Process and the 🗺️ Process studio's BPMN tab). */
export const count = (d: Drawing, kind: DrawShape['kind']): number => d.shapes.filter((s) => s.kind === kind).length;
export function factsOf(rows: Row[], d: XDocument): Map<string, ActFacts> {
  const audit = new Map(activityAudits(d).map((a) => [a.id, auditProgressOf(a)]));
  return new Map(rows.map((r) => [r.id, { type: r.type, authority: r.aiAuthority, audit: audit.get(r.id) ?? '', counted: counted(r) }]));
}
/** FX-26: a bound business-rule task shows the decision it applies, under its label (`◇ name`). */
export function withDecisions(d: Drawing, doc: XDocument): Drawing {
  const by = decisionLabels(doc.root);
  return by.size ? { ...d, shapes: d.shapes.map((s) => (by.has(s.id) ? { ...s, marker: `◇ ${by.get(s.id)!}` } : s)) } : d;
}
