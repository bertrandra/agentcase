import { useId } from 'react';
import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { scopeUnits, type AuditScopeKind } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { setAuditUnit } from '@/store/auditScope';
import { useOrgSelector } from '@/store/orgHooks';
import { useActiveProductId, useProducts } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';

const KINDS: { kind: AuditScopeKind; label: string }[] = [
  { kind: 'portfolio', label: 'Portfolio' }, { kind: 'product', label: 'Product' }, { kind: 'service', label: 'Shared service' },
  { kind: 'unit', label: 'Org unit' },
];
const units = scopeUnits;
const PICK_LABEL: Record<AuditScopeKind, string> = { portfolio: 'Portfolio', product: 'Product audited', service: 'Shared service audited',
  unit: 'Organisation unit audited' };

/**
 * The audit scope (owner's request 2026-11-13): what is audited — the Portfolio (the common process), a Product, a Shared service or an
 * Organisation unit — then which one. With two products or more the choice is the top bar's "Show" (it sets it, and the whole app follows); a
 * single case keeps it here. A shared service or a unit lays its own audit over the common process (or the case) and narrows every view to the
 * work of its teams. The line below says where values are recorded and what is inherited.
 */
export function ScopeBar({ data }: { data: AuditViewData }) {
  const id = useId(), products = useProducts().filter((p) => !p.archived), active = useActiveProductId(), org = useOrgSelector(units);
  const s = data.scope, multi = products.length > 1;
  const offered: Record<AuditScopeKind, boolean> = { portfolio: multi, product: true, service: org.services.length > 0, unit: org.units.length > 0 };
  const kinds = KINDS.filter((k) => offered[k.kind]);
  const pickKind = (k: AuditScopeKind) => {
    if (k === 'portfolio') { setAuditUnit(null); if (setDisplayScope({ kind: 'portfolio' })) toast('Audit scope: Portfolio'); return; }
    if (k === 'product') {
      setAuditUnit(null); showProduct(active);
      toast(`Audit scope: ${products.find((p) => p.id === active)?.name ?? 'this case'}`); return;
    }
    const first = (k === 'service' ? org.services : org.units)[0];
    if (first) pickUnit(first.id, first.name);
  };
  /** A unit: with 2+ products it is what "Show" shows (the whole app follows); a single case keeps the choice in the section. */
  const pickUnit = (u: string, name: string) => {
    if (multi) { setAuditUnit(null); if (!setDisplayScope({ kind: 'unit', id: u })) return; } else setAuditUnit(u);
    toast(`Audit scope: ${name}`);
  };
  const pickItem = (v: string) => {
    if (s.kind === 'product') { setAuditUnit(null); if (showProduct(v)) toast(`Audit scope: ${products.find((p) => p.id === v)?.name ?? v}`); return; }
    pickUnit(v, [...org.services, ...org.units].find((u) => u.id === v)?.name ?? v);
  };
  const items: { id: string; name: string }[] = s.kind === 'product' ? products : s.kind === 'service' ? org.services : s.kind === 'unit' ? org.units : [];
  const own = s.own?.size ?? 0;
  return (
    <section className="ac-audit-scope" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ac-audit-eyebrow">Audit scope</h2>
      <div className="ac-audit-scope-row">
        <div role="group" aria-label="What is audited" className="ac-audit-seg">
          {kinds.map((k) => (
            <button key={k.kind} type="button" aria-pressed={s.kind === k.kind} onClick={() => pickKind(k.kind)}>{k.label}</button>
          ))}
        </div>
        {items.length > (s.kind === 'product' && !multi ? 1 : 0) && (
          <label className="ac-audit-scope-pick">
            <span className="ac-sr">{PICK_LABEL[s.kind]}</span>
            <select value={s.kind === 'product' ? active : s.id} onChange={(e) => pickItem(e.target.value)}>
              {items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        )}
        {s.kind === 'product' && !multi && <strong>{s.name}</strong>}
      </div>
      <p className="ac-audit-scope-line" role="status">
        <span>Recording into <strong>{s.name}</strong></span>
        {s.activities && <span>{s.activities.size} activit{s.activities.size === 1 ? 'y' : 'ies'} · {data.actors.length} role(s) in scope</span>}
        {s.serves.length > 0 && <span>Serves {s.serves.join(', ')}</span>}
        {s.own && <span><span className="ac-audit-key" data-key="own" aria-hidden="true" />{own} element(s) with their own audit</span>}
        {s.own && <span><span className="ac-audit-key" data-key="inherited" aria-hidden="true" />the others inherited from {s.inheritedFrom}</span>}
        {s.activities?.size === 0 && <span>No team of this unit serves a product yet: nothing is in scope.</span>}
      </p>
    </section>
  );
}
