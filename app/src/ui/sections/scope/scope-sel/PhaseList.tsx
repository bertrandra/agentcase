import { phaseRows } from '@/domain';
import { useCtx, useDoc } from '@/store/hooks';
import { PhaseCard } from './PhaseCard';

/** The selector: every phase with its artefacts (filtered by "show selected only"). */
export function PhaseList() {
  const c = useCtx(), only = useDoc((d) => !!d.dom.checked.scopeSelectedOnly);
  return (
    <div className="ac-phases">
      {phaseRows(c, only).map((row) => <PhaseCard key={row.phase.id} row={row} lifecycleOn={c.s.lifecycleUse} selected={c.a.selected}
        selectedReg={c.a.selectedReg} />)}
    </div>
  );
}
