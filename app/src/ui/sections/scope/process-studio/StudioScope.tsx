import { useId } from 'react';
import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { applyOverrideToCommon, clearProductOverride, giveOwnProcess } from '@/controllers/productOverrides';
import { scopeUnits } from '@/domain/audit';
import { editsCommon } from '@/store/commonEdit';
import { usePortfolio } from '@/store/hooks';
import { useOrgSelector } from '@/store/orgHooks';
import { useActiveProductId, useProducts } from '@/store/portfolioHooks';
import { toast } from '@/ui/uiState';
import { setStudio } from './view';

export interface Lens { id: string; name: string; activities: number }

/**
 * Whose process the 🗺️ Process studio shows and edits (owner's request 2026-11-13): the Portfolio's common process, or a Product's — which shares the
 * common process or holds its own variant (instantiated from the common one, made the common one, or dropped to share it again; each one undoable
 * step). An organisation unit (or shared service) is a lens: the views keep the activities its teams do. With two products or more the choices
 * are the top bar's Show, so the whole app follows; a single case keeps its lens in the section.
 */
export function StudioScope({ lens }: { lens: Lens | null }) {
  const id = useId(), products = useProducts().filter((p) => !p.archived), active = useActiveProductId(), multi = products.length > 1;
  const common = usePortfolio(editsCommon), org = useOrgSelector(scopeUnits);
  const product = products.find((p) => p.id === active), own = !!product && product.overrides.BPMN !== undefined;
  const sharing = products.filter((p) => p.overrides.BPMN === undefined).length;
  const instantiate = () => {
    if (product && giveOwnProcess(product.id)) toast(`${product.name} has its own process now (Ctrl+Z undoes)`);
  };
  const promote = () => { if (product && applyOverrideToCommon(product.id, 'BPMN')) toast(`${product.name}'s process is the common one now (Ctrl+Z undoes)`); };
  const drop = () => { if (product && clearProductOverride(product.id, 'BPMN')) toast(`${product.name} shares the common process again (Ctrl+Z undoes)`); };
  const pickLens = (u: string) => {
    if (multi) { if (u) setDisplayScope({ kind: 'unit', id: u }); else setDisplayScope({ kind: 'portfolio' }); }
    else setStudio({ unit: u || null });
  };
  return (
    <section className="ac-studio-scope-bar" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ac-studio-eyebrow">Whose process</h2>
      <div className="ac-studio-scope-row">
        {multi && (
          <div role="group" aria-label="Process of" className="ac-studio-seg">
            <button type="button" aria-pressed={common} onClick={() => setDisplayScope({ kind: 'portfolio' })}>Portfolio</button>
            <button type="button" aria-pressed={!common} onClick={() => showProduct(active)}>Product</button>
          </div>
        )}
        {multi && !common && (
          <label className="ac-studio-field"><span className="ac-sr">Product</span>
            <select value={active} onChange={(e) => showProduct(e.target.value)}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.overrides.BPMN !== undefined ? ' (own process)' : ''}</option>)}
            </select>
          </label>
        )}
        <label className="ac-studio-field ac-studio-lens-pick">Organisation lens
          <select value={lens?.id ?? ''} onChange={(e) => pickLens(e.target.value)}>
            <option value="">Every unit</option>
            {org.services.length > 0 && <optgroup label="Shared services">{org.services.map((u) => <option key={u.id}
              value={u.id}>{u.name}</option>)}</optgroup>}
            <optgroup label="Units">{org.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</optgroup>
          </select>
        </label>
      </div>
      <p className="ac-studio-scope-line" role="status">
        {!multi ? <span>The case&apos;s own process.</span>
          : common ? <span>Editing the <strong>common process</strong>, shared by {sharing} of {products.length} products; the others hold their own.</span>
            : own ? <>
              <span><strong>{product!.name}</strong> holds its own process (a variant of the common one).</span>
              <button type="button" onClick={promote}>Make it the common process</button>
              <button type="button" onClick={drop}>Share the common process again</button>
            </> : <>
              <span><strong>{product?.name}</strong> shares the common process: an edit here changes it for every product that shares it.</span>
              <button type="button" onClick={instantiate}>Give {product?.name} its own process</button>
            </>}
      </p>
      {lens && <p className="ac-studio-lens" role="status"><strong>Lens: {lens.name}</strong>
        <span>{lens.activities} in-scope activit{lens.activities === 1 ? 'y' : 'ies'} done by its teams — the other activities are hidden in Map, Phase focus,
          Activities and the RACI.</span>
        <button type="button" onClick={() => pickLens('')}>Remove the lens</button></p>}
    </section>
  );
}
