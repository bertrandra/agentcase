import { useMemo } from 'react';
import { KNOWLEDGE_SUBSET_FIELDS } from '@/domain/portfolio/fields';
import { usePortfolio } from '@/store/hooks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { scopeRows, type ScopeRow } from './docModel';

const TONE: Record<string, 'teal' | 'blue' | 'amber' | 'grey'> = { overridable: 'teal', 'own (every product)': 'blue' };

/** Common → product: where every key of a case lives in the portfolio, and how many products override it right now. */
export function OverridesTab() {
  const pf = usePortfolio((p) => p), rows = useMemo(() => scopeRows(pf), [pf]);
  const own = rows.filter((r) => r.scope !== 'common only'), common = rows.filter((r) => r.scope === 'common only');
  return (
    <div>
      <h2>Overridable keys <span className="ac-muted">— {own.length} keys a product can hold for itself, {common.length} common only</span></h2>
      <p className="ac-muted">A product's effective case = common values &lt; hub &lt; its overrides &lt; its knowledge subset &lt; its own entry team
        (<code>resolveProduct</code>). Only the whitelist <code>OVERRIDABLE_KEYS</code> can be overridden, form fields one by one; an override is
        sparse (only a value that differs is stored). Every other key — rate card, <code>MODEL</code> (so the discount
        rate <code>MODEL.CASE.discountRate</code>:
        one NPV basis for the whole portfolio), <code>COEF</code>, personas, navigation, snapshots, themes — is common: an edit of it reaches every
        product. A file that overrides anything else is corrected on open (the override is dropped, with a note).</p>
      <DataTable<ScopeRow> caption="Keys a product can hold for itself" rows={own} rowKey={(r) => r.key} columns={[
        { key: 'k', header: 'Key', render: (r) => <code>{r.key}</code> },
        { key: 's', header: 'Per product', render: (r) => <Badge tone={TONE[r.scope] ?? 'amber'}>{r.scope}</Badge> },
        { key: 'n', header: 'Products holding their own now', align: 'center', render: (r) => `${r.overriddenBy} / ${pf.products.length}` },
      ]} />
      <p>Knowledge subset fields (each absent = inherited from the hub): {Object.keys(KNOWLEDGE_SUBSET_FIELDS).map((k) => <Badge key={k}>{k}</Badge>)}</p>
      <h3>Common only <span className="ac-muted">({common.length})</span></h3>
      <p className="ac-dm-tags">{common.map((r) => <Badge key={r.key} tone="grey">{r.key}</Badge>)}</p>
    </div>
  );
}
