import { useRef, useState } from 'react';
import { setProductKnowledge } from '@/controllers/productOverrides';
import type { KnowledgeDomain } from '@/domain/portfolio';
import { useActiveProduct } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';
import { Panel } from '@/ui/widgets/cards';
import { SubsetBadge } from './SubsetBadge';

interface Draft { key: number; label: string; weight: string }
const num = (w: string): number => { const n = parseFloat(w); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number): string => String(Math.round(n * 100) / 100);

/** The editor itself, remounted (by `DomainsEditor`) whenever the product or its saved domains change, so its draft always starts from the document. */
function Editor({ id, name, saved }: { id: string; name: string; saved: KnowledgeDomain[] }) {
  const next = useRef(saved.length);
  const [rows, setRows] = useState<Draft[]>(saved.map((d, i) => ({ key: i, label: d.label, weight: String(d.weightPct) })));
  const [error, setError] = useState('');
  const total = rows.reduce((a, r) => a + num(r.weight), 0), left = Math.round((100 - total) * 100) / 100;
  const edit = (key: number, p: Partial<Draft>) => { setError(''); setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r))); };
  const apply = () => {
    if (rows.some((r) => !r.label.trim())) { setError('Every domain must have a label.'); return; }
    if (rows.some((r) => !(num(r.weight) >= 0))) { setError('Weights must be numbers greater than or equal to 0.'); return; }
    const domains = rows.map((r) => ({ label: r.label.trim(), weightPct: num(r.weight) }));
    if (setProductKnowledge(id, { domains })) { setError(''); toast(`Knowledge domains saved for ${name}`); return; }
    setError(Math.abs(left) > 1e-6 ? `Weights must add up to 100% (${left > 0 ? `${fmt(left)}% left` : `${fmt(-left)}% too much`}): change refused.` : 'Change refused.');
  };
  return (
    <>
      <p className="ac-muted">Domains kept for {name} (documentation, code, tickets, operating procedures, architecture decisions…). The weight spreads the
        curation effort; it does not act on the multiplier, which is driven by the CC level. Weights must add up to 100%.</p>
      {rows.length > 0 && (
        <table className="ac-table">
          <caption className="ac-sr">Knowledge domains of {name}</caption>
          <thead><tr><th scope="col">Domain</th><th scope="col">Weight (%)</th><th scope="col">Action</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td><input type="text" aria-label={`Domain label ${i + 1}`} value={r.label} onChange={(e) => edit(r.key, { label: e.target.value })} /></td>
                <td><input type="number" min={0} max={100} step={5} aria-label={`Domain weight ${i + 1} (%)`} value={r.weight}
                  onChange={(e) => edit(r.key, { weight: e.target.value })} /></td>
                <td><button type="button" aria-label={`Remove domain ${r.label || i + 1}`}
                  onClick={() => { setError(''); setRows((rs) => rs.filter((x) => x.key !== r.key)); }}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p role="status" aria-live="polite" data-remaining={left}>{rows.length ? (left === 0 ? 'Total: 100% — ready to save.' : left > 0 ? `${fmt(left)}% left to allocate.` : `${fmt(-left)}% too much.`) : 'No domain: the curation effort is not split.'}</p>
      {error && <p role="alert" style={{ color: 'var(--ac-danger-800)' }}>{error}</p>}
      <div className="ac-pf-actions" role="group" aria-label="Domain actions">
        <button type="button"
          onClick={() => { setError(''); setRows((rs) => [...rs, { key: next.current++, label: '', weight: String(Math.max(0, left)) }]); }}>Add a domain</button>
        <button type="button" disabled={!rows.length} onClick={apply}>Save the domains</button>
        <button type="button" disabled={!saved.length} onClick={() => { if (setProductKnowledge(id, {}, ['domains'])) toast(`Domains removed for ${name}`); }}>Remove all domains</button>
      </div>
    </>
  );
}

/** "Knowledge domains": the free list of domains (label + weight %) of the active product's subset (spec F25b, D-M10). */
export function DomainsEditor() {
  const p = useActiveProduct(), saved = p.knowledge.domains ?? [];
  return (
    <Panel title="Knowledge domains" aside={<SubsetBadge field="domains" label="Knowledge domains" />}>
      <Editor key={`${p.id}|${JSON.stringify(saved)}`} id={p.id} name={p.name} saved={saved} />
    </Panel>
  );
}
