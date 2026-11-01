/** @calc-zone exports */
import { cmmnDocument } from '@/domain/cmmn';
import { bindingsOf, decisionsEl, decisionsOf, dmnFile, readDmn, ruleFamilies, writeDmn } from '@/domain/dmn';
import { serialize } from '@/domain/process';
import { caseViews } from '@/domain/process/engineInputs';
import { APP_VERSION } from '@/domain/version';
import { activeDoc } from '@/store/editBase';
import type { BpmnFile } from './bpmn';

/**
 * The files next to the `.bpmn` of an export (docs/SPEC_BPMN.md § 17.8; phase B7b). F-B62: the decisions as a `.dmn` file (DMN 1.3): the
 * decisions the case's process embeds, or, when it holds none, the three rule families the case already holds (`ruleFamilies`), ready to be
 * edited in a DMN tool and imported back. F-B63 (optional, D-B25): the run phase (L9) as a `.cmmn` file (CMMN 1.1). Both for the case shown.
 */
export const hasDecisions = (): boolean => decisionsEl(activeDoc().BPMN.root) !== undefined;

/**
 * SPEC_FIXES FX-27: the decisions an export's `.dmn` holds and how many of them no business-rule task is bound to (they apply to nothing until one
 * is). Without decisions of its own the case exports the rule families, none of them bound.
 */
export function dmnBindingState(): { decisions: number; unbound: number; generated: boolean } {
  const c = activeDoc(), own = decisionsOf(c.BPMN.root);
  if (!own) {
    const v = caseViews(c), n = readDmn(writeDmn(ruleFamilies([...(v?.sdlc ?? []), ...(v?.reg ?? [])]))).model.decisions.length;
    return { decisions: n, unbound: n, generated: true };
  }
  const bound = new Set(bindingsOf(c.BPMN.root).map((b) => b.decision)), ids = own.model.decisions.map((d) => d.id);
  return { decisions: ids.length, unbound: ids.filter((id) => !bound.has(id)).length, generated: false };
}

/** The `.dmn` / `.cmmn` files of an export, named like the `.bpmn` file (`bpmnName`) with their own extension. */
export function companionFiles(bpmnName: string, o: { dmn: boolean; cmmn: boolean }): BpmnFile[] {
  const c = activeDoc(), base = bpmnName.replace(/\.bpmn$/, ''), out: BpmnFile[] = [];
  if (o.dmn) {
    const own = decisionsEl(c.BPMN.root), v = caseViews(c);
    const dmn = own ?? writeDmn(ruleFamilies([...(v?.sdlc ?? []), ...(v?.reg ?? [])]));
    out.push({ filename: `${base}.dmn`, text: serialize(dmnFile(dmn)) });
  }
  if (o.cmmn) out.push({ filename: `${base}_run.cmmn`, text: serialize(cmmnDocument(c.BPMN, APP_VERSION)) });
  return out;
}
