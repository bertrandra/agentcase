import { ddUse, DD_STATUSES, type DdClass, type DdEdit, type DdRow, type DdStatus } from '@/domain/pdc/dd';
import { setAnchor, setCoef, setDdState, setFgParam, setQualityAnchor } from '@/controllers/pdc';
import { fmtK } from '@/ui/economicsFormat';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';

/** A small filled chip; its colour is the `data-kind` rule of sections-b.css (`use:calc`, `cls:PC1`, `state:open` …). */
const chip = (kind: string, children: string) => <span className="ac-dd-chip" data-kind={kind}>{children}</span>;

/** "Used in": reaches the euro result (CALC), feeds the Factory group, or display only. */
export function UseCell({ r }: { r: DdRow }) {
  const u = ddUse(r);
  return (
    <>
      {u.calc && chip('use:calc', '⚙ CALC')}
      {u.calc && u.factory && <div className="ac-dd-gap" />}
      {u.factory && chip('use:factory', '🏭 FACTORY')}
      {!u.calc && !u.factory && <span className="ac-dd-display">display</span>}
    </>
  );
}

const CLS: Record<DdClass, string> = {
  PC1: 'PC1 client-provided', PC2: 'PC2 client-observable', PC3: 'PC3 catalogue', PC4: 'PC4 unvalidated', PC5: 'PC5 embedded',
};
export const ClassChip = ({ cls }: { cls: DdClass }) => chip(`cls:${cls}`, CLS[cls]);

const label = (id: string) => sectionById(id)?.label ?? id;
const Link = ({ id }: { id: string }) => (
  <button type="button" className="ac-link ac-dd-link" title={`Open ${label(id)}`} onClick={() => goSection(id)}>{label(id)} →</button>
);
/** "Editable in": here, derived, a link to the section that owns the control, or nowhere. */
export function EditCell({ e }: { e: DdEdit }) {
  if (e === 'here') return <span className="ac-dd-here">✎ here</span>;
  if (e === 'derived') return <span className="ac-dd-soft">∑ derived</span>;
  if (typeof e === 'object') {
    return <><Link id={e.sec} />{e.also && <div className="ac-dd-also"><Link id={e.also} /></div>}{e.note && <div className="ac-dd-note">{e.note}</div>}</>;
  }
  return <span className="ac-dd-nowhere">NOWHERE</span>;
}

function write(f: NonNullable<DdRow['ed']>['field'], which: 'a' | 't', v: string): void {
  if (f.kind === 'coef') setCoef(f.key, v);
  else if (f.kind === 'fg') setFgParam(f.key, v);
  else if (f.kind === 'qual') setQualityAnchor(f.i, which === 'a' ? 1 : 2, v);
  else setAnchor(f.kind === 'dora' ? 'DORA_ANCHORS' : 'THROUGHPUT_ANCHORS', f.id, which === 'a' ? 'asis' : 'target', v);
}
/** An anchor editor (`ac-dd-num`): amber and bold once it differs from its default (`is-edited`). */
function Num({ r, which }: { r: DdRow; which: 'a' | 't' }) {
  const ed = r.ed!, val = which === 'a' ? ed.a : ed.t, dflt = which === 'a' ? ed.da : ed.dt, edited = dflt !== undefined && +(val as number) !== +dflt;
  return (
    <input type="number" step="any" aria-label={`${r.l}${which === 't' ? ' target' : ''}`} title={dflt !== undefined ? `default ${dflt}` : ''} value={val as number}
      onChange={(e) => write(ed.field, which, e.target.value)}
      className={edited ? 'ac-dd-num is-edited' : 'ac-dd-num'} />
  );
}
/** "Value": the live value, or the editor(s) (as-is → target for the anchors). */
export function ValueCell({ r }: { r: DdRow }) {
  if (!r.ed) return <>{r.v === null ? '—' : r.v}</>;
  if (r.ed.t === null) return <Num r={r} which="a" />;
  return <><Num r={r} which="a" /> <span className="ac-dd-soft">→</span> <Num r={r} which="t" /><div className="ac-dd-caption">as-is → target</div></>;
}

const STATE: Record<DdStatus, string> = { open: 'OPEN', requested: 'REQUESTED', confirmed: 'CONFIRMED', disputed: 'DISPUTED', waived: 'WAIVED' };
/** "State": chip + selector. A row validated in the assumptions register reads confirmed. */
export function StateCell({ r, st }: { r: DdRow; st: DdStatus }) {
  const shown = r.ok ? 'confirmed' : st;
  return (
    <>{chip(`state:${shown}`, STATE[shown])}{' '}
      <select aria-label={`State of ${r.l}`} className="ac-dd-state" value={shown} onChange={(e) => setDdState(r.id, e.target.value as DdStatus)}>
        {DD_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
      </select></>
  );
}

/** "€ weight": measured euro impact of a +20 % change, "€0 here", n/m (not reachable) or a dash before any measurement. */
export function WeightCell({ fresh, w }: { fresh: boolean; w: number | null }) {
  if (!fresh) return <span className="ac-dd-none">—</span>;
  if (w == null) return <span className="ac-alert-text" title="Not reachable without refactoring the calculation path">n/m</span>;
  if (w < 1) return <span className="ac-dd-soft" title="Zero measured impact in this configuration: the element drives the display only, or the module that consumes it is switched off for this case.">€0 here</span>;
  return <strong>{fmtK(w)}</strong>;
}
