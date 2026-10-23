import { useMemo, useState } from 'react';
import { setProductKnowledge } from '@/controllers/productOverrides';
import { hubView } from '@/domain/tuneB/hub';
import { useCtx } from '@/store/hooks';
import { useKnowledgeView } from '@/store/knowledgeHooks';
import { useActiveProduct, useIsMulti } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';
import { Callout, Panel } from '@/ui/widgets/cards';
import { NumField } from '@/ui/widgets/CommitField';
import { HubSettings } from '@/ui/widgets/HubSettings';
import { DomainsEditor } from './DomainsEditor';
import { SubsetBadge } from './SubsetBadge';

/** "Product: X (n own fields)": which product the section edits, and how much of its subset is its own. */
export function SubsetBanner() {
  const multi = useIsMulti(), p = useActiveProduct();
  if (!multi) return null;
  const n = Object.values(p.knowledge).filter((v) => v !== undefined).length;
  return (
    <p className="ac-prod-banner" role="note" data-overrides={n}>
      Knowledge Hub subset of: <strong>{p.name}</strong> ({n ? `${n} own field${n > 1 ? 's' : ''} of the product` : 'everything is inherited from the common hub'})
      <span className="ac-muted"> — “This product only” (top bar) creates the product’s own value; “All products” edits the common hub, which inheriting products follow.</span>
    </p>
  );
}

/** The engagement context caps the target CC: shown next to the product's target (spec F25d). */
function CapNote() {
  const c = useCtx(), h = useMemo(() => hubView(c), [c]);
  if (h.locked) return <Callout kind="error">Engagement context {h.context}: the hub is locked for this product.</Callout>;
  return <p className="ac-muted" data-cap={h.maxCC}>Context {h.context} cap: CC{h.maxCC}. Requested target: CC{h.rawTarget}{h.clamped ? ` — capped at CC${h.target}` : ''}.</p>;
}

/** "Knowledge transfer preparation": ktLeadMonths of the active product, >= 0 (spec F28). Shifts only the KT setup cost in the consolidation. */
function LeadField() {
  const p = useActiveProduct(), { diagnostics } = useKnowledgeView(), [error, setError] = useState('');
  const clamp = diagnostics.find((d) => d.code === 'kt-lead-clamped' && d.productId === p.id);
  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isInteger(n) || n < 0) { setError('The preparation is a whole number of months, 0 or more.'); return; }
    setError('');
    if (setProductKnowledge(p.id, { ktLeadMonths: n })) toast(`Knowledge transfer preparation of ${p.name}: ${n} months`);
  };
  return (
    <Panel title="Knowledge transfer preparation (months before the wave)" aside={<SubsetBadge field="ktLeadMonths" label="Knowledge transfer preparation" />}>
      <div className="ac-form-row">
        <NumField label="Knowledge transfer preparation (months before the wave)" value={p.knowledge.ktLeadMonths ?? 0} min={0} step={1} onCommit={commit}
          hint="0 = the KT setup cost falls at the start of the product" />
      </div>
      <p className="ac-muted">With k months, only the setup cost of the transfer (ingestion, initial curation) is placed k months before the product starts: the next wave is prepared during the current one. Benefits still start from month 0.</p>
      {error && <p role="alert" style={{ color: 'var(--ac-danger-800)' }}>{error}</p>}
      {clamp && <Callout kind="warn">{clamp.message}</Callout>}
    </Panel>
  );
}

/** What the Knowledge Hub section adds with 2+ products: the target cap, the domains, the preparation and the shared hub settings. */
export function MultiPanels() {
  const multi = useIsMulti();
  if (!multi) return null;
  return (
    <>
      <CapNote />
      <DomainsEditor />
      <LeadField />
      <HubSettings />
    </>
  );
}
