import { resetToCommon } from '@/controllers/productOverrides';
import { subsetFieldOfRef } from '@/store/commonEdit';
import { useKeepers } from '@/store/commonEditHooks';
import { toast } from '../uiState';

/**
 * In the in-place editor of the common values ("Change: All products", Portfolio / Wave view), next to one field: the products that keep their own value
 * there, so an edit of the common value does not reach them — "2 products override this: A, B — they keep their value" — with a "Back to shared" per
 * product (an undoable step). Nothing anywhere else, nor when every product inherits the field.
 */
export function KeepersNotice({ refKey, label }: { refKey: string; label: string }) {
  const keepers = useKeepers(refKey);
  if (!keepers.length) return null;
  const n = keepers.length, names = keepers.map((k) => k.name).join(', ');
  const reset = (id: string, name: string) => { if (resetToCommon(id, refKey)) toast(`${label}: ${name} back to shared`); };
  return (
    <span className="ac-ovr ac-keepers" data-keepers={n} role="note" aria-label={`${label}: ${n} product${n > 1 ? 's override' : ' overrides'} this`}>
      <span className="ac-keepers-text">
        {n} product{n > 1 ? 's' : ''} override{n > 1 ? '' : 's'} this: {names} — {n > 1 ? 'they keep their' : 'it keeps its'} value</span>
      {keepers.map((k) => (
        <button key={k.id} type="button" className="ac-ovr-btn" aria-label={`Back to shared: ${label} for ${k.name}`} onClick={() => reset(k.id, k.name)}>Back
          to shared: {k.name}</button>
      ))}
    </span>
  );
}

/**
 * `KeepersNotice` of a form field (`values.<id>` / `checked.<id>`). A Knowledge Hub field that belongs to the knowledge subset is left to the badge of
 * its box (`SubsetBadge`), which names the same products; an address off the whitelist shows nothing.
 */
export function FieldKeepers({ kind, id, label }: { kind: 'values' | 'checked'; id: string; label: string }) {
  const ref = `${kind}.${id}`;
  return subsetFieldOfRef(ref) ? null : <KeepersNotice refKey={ref} label={label} />;
}
