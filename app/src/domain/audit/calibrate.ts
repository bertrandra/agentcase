/** @calc-zone process-model */
import { updateActivities, type ActivityPatch } from '../process/editActivity';
import { setReworkFlow } from '../process/editMore';
import { readProcess } from '../process/read';
import type { XDocument } from '../process/xml';
import { activityAudits, type ActivityAudit } from './analysis';
import { patchedHeader } from './edit';
import { DATE } from './ops';
import { readAudit } from './read';
import type { CalibrationChange } from './types';
import { headerXml, onCollaboration, withExtChild } from './write';

/**
 * Calibration from the audit (F-B29, D-B11): the ONLY path from observed values to the model. `proposals` lists, activity by activity, the
 * parameters the audit suggests, each with its formula; the user accepts some; `calibrate` applies the accepted set as one change of the
 * document and appends it to the calibration log (`ac:calibration` in the audit header: date, source, each parameter before → after).
 * Without calibration no figure moves.
 *
 * - effort: observed hours per month × the case's scale k = Σ modelled effort / Σ observed hours per month over the activities that have both
 *   (at least two, so k is not the activity's own ratio); rounded to 2 decimals.
 * - rework probability of the back flows that rework the activity (`ac:rework activityA`): the observed rework rate.
 * - AI authority: the authority the observed automation level implies (none → Assistance, scripted → Copilot, pipeline → Supervised
 *   autonomous, agentic → Autonomous); never for a regulatory activity (authority Compliance).
 */
export interface Proposal extends CalibrationChange { name: string }
const r2 = (x: number): number => Math.round(x * 100) / 100;
const fmt = (x: number): string => String(r2(x));

function effortProposals(rows: readonly ActivityAudit[]): Proposal[] {
  const both = rows.filter((r) => r.inScope && r.hoursPerMonth !== null && r.hoursPerMonth > 0 && r.effort > 0);
  if (both.length < 2) return [];
  const e = both.reduce((t, r) => t + r.effort, 0), h = both.reduce((t, r) => t + r.hoursPerMonth!, 0), k = e / h;
  return both.filter((r) => r2(r.hoursPerMonth! * k) !== r.effort).map((r) => ({
    element: r.id, name: r.name, param: 'effort', from: String(r.effort), to: fmt(r.hoursPerMonth! * k),
    formula: `${fmt(r.hoursPerMonth!)} h/month (${r.hoursFormula ?? ''}) × k ${k.toPrecision(4)} `
      + `(Σ effort ${fmt(e)} / Σ ${fmt(h)} h/month, ${both.length} activities)`,
  }));
}

/** The calibration proposals of a document (computed from its audit and its model, never applied by themselves). */
export function proposals(d: XDocument): Proposal[] {
  const rows = activityAudits(d), out: Proposal[] = effortProposals(rows);
  for (const r of rows.filter((x) => x.inScope)) {
    if (r.reworkRate !== null) {
      for (const f of r.reworkFlows.filter((x) => r2(x.probability) !== r2(r.reworkRate!))) {
        out.push({ element: f.id, name: `${r.name} (rework flow)`, param: 'probability', from: String(f.probability), to: fmt(r.reworkRate),
          formula: `observed rework rate ${fmt(r.reworkRate * 100)} % / 100` });
      }
    }
    if (r.impliedAuthority && !r.regulatory && r.aiAuthority !== 'Compliance' && r.impliedAuthority !== r.aiAuthority) {
      out.push({ element: r.id, name: r.name, param: 'aiAuthority', from: r.aiAuthority, to: r.impliedAuthority,
        formula: `automation level "${r.automation}" → ${r.impliedAuthority}` });
    }
  }
  return out;
}

const AUTHORITIES = ['Assistance', 'Copilot', 'Supervised autonomous', 'Autonomous'];
/**
 * Apply the accepted changes and log them. `from` is read from the document as it is now; a change whose value is refused (negative effort,
 * probability outside [0, 1], unknown authority or element) is left out; nothing accepted = the same document (no undo step).
 */
export function calibrate(d: XDocument, accepted: readonly CalibrationChange[], date: string, source: string): XDocument {
  if (!DATE.test(date)) return d;
  const v = readProcess(d), acts = new Map(v.activities.map((a) => [a.id, a])), flows = new Map(v.flows.filter((f) => f.rework).map((f) => [f.id, f]));
  const patches = new Map<string, ActivityPatch>(), log: CalibrationChange[] = [];
  let doc = d;
  for (const c of accepted) {
    const n = Number(c.to), a = acts.get(c.element), f = flows.get(c.element);
    if (c.param === 'effort' && a && Number.isFinite(n) && n >= 0) {
      patches.set(a.id, { ...patches.get(a.id), effort: n }); log.push({ ...c, from: String(a.effort), to: String(n) });
    } else if (c.param === 'aiAuthority' && a && AUTHORITIES.includes(c.to) && a.aiAuthority !== 'Compliance') {
      patches.set(a.id, { ...patches.get(a.id), aiAuthority: c.to }); log.push({ ...c, from: a.aiAuthority });
    } else if (c.param === 'probability' && f && Number.isFinite(n) && n >= 0 && n <= 1) {
      doc = setReworkFlow(doc, f.id, { probability: n }); log.push({ ...c, from: String(f.rework!.probability), to: String(n) });
    }
  }
  if (!log.length) return d;
  doc = updateActivities(doc, patches);
  const cur = readAudit(doc).header, h = patchedHeader(cur, {}, { code: 'AUDIT-1', asOf: date });
  if (!h) return d;
  const entry = { code: `CAL-${h.calibrations.length + 1}`, date, ...(source.trim() ? { source: source.trim().slice(0, 4000) } : {}), changes: log };
  return onCollaboration(doc, (c) => withExtChild(c, 'auditHeader', headerXml({ ...h, calibrations: [...h.calibrations, entry] })));
}
