import { useEffect, useSyncExternalStore } from 'react';
import { dismissOpenNotes, getOpenNotes, onOpenNotes } from '@/controllers/openNotes';
import { toast } from '../uiState';

/**
 * "Opened with N corrections": the file just opened had damaged values, replaced by the defaults (docs/ARCHITECTURE.md § 5, file schema). A toast
 * says it once; the banner lists every correction until dismissed. Outside the document and the undo history, like the staleness banner.
 */
export function OpenNotesBanner() {
  const n = useSyncExternalStore(onOpenNotes, getOpenNotes);
  useEffect(() => { if (n) toast(`${n.summary} — see the notice for details`, 5000); }, [n]);
  if (!n) return null;
  return (
    <div className="ac-banner ac-open-notes" role="status" data-testid="open-notes-banner">
      <span>
        ⚠️ <strong>{n.summary}</strong>: damaged values in the file were replaced by the defaults.
        <details><summary>Show the corrections</summary><ul>{n.notes.map((x, i) => <li key={i}>{x}</li>)}</ul></details>
      </span>
      <button type="button" onClick={dismissOpenNotes} aria-label="Dismiss the list of corrections made when opening the file">Dismiss</button>
    </div>
  );
}
