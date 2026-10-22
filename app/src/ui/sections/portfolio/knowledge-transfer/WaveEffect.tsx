import { waveEffectsTotal } from '@/domain/portfolio';
import { useKnowledgeView } from '@/store/knowledgeHooks';
import { fmtEurK } from '@/ui/format';
import { Callout } from '@/ui/widgets/cards';

/** F31 — hub effect by wave: the sum, over its products, of the savings gap between each product with and without the hub (`hubView`). */
export function WaveEffect() {
  const { waves } = useKnowledgeView(), tot = waveEffectsTotal(waves);
  return (
    <>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>Somme, par vague, de l’effet du hub de ses produits</caption>
          <thead><tr><th scope="col">Vague</th><th scope="col">Démarrage (mois)</th><th scope="col">Produits</th><th scope="col">Utilisant le hub</th><th scope="col" title="Économies avec le hub moins économies sans le hub, produit par produit, sur l’horizon de chaque produit">Effet du hub</th></tr></thead>
          <tbody>
            {waves.map((w) => <tr key={w.waveId}><th scope="row">{w.name}</th><td style={{ textAlign: 'right' }}>{w.startMonth}</td><td style={{ textAlign: 'right' }}>{w.products}</td><td style={{ textAlign: 'right' }}>{w.users}</td><td style={{ textAlign: 'right' }}>{fmtEurK(w.hubDeltaSav)}</td></tr>)}
            {!waves.length && <tr><td colSpan={5}>Aucune vague : affectez les produits à une vague (section Vagues).</td></tr>}
          </tbody>
          <tfoot><tr><th scope="row">Total des vagues</th><td></td><td style={{ textAlign: 'right' }}>{tot.products}</td><td style={{ textAlign: 'right' }}>{tot.users}</td><td style={{ textAlign: 'right' }}>{fmtEurK(tot.hubDeltaSav)}</td></tr></tfoot>
        </table>
      </div>
      <Callout>Un effet négatif est montré tel quel (le hub coûte plus qu’il ne rapporte, typiquement sur un petit périmètre). Les produits non planifiés n’entrent dans aucune vague.</Callout>
    </>
  );
}
