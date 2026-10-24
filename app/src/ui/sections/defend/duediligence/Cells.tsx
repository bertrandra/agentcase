import { ddUse, DD_STATUSES, type DdClass, type DdEdit, type DdRow, type DdStatus } from '@/domain/pdc/dd';
import { setAnchor, setCoef, setDdState, setFgParam, setQualityAnchor } from '@/controllers/pdc';
import { fmtK } from '@/ui/economicsFormat';
import { goSection } from '@/ui/uiState';
import { sectionById } from '@/ui/zones/registry';
import { tok } from '@/domain/theme';
import type { CSSProperties } from 'react';

const chip = (bg: string, children: string, extra?: object) => <span style={{ fontSize: 'var(--ac-font-size-2xs)', background: bg, color: 'var(--ac-neutral-0)', borderRadius: 'var(--ac-radius-xs)', padding: '1px 6px', whiteSpace: 'nowrap', ...extra }}>{children}</span>;

/** "Used in": reaches the euro result (CALC), feeds the Factory group, or display only. */
export function UseCell({ r }: { r: DdRow }) {
  const u = ddUse(r);
  return (
    <>
      {u.calc && chip(tok('primary-700'), '⚙ CALC')}
      {u.calc && u.factory && <div style={{ height: 2 }} />}
      {u.factory && chip(tok('warning-600'), '🏭 FACTORY')}
      {!u.calc && !u.factory && <span style={{ fontSize: 'var(--ac-font-size-2xs)', color: 'var(--ac-slate-700)', border: '1px solid var(--ac-slate-200)', borderRadius: 'var(--ac-radius-xs)', padding: '1px 6px' }}>display</span>}
    </>
  );
}

const CLS: Record<DdClass, [string, string]> = {
  PC1: ['var(--ac-slate-625)', 'PC1 client-provided'], PC2: ['var(--ac-primary-700)', 'PC2 client-observable'], PC3: ['var(--ac-slate-700)', 'PC3 catalogue'],
  PC4: ['var(--ac-warning-600)', 'PC4 unvalidated'], PC5: ['var(--ac-danger-800)', 'PC5 embedded'],
};
export const ClassChip = ({ cls }: { cls: DdClass }) => chip(CLS[cls][0], CLS[cls][1]);

const label = (id: string) => sectionById(id)?.label ?? id;
const LINK: CSSProperties = {
  color: 'var(--ac-blue)', fontWeight: 'var(--ac-font-weight-semibold)', background: 'none', border: 0, borderBottom: '1px dotted var(--ac-blue)', padding: 0, cursor: 'pointer',
};
const Link = ({ id }: { id: string }) => (
  <button type="button" className="ac-link" title={`Open ${label(id)}`} onClick={() => goSection(id)} style={LINK}>{label(id)} →</button>
);
const NOTE: CSSProperties = { fontSize: 'var(--ac-font-size-xs)', color: 'var(--ac-neutral-700)', marginTop: 2 };
/** "Editable in": here, derived, a link to the section that owns the control, or nowhere. */
export function EditCell({ e }: { e: DdEdit }) {
  if (e === 'here') return <span style={{ color: 'var(--ac-teal-725)', fontWeight: 'var(--ac-font-weight-semibold)' }}>✎ here</span>;
  if (e === 'derived') return <span style={{ color: 'var(--ac-slate-700)' }}>∑ derived</span>;
  if (typeof e === 'object') return <><Link id={e.sec} />{e.also && <div style={{ marginTop: 2 }}><Link id={e.also} /></div>}{e.note && <div style={NOTE}>{e.note}</div>}</>;
  return <span style={{ color: 'var(--ac-danger-800)', fontWeight: 'var(--ac-font-weight-semibold)' }}>NOWHERE</span>;
}

