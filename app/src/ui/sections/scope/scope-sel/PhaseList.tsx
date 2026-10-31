import { phaseRows } from '@/domain';
import { useCtx, useDoc } from '@/store/hooks';
import { goSection } from '@/ui/uiState';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { useScopeFocus, withFocused } from './focus';
import { PhaseCard } from './PhaseCard';

/** A regulatory artefact a Process link asked to show while its norm is not selected: no phase lists it, its norm is chosen elsewhere. */
function NormOff({ id, name, norm }: { id: string; name: string; norm: string }) {
  return (
    <p className="ac-callout" role="status">{`${id} · ${name} belongs to the norm ${norm}, which is not selected: no phase lists it. `}
      <button type="button" className="ac-link" onClick={() => goSection('transform-params')}>Select the norm in Industry / regulatory profile</button>{' · '}
      <button type="button" className="ac-link" onClick={() => openActivity(id)}>{`Open ${name} in Process`}</button></p>
  );
}

/** The selector: every phase with its artefacts (filtered by "show selected only"), the one a Process link focused kept in sight. */
export function PhaseList() {
  const c = useCtx(), only = useDoc((d) => !!d.dom.checked.scopeSelectedOnly), focus = useScopeFocus();
  const shown = phaseRows(c, only), rows = only && focus ? withFocused(shown, phaseRows(c, false), focus) : shown;
  const listed = !focus || rows.some((r) => [...r.sdlcShown, ...r.regShown].some((a) => a.id === focus));
  const reg = listed ? undefined : c.a.reg.find((a) => a.id === focus);
  return (
    <div className="ac-phases">
      {reg && <NormOff id={reg.id} name={reg.name} norm={reg.norm ?? ''} />}
      {rows.map((row) => <PhaseCard key={row.phase.id} row={row} lifecycleOn={c.s.lifecycleUse} selected={c.a.selected}
        selectedReg={c.a.selectedReg} focus={focus} />)}
    </div>
  );
}
