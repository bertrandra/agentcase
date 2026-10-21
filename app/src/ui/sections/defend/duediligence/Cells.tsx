import { ddUse, DD_STATUSES, type DdClass, type DdEdit, type DdRow, type DdStatus } from '@/domain/pdc/dd';
import { setAnchor, setCoef, setDdState, setFgParam, setQualityAnchor } from '@/controllers/pdc';
import { fmtK } from '@/ui/economicsFormat';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';

const chip = (bg: string, children: string, extra?: object) => <span style={{ fontSize: 9, background: bg, color: '#fff', borderRadius: 3, padding: '1px 6px', whiteSpace: 'nowrap', ...extra }}>{children}</span>;

/** "Used in": reaches the euro result (CALC), feeds the Factory group, or display only. */
export function UseCell({ r }: { r: DdRow }) {
  const u = ddUse(r);
  return (
    <>
      {u.calc && chip('#0058AB', '⚙ CALC')}
      {u.calc && u.factory && <div style={{ height: 2 }} />}
      {u.factory && chip('#b04600', '🏭 FACTORY')}
      {!u.calc && !u.factory && <span style={{ fontSize: 9, color: '#566074', border: '1px solid #d5dae6', borderRadius: 3, padding: '1px 6px' }}>display</span>}
    </>
  );
}

const CLS: Record<DdClass, [string, string]> = { PC1: ['#5B6B8C', 'PC1 client-provided'], PC2: ['#0058AB', 'PC2 client-observable'], PC3: ['#566074', 'PC3 catalogue'], PC4: ['#b04600', 'PC4 unvalidated'], PC5: ['#8F3237', 'PC5 embedded'] };
export const ClassChip = ({ cls }: { cls: DdClass }) => chip(CLS[cls][0], CLS[cls][1]);

const label = (id: string) => sectionById(id)?.label ?? id;
const Link = ({ id }: { id: string }) => (
  <button type="button" className="ac-link" title={`Open ${label(id)}`} onClick={() => goSection(id)} style={{ color: 'var(--ac-blue)', fontWeight: 600, background: 'none', border: 0, borderBottom: '1px dotted var(--ac-blue)', padding: 0, cursor: 'pointer' }}>{label(id)} →</button>
);
/** "Editable in": here, derived, a link to the section that owns the control, or nowhere. */
export function EditCell({ e }: { e: DdEdit }) {
  if (e === 'here') return <span style={{ color: '#00666F', fontWeight: 600 }}>✎ here</span>;
  if (e === 'derived') return <span style={{ color: '#566074' }}>∑ derived</span>;
  if (typeof e === 'object') return <><Link id={e.sec} />{e.also && <div style={{ marginTop: 2 }}><Link id={e.also} /></div>}{e.note && <div style={{ fontSize: 10, color: '#636363', marginTop: 2 }}>{e.note}</div>}</>;
  return <span style={{ color: '#8F3237', fontWeight: 600 }}>NOWHERE</span>;
}

function write(f: NonNullable<DdRow['ed']>['field'], which: 'a' | 't', v: string): void {
  if (f.kind === 'coef') setCoef(f.key, v);
  else if (f.kind === 'fg') setFgParam(f.key, v);
  else if (f.kind === 'qual') setQualityAnchor(f.i, which === 'a' ? 1 : 2, v);
  else setAnchor(f.kind === 'dora' ? 'DORA_ANCHORS' : 'THROUGHPUT_ANCHORS', f.id, which === 'a' ? 'asis' : 'target', v);
}
function Num({ r, which }: { r: DdRow; which: 'a' | 't' }) {
  const ed = r.ed!, val = which === 'a' ? ed.a : ed.t, dflt = which === 'a' ? ed.da : ed.dt, edited = dflt !== undefined && +(val as number) !== +dflt;
  return (
    <input type="number" step="any" aria-label={`${r.l}${which === 't' ? ' target' : ''}`} title={dflt !== undefined ? `default ${dflt}` : ''} value={val as number}
      onChange={(e) => write(ed.field, which, e.target.value)}
      style={{ width: 62, textAlign: 'center', fontSize: 11.5, border: `1px solid ${edited ? '#b04600' : '#d5dae6'}`, borderRadius: 5, fontWeight: edited ? 700 : undefined, color: edited ? '#8F3900' : undefined }} />
  );
}
/** "Value": the live value, or the editor(s) (as-is → target for the anchors). */
export function ValueCell({ r }: { r: DdRow }) {
  if (!r.ed) return <>{r.v === null ? '—' : r.v}</>;
  if (r.ed.t === null) return <Num r={r} which="a" />;
  return <><Num r={r} which="a" /> <span style={{ color: '#566074' }}>→</span> <Num r={r} which="t" /><div style={{ fontSize: 9, color: '#636363', textTransform: 'uppercase', marginTop: 2 }}>as-is → target</div></>;
}

const STATE: Record<DdStatus, [string, string]> = { open: ['#566074', 'OPEN'], requested: ['#b04600', 'REQUESTED'], confirmed: ['#006e79', 'CONFIRMED'], disputed: ['#8F3237', 'DISPUTED'], waived: ['#5B6B8C', 'WAIVED'] };
/** "State": chip + selector. A row validated in the assumptions register reads confirmed. */
export function StateCell({ r, st }: { r: DdRow; st: DdStatus }) {
  const shown = r.ok ? 'confirmed' : st;
  return (
    <>{chip(STATE[shown][0], STATE[shown][1])}{' '}
      <select aria-label={`State of ${r.l}`} style={{ width: 'auto', fontSize: 10 }} value={shown} onChange={(e) => setDdState(r.id, e.target.value as DdStatus)}>
        {DD_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
      </select></>
  );
}

/** "€ weight": measured euro impact of a +20 % change, "€0 here", n/m (not reachable) or a dash before any measurement. */
export function WeightCell({ fresh, w }: { fresh: boolean; w: number | null }) {
  if (!fresh) return <span style={{ color: '#636363' }}>—</span>;
  if (w == null) return <span style={{ color: '#8F3237' }} title="Not reachable without refactoring the calculation path">n/m</span>;
  if (w < 1) return <span style={{ color: '#566074' }} title="Zero measured impact in this configuration: the element drives the display only, or the module that consumes it is switched off for this case.">€0 here</span>;
  return <strong>{fmtK(w)}</strong>;
}
