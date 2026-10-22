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
    if (rows.some((r) => !r.label.trim())) { setError('Chaque domaine doit avoir un libellé.'); return; }
    if (rows.some((r) => !(num(r.weight) >= 0))) { setError('Les poids doivent être des nombres supérieurs ou égaux à 0.'); return; }
    const domains = rows.map((r) => ({ label: r.label.trim(), weightPct: num(r.weight) }));
    if (setProductKnowledge(id, { domains })) { setError(''); toast(`Domaines de connaissance enregistrés pour ${name}`); return; }
    setError(Math.abs(left) > 1e-6 ? `Les poids doivent totaliser 100 % (${left > 0 ? `il reste ${fmt(left)} %` : `${fmt(-left)} % de trop`}) : modification refusée.` : 'Modification refusée.');
  };
  return (
    <>
      <p className="ac-muted">Domaines retenus pour {name} (documentation, code, tickets, procédures d’exploitation, décisions d’architecture…). Le poids répartit la charge de curation ; il n’agit pas sur le multiplicateur, piloté par le niveau CC. Les poids doivent totaliser 100 %.</p>
      {rows.length > 0 && (
        <table className="ac-table">
          <caption className="ac-sr">Domaines de connaissance de {name}</caption>
          <thead><tr><th scope="col">Domaine</th><th scope="col">Poids (%)</th><th scope="col">Action</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key}>
                <td><input type="text" aria-label={`Libellé du domaine ${i + 1}`} value={r.label} onChange={(e) => edit(r.key, { label: e.target.value })} /></td>
                <td><input type="number" min={0} max={100} step={5} aria-label={`Poids du domaine ${i + 1} (%)`} value={r.weight} onChange={(e) => edit(r.key, { weight: e.target.value })} /></td>
                <td><button type="button" aria-label={`Retirer le domaine ${r.label || i + 1}`} onClick={() => { setError(''); setRows((rs) => rs.filter((x) => x.key !== r.key)); }}>Retirer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p role="status" aria-live="polite" data-remaining={left}>{rows.length ? (left === 0 ? 'Total : 100 % — prêt à enregistrer.' : left > 0 ? `Reste ${fmt(left)} % à répartir.` : `${fmt(-left)} % de trop.`) : 'Aucun domaine : la charge de curation n’est pas ventilée.'}</p>
      {error && <p role="alert" style={{ color: '#8F3237' }}>{error}</p>}
      <div className="ac-pf-actions" role="group" aria-label="Actions sur les domaines">
        <button type="button" onClick={() => { setError(''); setRows((rs) => [...rs, { key: next.current++, label: '', weight: String(Math.max(0, left)) }]); }}>Ajouter un domaine</button>
        <button type="button" disabled={!rows.length} onClick={apply}>Enregistrer les domaines</button>
        <button type="button" disabled={!saved.length} onClick={() => { if (setProductKnowledge(id, {}, ['domains'])) toast(`Domaines retirés pour ${name}`); }}>Retirer tous les domaines</button>
      </div>
    </>
  );
}

/** "Domaines de connaissance": the free list of domains (label + weight %) of the active product's subset (spec F25b, D-M10). */
export function DomainsEditor() {
  const p = useActiveProduct(), saved = p.knowledge.domains ?? [];
  return (
    <Panel title="Domaines de connaissance" aside={<SubsetBadge field="domains" label="Domaines de connaissance" />}>
      <Editor key={`${p.id}|${JSON.stringify(saved)}`} id={p.id} name={p.name} saved={saved} />
    </Panel>
  );
}
