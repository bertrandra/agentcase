import { useState } from 'react';
import { setActiveProduct } from '@/controllers/product';
import { knowledgeTotals, type KnowledgeRow } from '@/domain/portfolio';
import { useKnowledgeView } from '@/store/knowledgeHooks';
import { useActiveProductId, useWaves } from '@/store/portfolioHooks';
import { fmtEurK } from '@/ui/format';
import { toast } from '@/ui/uiState';

const COLS: [string, string][] = [
  ['Produit', 'Cliquer (ou Entrée) pour en faire le produit actif'], ['Vague', ''], ['Hub', 'Le produit utilise-t-il le hub ?'], ['CC initial → cible', 'Niveau de complétude de contexte : état de départ → cible (plafonnée par le contexte d’engagement)'],
  ['Domaines', 'Domaines de connaissance retenus et leur poids'], ['Mise en place KT', 'Coût unique d’ingestion et de curation initiale'], ['Coût annuel', 'Curation + part d’infrastructure imputée'],
  ['Jours KT évités / an', 'ETP de départ × 0,2 × 15 × réduction du niveau cible'], ['Préparation', 'Mois de préparation avant le démarrage du produit, et mois calendaire où le coût de mise en place tombe'],
  ['Effet du hub', 'Écart d’économies avec le même produit sans hub, sur son horizon'],
];
const dash = '—';
const money = (v: number, on: boolean): string => (on ? fmtEurK(v) : dash);
const domains = (r: KnowledgeRow): string => (r.domains.length ? r.domains.map((d) => `${d.label} ${d.weightPct} %`).join(', ') : dash);

/** F29 — one row per product (clicking a row, or its name button, makes the product active), filterable by wave, with the totals of the rows shown. */
export function KtTable() {
  const { table } = useKnowledgeView(), waves = useWaves(), active = useActiveProductId(), [filter, setFilter] = useState('all');
  const rows = table.rows.filter((r) => filter === 'all' || (filter === 'none' ? r.waveId === null : r.waveId === filter)), tot = knowledgeTotals(rows);
  const waveName = (id: string | null) => waves.find((w) => w.id === id)?.name ?? 'non planifié';
  const pick = (r: KnowledgeRow) => { if (r.productId !== active && setActiveProduct(r.productId)) toast(`Produit actif : ${r.name}`); };
  return (
    <>
      <label className="ac-field"><span className="ac-field-l">Filtrer par vague</span>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrer par vague">
          <option value="all">Toutes les vagues</option>
          {waves.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          <option value="none">Non planifiés</option>
        </select>
      </label>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table ac-pf-table">
          <caption>Knowledge transfer par produit ({rows.length} produit{rows.length > 1 ? 's' : ''})</caption>
          <thead><tr>{COLS.map(([h, t]) => <th key={h} scope="col" title={t || undefined}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className={r.productId === active ? 'is-active' : undefined} data-product={r.productId} onClick={() => pick(r)} style={{ cursor: 'pointer' }}>
                <th scope="row">
                  <button type="button" aria-current={r.productId === active ? 'true' : undefined} aria-label={r.productId === active ? `${r.name} (produit actif)` : `Activer ${r.name}`}
                    onClick={(e) => { e.stopPropagation(); pick(r); }}>{r.name}</button>
                </th>
                <td>{waveName(r.waveId)}</td>
                <td>{r.locked ? 'verrouillé' : r.usesHub ? 'actif' : 'désactivé'}</td>
                <td>{r.usesHub ? `CC${r.asisCC} → CC${r.targetCC}` : dash}{r.usesHub && r.capped && <strong title="La cible demandée dépasse le plafond du contexte"> (plafonnée)</strong>}</td>
                <td>{domains(r)}</td>
                <td style={{ textAlign: 'right' }}>{money(r.setup, r.usesHub)}</td>
                <td style={{ textAlign: 'right' }}>{money(r.annual, r.usesHub)}</td>
                <td style={{ textAlign: 'right' }}>{r.usesHub ? Math.round(r.ktDays) : dash}</td>
                <td>{r.usesHub && r.prepMonth !== null ? `${r.lead} mois (dès le mois ${r.prepMonth})` : dash}</td>
                <td style={{ textAlign: 'right' }}>{money(r.hubDeltaSav, r.usesHub)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={COLS.length}>Aucun produit dans ce filtre.</td></tr>}
          </tbody>
          <tfoot>
            <tr data-total="true">
              <th scope="row">Total</th><td></td><td></td><td></td><td></td>
              <td style={{ textAlign: 'right' }}>{fmtEurK(tot.setup)}</td><td style={{ textAlign: 'right' }}>{fmtEurK(tot.annual)}</td>
              <td style={{ textAlign: 'right' }}>{Math.round(tot.ktDays)}</td><td></td><td style={{ textAlign: 'right' }}>{fmtEurK(tot.hubDeltaSav)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
