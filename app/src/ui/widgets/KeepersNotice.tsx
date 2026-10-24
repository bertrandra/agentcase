import { resetToCommon } from '@/controllers/productOverrides';
import { useKeepers } from '@/store/commonEditHooks';
import { toast } from '../uiState';

/**
 * In the in-place editor of the common values ("Edit: All products", Portfolio / Wave view), next to one field: the products that keep their own value
 * there, so an edit of the common value does not reach them — "2 products override this: A, B — they keep their value" — with a "Reset to common" per
 * product (an undoable step). Nothing anywhere else, nor when every product inherits the field.
 */
export function KeepersNotice({ refKey, label }: { refKey: string; label: string }) {
  const keepers = useKeepers(refKey);
  if (!keepers.length) return null;
  const n = keepers.length, names = keepers.map((k) => k.name).join(', ');
  const reset = (id: string, name: string) => { if (resetToCommon(id, refKey)) toast(`${label}: ${name} reset to common`); };
  return (
    <span className="ac-ovr ac-keepers" data-keepers={n} role="note" aria-label={`${label}: ${n} product${n > 1 ? 's' : ''} override this`}>
      <span className="ac-keepers-text">{n} product{n > 1 ? 's' : ''} override{n > 1 ? '' : 's'} this: {names} — {n > 1 ? 'they keep their' : 'it keeps its'} value</span>
      {keepers.map((k) => (
        <button key={k.id} type="button" className="ac-ovr-btn" aria-label={`Reset to common: ${label} for ${k.name}`} onClick={() => reset(k.id, k.name)}>Reset to common: {k.name}</button>
      ))}
    </span>
  );
}

/** `values.<id>` / `checked.<id>` of a form field, the address `KeepersNotice` reads (an address off the whitelist simply shows nothing). */
export const fieldRef = (kind: 'values' | 'checked', id: string): string => `${kind}.${id}`;
