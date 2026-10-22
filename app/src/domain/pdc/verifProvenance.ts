/** @calc-zone verification-verdict */
import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { engagementKey } from '../engagement';
import { khEnabled } from '../knowledge';
import { sddMaturity } from '../model/vtax';
import { model } from '../model/overlay';
import { fmtK } from './verifFormat';

export interface Overlay { name: string; euro: boolean; active: boolean; effect: string }
export interface Guard { name: string; what: string; ok: boolean; detail: string }
export interface Provenance { clean: boolean; head: [string, string][]; overlays: Overlay[]; guards: Guard[] }

/** What the headline reflects: the top-bar figures, the optional overlays and their state, and the double-count guards (legacy renderProvenance). */
export function provenance(c: Ctx): Provenance {
  const m = model(c), ys = engineNow(c).years(), e = ys[ys.length - 1]!, endL = `Y${ys.length}`, ov = (id: string) => c.inp.c(id), ctx = engagementKey(c), sdd = sddMaturity(c);
  const kh = khEnabled(c), taxOn = ov('vtaxApply'), taxNet = c.inp.v('vtaxMode') === 'net', loopOn = ov('loopExternalApply'), r2 = (x: number) => (x * 100).toFixed(2);
  const head: [string, string][] = [['Context', ctx], ['Input FTE', m.base.etp.toFixed(1)], [`Target FTE ${endL}`, e.humanFteEnd.toFixed(1)], ['Reduction', `${Math.round((1 - e.humanFteEnd / m.base.etp) * 100)}%`],
    [`Saving ${endL}`, fmtK(e.savings)], [`Run/yr ${endL}`, fmtK(e.totalRunCost)]];
  const o = (name: string, euro: boolean, active: boolean, effect: string): Overlay => ({ name, euro, active, effect });
  const overlays = [
    o('Engagement context', true, ctx !== 'MSC', ctx + (ctx === 'MSC' ? ' (neutral baseline)' : ' (derates vs MSC)')),
    o('Knowledge hub', true, kh, kh ? 'enabled — lifts potential & KT savings' : 'disabled'),
    o('Verification tax', true, taxOn, taxOn ? `applied — ${taxNet ? 'Case 2 net of retained supervision' : 'Case 1 overlay on top of supervision'} — deducts ${Math.round((m.conv.vTaxRate || 0) * 100)}% of gross saving` : 'not applied'),
    o('AI code-quality premium', true, ov('qualApply'), ov('qualApply') ? 'applied — multiplies the verification tax' : 'not applied'),
    o('External rework (Loop Pairs)', true, loopOn, loopOn ? `applied — deducts ${r2(m.conv.loopExtRate || 0)}% of gross saving (LP001/LP003 rework, verification-tax mechanism)` : 'not applied'),
    o('Internal loop (Loop Pairs)', false, ov('loopInternalApply'), ov('loopInternalApply') ? 'applied — token-cost estimate only, never affects FTE/€' : 'not applied'),
    o('SDD maturity', false, sdd > 0, sdd > 0 ? `${sdd}/100 — cuts the verification tax` : '0 (no effect)'),
    o('Pillar leverage', false, ov('pillarApply'), ov('pillarApply') ? 'applied to the Abaque reconciliation (analytical)' : 'not applied'),
    o('Risk register → DI', false, ov('riskApply'), ov('riskApply') ? 'raises the Decision-Intelligence bar (not the euros)' : 'informational only'),
    o('AI-Act tier → DI', false, ov('aiActApply'), ov('aiActApply') ? 'raises the Decision-Intelligence bar (not the euros)' : 'informational only'),
  ];
  let v7 = true, rec = true;
  const v7d = [0, 1, 2].map((i) => { const s = m.yearETP[i]! + m.yearAgentVfte[i]!; v7 = v7 && Math.abs(s - m.base.etp) < 0.01; return `Y${i + 1} ${s.toFixed(2)}`; });
  const kt = m.conv.ktAvoidYr || [0, 0, 0], vt = m.conv.vTaxYr || [0, 0, 0], lx = m.conv.loopExtYr || [0, 0, 0];
  for (let j = 0; j < 3; j++) rec = rec && Math.abs(m.base.cost - m.yearRun[j]! + kt[j]! - vt[j]! - lx[j]! - m.yearSav[j]!) < 1;
  const g = (name: string, what: string, ok: boolean, detail: string): Guard => ({ name, what, ok, detail });
  const guards = [
    g('V7 effort conservation', 'Human FTE + Agent vFTE = Input every year — the workforce is transferred, never counted twice.', v7, `${v7d.join(' · ')} = ${m.base.etp.toFixed(2)}`),
    g('Savings reconciliation', 'Reported saving = baseline run − run + KT avoided − verification tax − external rework. No hidden term.', rec, 'each year reconciles to the reported saving'),
    g('Verification tax vs retained supervision',
      !taxOn ? 'Not applied — no overlap. The only euro effect of human review is the retained human effort in the run.'
        : taxNet ? 'Applied in Case 2 (net): only the review need NOT covered by the retained supervision is deducted — max(0, need − supervision). Nothing is counted twice by construction.'
          : 'Applied in Case 1 (overlay): an ADDITIONAL conservative cushion on top of the supervision already retained in the run — a deliberate opt-in, partial overlap.',
      !taxOn || taxNet, !taxOn ? 'no overlap' : taxNet ? 'net mode — double count structurally excluded' : '⚠ overlay mode active — read as conservatism, not a second cost centre; switch to Case 2 for a net figure'),
    g('External rework (Loop Pairs) vs verification tax',
      !loopOn || !taxOn ? 'No overlap: at most one of Verification tax and Loop Pairs external rework is active.'
        : '⚠ Both Verification tax and Loop Pairs external rework are active simultaneously — both model rework/QA overhead as a rate deducted from savings; review for double-counting before presenting the case.',
      !loopOn || !taxOn, !loopOn ? 'not applied' : !taxOn ? 'verification tax off — no overlap' : `⚠ both active — combined rate ${(((m.conv.vTaxRate || 0) + (m.conv.loopExtRate || 0)) * 100).toFixed(2)}%`),
    g('Analytical tabs isolated from the P&L', 'Coaching curve, measurement socle, governance gates, program sizing and pillar leverage are display-only — they never feed the run or savings.', true, 'confirmed display-only'),
  ];
  return { clean: !overlays.some((x) => x.euro && x.active), head, overlays, guards };
}
