import { useState } from 'react';
import { editToolCatalog } from '@/controllers/audit';
import { catalogUpdated, shippedTool, SHIPPED_AS_OF, SHIPPED_REVIEW, type CatalogTool } from '@/domain/audit';
import type { AuditViewData } from '@/store/auditHooks';
import { toast } from '@/ui/uiState';
import { Callout } from '@/ui/widgets/cards';

const join = (xs: string[]): string => xs.join(', ') || '—';
const CHECK = { verified: 'Verified', partial: 'Partly verified', unverified: 'Not verified' } as const;
/** How a shipped entry was checked: status, date and note (a blank fact means it could not be confirmed). */
const checkOf = (t: CatalogTool | undefined): string => (t?.verification
  ? `${CHECK[t.verification]} ${t.asOf ?? ''}${t.note ? `: ${t.note}` : ''}` : '');
function stateOf(t: CatalogTool, own: boolean): string {
  if (t.retired) return 'Retired for this case';
  if (t.clientSpecific) return 'Client-specific';
  return own ? 'Edited for this case' : 'Shipped';
}

/**
 * The tool catalogue (F-B23, F-B26, D-B12): the shipped, dated catalogue (each entry with its public source and how it was checked; verified
 * against public sources, the owner's sign-off pending) with the case's own entries laid
 * over it. Retire a tool for this case, restore it, or remove a client-specific tool; the changes are undoable edits of the case. A newer shipped
 * catalogue never overwrites them; "catalogue updated since this audit" when the dates differ.
 */
export function Catalogue({ data }: { data: AuditViewData }) {
  const [q, setQ] = useState(''), own = new Set(data.audit.caseTools.map((t) => t.code)), s = q.trim().toLowerCase();
  const rows = data.catalog.filter((t) => !s || `${t.name} ${t.vendor ?? ''} ${t.category ?? ''} ${t.capabilities.join(' ')}`.toLowerCase().includes(s));
  const act = (op: Parameters<typeof editToolCatalog>[0], ok: string) => toast(editToolCatalog(op) ? `${ok} (Ctrl+Z undoes)` : 'Refused');
  return (
    <>
      <h2 id="ac-audit-cat-h">Tool catalogue ({data.catalog.length} tools, as of {SHIPPED_AS_OF})</h2>
      <Callout kind="warn">{SHIPPED_REVIEW}</Callout>
      {catalogUpdated(data.audit) && <Callout kind="note">Catalogue updated since this audit: the case&apos;s entries date from {data.audit.catalogAsOf},
        the shipped catalogue from {SHIPPED_AS_OF}. The case keeps its own entries.</Callout>}
      <div className="ac-form-row"><label>Search <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Name, vendor, category, capability" />
      </label><span className="ac-muted" aria-live="polite">{rows.length} tools</span></div>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" aria-labelledby="ac-audit-cat-h">
          <thead><tr><th scope="col">Tool</th><th scope="col">Category</th><th scope="col">Capabilities</th><th scope="col">AI features</th>
            <th scope="col">Integration</th><th scope="col">Hosting</th><th scope="col">Licence</th><th scope="col">Source</th><th scope="col">State</th>
            <th scope="col"><span className="ac-sr">Actions</span></th></tr></thead>
          <tbody>{rows.map((t) => {
            const ship = shippedTool(t.code), src = t.source ?? ship?.source, check = checkOf(ship);
            return (
              <tr key={t.code}>
                <th scope="row">{t.name}<span className="ac-muted"> · {t.vendor ?? '—'}</span></th>
                <td>{t.category ?? '—'}</td><td>{join(t.capabilities)}</td><td>{join(t.aiFeatures)}</td><td>{join(t.integration)}</td><td>{join(t.hosting)}</td>
                <td>{join(t.licence)}</td>
                <td>{src ? <span className="ac-audit-src">{src}</span> : '—'}{check && <span className="ac-muted"> · {check}</span>}</td>
                <td>{stateOf(t, own.has(t.code))}</td>
                <td>
                  <button type="button" aria-label={`${t.retired ? 'Restore' : 'Retire'} ${t.name} for this case`}
                    onClick={() => act({ kind: 'retire', code: t.code, retired: !t.retired }, `${t.name} ${t.retired ? 'restored' : 'retired'}`)}>
                    {t.retired ? 'Restore' : 'Retire'}</button>
                  {own.has(t.code) && <button type="button" aria-label={`Remove the case's entry for ${t.name}`}
                    onClick={() => act({ kind: 'remove', code: t.code }, `${t.name}: the case's entry removed`)}>Remove entry</button>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </>
  );
}
