import { archiveProduct, duplicateProduct, removeProduct, renameProduct, setActiveProduct, setProductNote, setProductOffset } from '@/controllers/product';
import { overrideRefs } from '@/domain/portfolio';
import type { ProductRow } from '@/store/portfolioHooks';
import { fmtEurK, fmtMonths } from '@/ui/format';
import { toast } from '@/ui/uiState';
import { NumCell } from '@/ui/widgets/CommitField';
import { DraftText } from '@/ui/widgets/DraftText';

/** One product of the table: editable name, wave, offset, base team, state, key indicators of its effective case, note and the P2 commands as buttons. */
export function ProductRowView({ row, index, active, last }: { row: ProductRow; index: number; active: boolean; last: boolean }) {
  const p = row.product, r = row.result, n = overrideRefs(p.overrides).length, who = `produit n°${index + 1}`;
  const act = (ok: boolean, done: string, failed: string) => toast(ok ? done : failed);
  return (
    <tr className={`${active ? 'is-active' : ''}${p.archived ? ' is-archived' : ''}`.trim() || undefined} data-product={p.id}>
      <td>
        <DraftText label={`Nom du ${who}`} value={p.name} onCommit={(v) => act(renameProduct(p.id, v), `Produit renommé : ${v.trim()}`, 'Nom invalide')} />
        {active && <strong> (actif)</strong>}{p.archived && <em> (archivé)</em>}
      </td>
      <td>{row.wave || 'non planifié'}</td>
      <td style={{ textAlign: 'right' }}><NumCell ariaLabel={`Décalage en mois du ${who}`} value={p.offsetMonths} min={0} step={1} width={64} onCommit={(v) => { setProductOffset(p.id, parseInt(v, 10) || 0); }} /></td>
      <td style={{ textAlign: 'right' }} title="Équipe d’entrée propre au produit (ETP)">{r.model.base.etp.toFixed(1)}</td>
      <td title={n ? 'Clés surchargées : voir la section Surcharges' : 'Toutes les valeurs viennent du commun'}>{n ? `${n} surcharge${n > 1 ? 's' : ''}` : 'hérité'}</td>
      <td style={{ textAlign: 'right' }} title={`Économies de l’année ${r.endYear.index} (fin d’horizon) du produit seul`}>{fmtEurK(r.endYear.savings)}</td>
      <td style={{ textAlign: 'right' }} title="Premier mois où la trésorerie cumulée du produit devient positive">{fmtMonths(r.payback)}</td>
      <td><DraftText label={`Note du ${who}`} value={p.note ?? ''} onCommit={(v) => { setProductNote(p.id, v); }} /></td>
      <td>
        <div className="ac-pf-actions" role="group" aria-label={`Actions du ${who}`}>
          <button type="button" disabled={active} aria-label={`Activer ${p.name}`} onClick={() => act(setActiveProduct(p.id), `Produit actif : ${p.name}`, 'Produit introuvable')}>Activer</button>
          <button type="button" aria-label={`Dupliquer ${p.name}`} onClick={() => act(duplicateProduct(p.id) !== null, `${p.name} dupliqué`, 'Limite de 50 produits atteinte')}>Dupliquer</button>
          <button type="button" aria-label={`${p.archived ? 'Restaurer' : 'Archiver'} ${p.name}`} onClick={() => act(archiveProduct(p.id, !p.archived), p.archived ? `${p.name} restauré` : `${p.name} archivé`, 'Action refusée')}>{p.archived ? 'Restaurer' : 'Archiver'}</button>
          <button type="button" disabled={last} aria-label={`Supprimer ${p.name}`} title={last ? 'Le dernier produit ne peut pas être supprimé' : undefined}
            onClick={() => act(removeProduct(p.id), `${p.name} supprimé — Ctrl+Z pour annuler`, 'Le dernier produit ne peut pas être supprimé')}>Supprimer</button>
        </div>
      </td>
    </tr>
  );
}
