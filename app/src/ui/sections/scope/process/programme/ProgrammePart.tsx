import { useCallback, useId, useMemo } from 'react';
import { isProgrammeId, programmeDrawing, programmeProcess } from '@/domain/programme';
import type { Ctx } from '@/domain';
import { useCtxSelector, usePortfolio } from '@/store/hooks';
import { useActiveProductId, useIsMulti } from '@/store/portfolioHooks';
import { Diagram } from '../Diagram';
import { useProcessView } from '../view';
import { ParamPanel } from './ParamPanel';
import { ProgrammeFacts, ProgrammeTable } from './ProgrammeTable';

/**
 * The transformation programme in the 🧩 Process section (docs/SPEC_BPMN.md § 19.7 F-B70; phase B9a): its diagram (a swim lane per role, the
 * agents in their own lane, phases and waves as sub-processes, message flows to the delivery process), the parameter panel of the selected
 * activity, the activity table (the diagram's accessible alternative), the lanes, waves and message flows. Derived from the case (nothing
 * stored in B9a): the values are today's keys, edited through the panel.
 */
export function ProgrammePart() {
  const multi = useIsMulti(), pf = usePortfolio((p) => (multi ? p : undefined)), productId = useActiveProductId(), tableId = useId(), hId = useId();
  const selected = useProcessView((s) => s.selected);
  // the programme view, kept while structurally equal: an edit it does not show (the customer name) re-renders nothing here
  const v = useCtxSelector(useCallback((c: Ctx) => programmeProcess(c, pf, productId), [pf, productId]));
  const d = useMemo(() => programmeDrawing(v), [v]);
  const waves = v.waves.length ? `, ${v.waves.length} waves` : '';
  const desc = `${v.activities.length} activities in ${v.lanes.length} lanes and ${v.phases.length} phases${waves}, `
    + `with ${v.messageFlows.length} message flows to the delivery process.`;
  return (
    <section className="ac-prog" aria-labelledby={hId}>
      <h2 id={hId}>Transformation programme</h2>
      <p className="ac-muted">The work of the transformation itself, as a second process beside the delivery process: one lane per role of the operating
        model, the agents in their own lane. Select an activity to see and edit its description, role, timing, cost and parameters.</p>
      <Diagram d={d} tableId={tableId} title="Diagram of the transformation programme" desc={desc} name="Programme diagram" labelZoom={1} />
      {isProgrammeId(selected) && <ParamPanel v={v} id={selected as string} />}
      <h3 id={tableId}>Programme activities</h3>
      <ProgrammeTable v={v} />
      <ProgrammeFacts v={v} />
    </section>
  );
}