function write(f: NonNullable<DdRow['ed']>['field'], which: 'a' | 't', v: string): void {
  if (f.kind === 'coef') setCoef(f.key, v);
  else if (f.kind === 'fg') setFgParam(f.key, v);
  else if (f.kind === 'qual') setQualityAnchor(f.i, which === 'a' ? 1 : 2, v);
  else setAnchor(f.kind === 'dora' ? 'DORA_ANCHORS' : 'THROUGHPUT_ANCHORS', f.id, which === 'a' ? 'asis' : 'target', v);
}
/** An anchor editor: amber and bold once it differs from its default. */
const numStyle = (edited: boolean): CSSProperties => ({
  width: 62, textAlign: 'center', fontSize: 'var(--ac-font-size-sm-plus)', border: `1px solid ${edited ? 'var(--ac-warning-600)' : 'var(--ac-slate-200)'}`,
  borderRadius: 'var(--ac-radius-sm-plus)', fontWeight: edited ? 'var(--ac-font-weight-bold)' : undefined, color: edited ? 'var(--ac-warning-750)' : undefined,
});
function Num({ r, which }: { r: DdRow; which: 'a' | 't' }) {
  const ed = r.ed!, val = which === 'a' ? ed.a : ed.t, dflt = which === 'a' ? ed.da : ed.dt, edited = dflt !== undefined && +(val as number) !== +dflt;
  return (
    <input type="number" step="any" aria-label={`${r.l}${which === 't' ? ' target' : ''}`} title={dflt !== undefined ? `default ${dflt}` : ''} value={val as number}
      onChange={(e) => write(ed.field, which, e.target.value)}
      style={numStyle(edited)} />
  );
}
/** "Value": the live value, or the editor(s) (as-is → target for the anchors). */
export function ValueCell({ r }: { r: DdRow }) {
  if (!r.ed) return <>{r.v === null ? '—' : r.v}</>;
  if (r.ed.t === null) return <Num r={r} which="a" />;
  return <><Num r={r} which="a" /> <span style={{ color: 'var(--ac-slate-700)' }}>→</span> <Num r={r} which="t" /><div style={{ fontSize: 'var(--ac-font-size-2xs)', color: 'var(--ac-neutral-700)', textTransform: 'uppercase', marginTop: 2 }}>as-is → target</div></>;
}

const STATE: Record<DdStatus, [string, string]> = { open: ['var(--ac-slate-700)', 'OPEN'], requested: ['var(--ac-warning-600)', 'REQUESTED'], confirmed: ['var(--ac-teal-700)', 'CONFIRMED'], disputed: ['var(--ac-danger-800)', 'DISPUTED'], waived: ['var(--ac-slate-625)', 'WAIVED'] };
/** "State": chip + selector. A row validated in the assumptions register reads confirmed. */
export function StateCell({ r, st }: { r: DdRow; st: DdStatus }) {
  const shown = r.ok ? 'confirmed' : st;
  return (
    <>{chip(STATE[shown][0], STATE[shown][1])}{' '}
      <select aria-label={`State of ${r.l}`} style={{ width: 'auto', fontSize: 'var(--ac-font-size-xs)' }} value={shown} onChange={(e) => setDdState(r.id, e.target.value as DdStatus)}>
        {DD_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
      </select></>
  );
}

/** "€ weight": measured euro impact of a +20 % change, "€0 here", n/m (not reachable) or a dash before any measurement. */
export function WeightCell({ fresh, w }: { fresh: boolean; w: number | null }) {
  if (!fresh) return <span style={{ color: 'var(--ac-neutral-700)' }}>—</span>;
  if (w == null) return <span style={{ color: 'var(--ac-danger-800)' }} title="Not reachable without refactoring the calculation path">n/m</span>;
  if (w < 1) return <span style={{ color: 'var(--ac-slate-700)' }} title="Zero measured impact in this configuration: the element drives the display only, or the module that consumes it is switched off for this case.">€0 here</span>;
  return <strong>{fmtK(w)}</strong>;
}
