import { useViewKind, useViewScope } from '@/store/viewScope';
import { goSection, useUi } from '../uiState';
import { followsView, sectionKind } from './sectionScope';

/**
 * True when the open section follows the View and the Wave or the Unit in view holds no planned product (F-B81): `SectionFrame` then shows the
 * empty state instead of its zones (the section keeps its own title and banner; an input section keeps its in-place editor below).
 */
export function useEmptyView(): boolean {
  const v = useViewKind(), id = useUi((s) => s.activeSection);
  return v.multi && v.empty && v.kind !== 'product' && followsView(sectionKind(id));
}

/**
 * The empty state of a section that follows the View when the Wave or the Unit in view holds no planned product (docs/VUE_AGREGEE.md § 2.2): no
 * aggregate (nothing to add up), the reason and where to fix it.
 */
export function EmptyScope() {
  const v = useViewScope(), unit = v.kind === 'unit', n = v.excludedIds.length;
  return (
    <div data-empty-scope={v.kind}>
      <p><strong>{unit ? `Unit ${v.label}` : `Wave ${v.label}`} has no planned product</strong>: there is nothing to aggregate in this view
        {n > 0 ? ` (${n} of its products ${n > 1 ? 'are' : 'is'} archived or without a wave)` : ''}.</p>
      <p className="ac-muted">{unit
        ? <>Give products this owning unit (or one of its sub-units) in{' '}
          <button type="button" className="ac-link" onClick={() => goSection('organisation')}>🏢 Organisation</button>, or show the Portfolio.</>
        : <>Place products in this wave in{' '}
          <button type="button" className="ac-link" onClick={() => goSection('waves')}>🌊 Waves</button>, or show the Portfolio.</>}</p>
    </div>
  );
}
